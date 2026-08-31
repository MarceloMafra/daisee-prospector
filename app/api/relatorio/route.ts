import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Tudo que o relatório mostra sai daqui, apurado no servidor. A página só
// desenha — assim o número na tela é sempre o do banco naquele instante, sem
// job de atualização no meio do caminho.

const MS_DIA = 86_400_000
const FUSO_BR = 3 * 3_600_000

const diaBR = (d: Date) => new Date(d.getTime() - FUSO_BR).toISOString().slice(0, 10)
const diasAtras = (d: Date) => Math.floor((Date.now() - d.getTime()) / MS_DIA)
const horasAtras = (d: Date) => Math.round((Date.now() - d.getTime()) / 3_600_000)

export async function GET() {
  try {
    const [leads, touches, interacoesNovas] = await Promise.all([
      prisma.lead.findMany({
        include: {
          cadencia: { include: { touches: true } },
          interacoes: { orderBy: { recebidaEm: 'desc' } },
        },
      }),
      prisma.touch.findMany({ select: { type: true, status: true, sentAt: true, sequence: true, leadId: true } }),
      prisma.interacao.findMany({
        where: { status: 'NOVA' },
        include: { lead: { select: { name: true, company: true, daiseeScore: true } } },
        orderBy: { recebidaEm: 'asc' },
      }),
    ])

    const t1Enviados = touches.filter((t) => t.type === 'LINKEDIN_250' && t.sentAt)
    const t2Enviados = touches.filter((t) => t.type === 'LINKEDIN_500' && t.sentAt)
    const emailsEnviados = touches.filter((t) => t.type.startsWith('EMAIL') && t.sentAt)
    const aceitos = leads.filter((l) => l.linkedinConnectedAt)
    const responderam = leads.filter((l) => l.cadencia?.touches.some((t) => t.status === 'RESPONDIDO'))
    const ativos = leads.filter((l) => !l.excludedFromAutomation)

    // Ritmo dos últimos 17 dias, em dias de Brasília.
    const porDia = new Map<string, { dia: string; enviados: number; aceites: number }>()
    const hoje = new Date()
    for (let i = 16; i >= 0; i--) {
      const d = diaBR(new Date(hoje.getTime() - i * MS_DIA))
      porDia.set(d, { dia: d, enviados: 0, aceites: 0 })
    }
    for (const t of t1Enviados) {
      const alvo = porDia.get(diaBR(t.sentAt!))
      if (alvo) alvo.enviados++
    }
    for (const l of aceitos) {
      const alvo = porDia.get(diaBR(l.linkedinConnectedAt!))
      if (alvo) alvo.aceites++
    }

    // Convites sem resposta, agrupados por quanto tempo esperam.
    const aguardando = leads.filter(
      (l) => !l.linkedinConnectedAt && l.cadencia?.touches.some((t) => t.type === 'LINKEDIN_250' && t.sentAt)
    )
    const faixas = { '0-2': 0, '3-5': 0, '6-9': 0, '10+': 0 }
    for (const l of aguardando) {
      const t = l.cadencia!.touches.find((x) => x.type === 'LINKEDIN_250' && x.sentAt)!
      const d = diasAtras(t.sentAt!)
      faixas[d <= 2 ? '0-2' : d <= 5 ? '3-5' : d <= 9 ? '6-9' : '10+']++
    }

    const media = (arr: typeof leads) =>
      arr.length ? Number((arr.reduce((s, l) => s + l.daiseeScore, 0) / arr.length).toFixed(1)) : 0

    // Aceitou mas o T2 ainda não saiu. Quem já respondeu entra em outra conta:
    // a cadência está pausada de propósito, não é follow-up esquecido.
    const aceitesSemT2 = aceitos.filter(
      (l) => !l.excludedFromAutomation && l.cadencia?.touches.some((t) => t.sequence === 2 && t.status === 'AGENDADO')
    )
    const t2Prontos = aceitesSemT2.filter((l) => !l.cadencia!.touches.some((t) => t.status === 'RESPONDIDO'))
    const emConversa = aceitesSemT2.filter((l) => l.cadencia!.touches.some((t) => t.status === 'RESPONDIDO'))

    const conversas = responderam
      .map((l) => {
        const ultima = l.interacoes[0]
        const temNova = l.interacoes.some((i) => i.status === 'NOVA')
        const situacao =
          l.status === 'PERDIDO'
            ? 'perdido'
            : l.status === 'EM_PROGRESSO' || l.status === 'QUALIFICADO'
              ? 'em progresso'
              : temNova
                ? 'sua vez'
                : ultima
                  ? 'aguardando lead'
                  : 'aguardando lead'
        return {
          nome: l.name,
          empresa: l.company,
          score: l.daiseeScore,
          diasUltimoContato: ultima ? diasAtras(ultima.recebidaEm) : null,
          situacao,
        }
      })
      .sort((a, b) => {
        const peso = (s: string) => (s === 'sua vez' ? 0 : s === 'em progresso' ? 1 : s === 'perdido' ? 3 : 2)
        return peso(a.situacao) - peso(b.situacao) || (a.diasUltimoContato ?? 99) - (b.diasUltimoContato ?? 99)
      })

    const ultimoEnvio = t1Enviados.reduce<Date | null>(
      (m, t) => (!m || t.sentAt! > m ? t.sentAt! : m),
      null
    )
    const enviadosHoje = t1Enviados.filter((t) => diaBR(t.sentAt!) === diaBR(new Date())).length

    return NextResponse.json({
      geradoEm: new Date().toISOString(),
      funil: {
        base: leads.length,
        convites: t1Enviados.length,
        aceites: aceitos.length,
        taxaAceite: t1Enviados.length ? Math.round((aceitos.length / t1Enviados.length) * 100) : 0,
        dms: t2Enviados.length,
        emails: emailsEnviados.length,
        respostas: responderam.length,
        taxaResposta: t1Enviados.length ? Math.round((responderam.length / t1Enviados.length) * 100) : 0,
        qualificados: leads.filter((l) => ['QUALIFICADO', 'EM_PROGRESSO'].includes(l.status)).length,
        filaT1: touches.filter((t) => t.type === 'LINKEDIN_250' && t.status === 'AGENDADO').length,
        semCadencia: ativos.filter((l) => !l.cadencia).length,
        falhas: touches.filter((t) => t.status === 'FALHOU').length,
      },
      ritmo: Array.from(porDia.values()),
      quota: {
        enviadosHoje,
        limite: Number(process.env.LINKEDIN_INVITES_PER_DAY || 10),
        ultimoEnvio: ultimoEnvio?.toISOString() ?? null,
        diasSemEnvio: ultimoEnvio ? diasAtras(ultimoEnvio) : null,
      },
      aguardandoAceite: { total: aguardando.length, faixas },
      score: {
        base: media(leads),
        aceitos: media(aceitos),
        responderam: media(responderam),
      },
      pendencias: {
        aguardandoResposta: interacoesNovas.map((i) => ({
          nome: i.lead.name,
          empresa: i.lead.company,
          score: i.lead.daiseeScore,
          horas: horasAtras(i.recebidaEm),
          mensagem: i.mensagem.slice(0, 140),
        })),
        t2Prontos: t2Prontos
          .map((l) => ({ nome: l.name, empresa: l.company, score: l.daiseeScore }))
          .sort((a, b) => b.score - a.score),
        emConversaSemT2: emConversa.length,
      },
      conversas,
    })
  } catch (error) {
    console.error('Falha ao montar o relatório:', error)
    return NextResponse.json({ error: 'Falha ao montar o relatório.' }, { status: 500 })
  }
}
