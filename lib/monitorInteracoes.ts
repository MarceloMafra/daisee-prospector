// Monitor de interações: varre as conversas do LinkedIn, detecta respostas novas
// de leads, gera uma sugestão de réplica com a IA e registra tudo para revisão.
//
// Nada é enviado ao lead por aqui — a sugestão sempre passa por uma pessoa.
// Rodado pelo cron (app/api/cron/monitorar-interacoes) e pelo script local
// scripts/monitorar.ts.
import { prisma } from '@/lib/prisma'
import { listChats, listChatMessages, isUnipileConfigured } from '@/lib/unipile'
import { sugerirRespostaParaLead } from '@/lib/claude'
import { buscarDisponibilidade } from '@/lib/agenda'
import { notifySdr } from '@/lib/notifySdr'

export interface MonitorResult {
  chatsVarridos: number
  novasInteracoes: number
  sugestoesGeradas: number
  respondidasPorFora: Array<{ lead: string; quantas: number }> // pendências fechadas por resposta manual
  falhas: Array<{ lead: string; motivo: string }>
  detalhes: Array<{
    lead: string
    company: string
    mensagem: string
    temperatura: string
    leitura: string
    sugestao: string
  }>
}

interface MonitorOptions {
  dryRun?: boolean // não grava nem notifica; só relata o que faria
  maxChats?: number
  maxSugestoes?: number // teto de chamadas à IA por execução
}

export async function monitorarInteracoes(opts: MonitorOptions = {}): Promise<MonitorResult> {
  const { dryRun = false, maxChats = 40, maxSugestoes = 15 } = opts
  const result: MonitorResult = {
    chatsVarridos: 0,
    novasInteracoes: 0,
    sugestoesGeradas: 0,
    respondidasPorFora: [],
    falhas: [],
    detalhes: [],
  }

  if (!isUnipileConfigured()) {
    result.falhas.push({ lead: '—', motivo: 'Unipile não configurada' })
    return result
  }

  const chats = await listChats(maxChats)
  result.chatsVarridos = chats.length

  // Uma consulta à agenda por rodada: todos os leads desta varredura recebem os
  // mesmos horários livres, e a sugestão já sai com dia e hora que existem.
  const agenda = await buscarDisponibilidade()
  if (agenda.fonte === 'falhou') {
    result.falhas.push({ lead: '—', motivo: `agenda não respondeu: ${agenda.erro}` })
  }

  // Só interessam conversas com alguém que é lead nosso.
  const providerIds = chats.map((c) => c.attendee_provider_id).filter(Boolean) as string[]
  const leads = await prisma.lead.findMany({
    where: { linkedinProviderId: { in: providerIds } },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
  })
  const leadPorProvider = new Map(leads.map((l) => [l.linkedinProviderId!, l]))

  for (const chat of chats) {
    const lead = chat.attendee_provider_id ? leadPorProvider.get(chat.attendee_provider_id) : undefined
    if (!lead) continue
    if (result.sugestoesGeradas >= maxSugestoes) break

    let mensagens
    try {
      mensagens = await listChatMessages(chat.id, 25)
    } catch (err) {
      result.falhas.push({ lead: lead.name, motivo: `falha ao ler conversa: ${msgDe(err)}` })
      continue
    }

    // A API devolve da mais recente para a mais antiga.
    const ordenadas = [...mensagens].reverse()
    const ultima = ordenadas[ordenadas.length - 1]
    if (!ultima) continue

    // Última palavra é nossa: não há pendência aberta. Mas o Marcelo responde
    // direto pelo LinkedIn, fora do painel — e nesse caminho ninguém baixava a
    // Interacao de NOVA. Rafaela e Agostinho seguiam como "precisa de ação" no
    // relatório em 31/08 mesmo já respondidos. Fechar aqui é o único ponto do
    // sistema que enxerga a resposta enviada por fora.
    if (ultima.is_sender === 1) {
      const respondidoEm = ultima.timestamp ? new Date(ultima.timestamp) : new Date()
      const pendentes = await prisma.interacao.count({
        where: { leadId: lead.id, status: 'NOVA', recebidaEm: { lt: respondidoEm } },
      })
      if (pendentes === 0) continue
      if (!dryRun) {
        await prisma.interacao.updateMany({
          where: { leadId: lead.id, status: 'NOVA', recebidaEm: { lt: respondidoEm } },
          data: { status: 'RESPONDIDA' },
        })
      }
      result.respondidasPorFora.push({ lead: lead.name, quantas: pendentes })
      continue
    }

    const texto = (ultima.text || '').trim()
    if (!texto) continue

    // providerRef é único no banco: se já processamos esta mensagem, pula.
    const jaExiste = await prisma.interacao.findUnique({ where: { providerRef: ultima.id } })
    if (jaExiste) continue

    result.novasInteracoes++

    const historico = ordenadas.slice(-10).map((m) => ({
      de: (m.is_sender === 1 ? 'NOS' : 'LEAD') as 'NOS' | 'LEAD',
      texto: (m.text || '').slice(0, 600),
    }))
    const touchesEnviados = (lead.cadencia?.touches || [])
      .filter((t) => t.status !== 'AGENDADO')
      .map((t) => ({ sequence: t.sequence, type: t.type, content: t.content }))

    let sugestao
    try {
      sugestao = await sugerirRespostaParaLead({
        lead: {
          name: lead.name,
          email: lead.email,
          company: lead.company,
          seniority: lead.seniority,
          daiseeScore: lead.daiseeScore,
          profileText: lead.profileText,
          companyContext: lead.companyContext,
          notes: lead.notes,
        },
        touchesEnviados,
        historicoConversa: historico,
        mensagemNova: texto,
        recebidaEm: ultima.timestamp ? new Date(ultima.timestamp) : null,
        horariosLivres: agenda.horarios,
      })
      result.sugestoesGeradas++
    } catch (err) {
      result.falhas.push({ lead: lead.name, motivo: `falha ao gerar sugestão: ${msgDe(err)}` })
      continue
    }

    result.detalhes.push({
      lead: lead.name,
      company: lead.company,
      mensagem: texto,
      temperatura: sugestao.temperatura,
      leitura: sugestao.leitura,
      sugestao: sugestao.sugestao,
    })

    if (dryRun) continue

    // Entre o findUnique la em cima e este create roda a chamada de IA, que leva
    // segundos. Duas execucoes ao mesmo tempo (o cron agendado e uma rodada
    // manual, por exemplo) passam as duas pela checagem e colidem aqui. Sem este
    // catch, a colisao derruba a rodada inteira e os leads seguintes nem sao
    // olhados -- foi o que aconteceu em producao em 31/08.
    try {
      await prisma.interacao.create({
        data: {
          leadId: lead.id,
          canal: 'LINKEDIN',
          mensagem: texto,
          recebidaEm: ultima.timestamp ? new Date(ultima.timestamp) : new Date(),
          providerRef: ultima.id,
          sugestao: `[${sugestao.temperatura}] ${sugestao.leitura}\n\n${sugestao.sugestao}`,
          status: 'NOVA',
        },
      })
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if (codigo === 'P2002') {
        // Outra execucao gravou esta mesma mensagem primeiro: nada a fazer.
        result.novasInteracoes--
        continue
      }
      throw e
    }

    await notifySdr({
      leadId: lead.id,
      leadName: lead.name,
      company: lead.company,
      event: 'RESPOSTA_LINKEDIN',
      detail: `Ele(a) escreveu: "${texto.slice(0, 220)}"\n\nLeitura: ${sugestao.leitura}\n\nSUGESTÃO DE RESPOSTA:\n${sugestao.sugestao}`,
      linkedinUrl: lead.linkedinUrl,
    })
  }

  return result
}

function msgDe(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
