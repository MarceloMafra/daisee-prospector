// Lógica de geração de cadência (5 touches via Claude + agendamento).
// Extraído de app/api/cadencias/[id]/generate/route.ts para ser reaproveitado
// também pelo pipeline automático (lib/autoPipeline.ts) sem duplicar código.
import { prisma } from '@/lib/prisma'
import { generateCadencia } from '@/lib/claude'
import { lerIndicacao } from '@/lib/indicacao'
import type { Touch } from '@prisma/client'

export type CadenciaTone = 'CONSULTIVO' | 'DIRETO' | 'CRIATIVO'

export class CadenciaGenerationError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'CadenciaGenerationError'
    this.status = status
  }
}

// Espaçamento (dias corridos a partir de hoje) de cada touch da cadência.
const TOUCH_OFFSET_DAYS: Record<number, number> = { 1: 0, 2: 4, 3: 7, 4: 11, 5: 15 }

// Um touch nesses estados é histórico: alguém do outro lado já recebeu aquele
// texto. AGENDADO e FALHOU não saíram, então podem ser reescritos.
const STATUS_JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] as const

// Gera os 5 touches de uma cadência, reescrevendo apenas o que ainda não saiu.
//
// Antes, a regeneração fazia deleteMany de TODOS os touches e recriava os cinco
// como AGENDADO. Em 31/08 isso apagou o T1 já enviado ao maior score da base
// (Thiago Amorim Dantas, 95) — para o banco ele virou um lead nunca contactado,
// e o send-batch o colocou em 1º lugar da fila: uma segunda primeira-mensagem,
// com texto diferente, para quem já tinha recebido a primeira. O mesmo valia
// para quem já respondeu: regenerar apagava o RESPONDIDO e devolvia o lead à
// automação no meio de uma conversa humana.
export async function generateTouchesForCadencia(
  cadenciaId: string,
  tone: CadenciaTone = 'CONSULTIVO'
): Promise<Touch[]> {
  const cadencia = await prisma.cadencia.findUnique({
    where: { id: cadenciaId },
    include: { lead: true },
  })

  if (!cadencia) {
    throw new CadenciaGenerationError('Cadencia not found', 404)
  }
  if (!cadencia.lead) {
    throw new CadenciaGenerationError('Lead not found for this cadencia', 404)
  }

  // Os que já saíram entram no prompt como contexto, para o texto novo não
  // repetir nem reapresentar a empresa a quem já leu o T1.
  const jaSairam = await prisma.touch.findMany({
    where: { cadenciaId, status: { in: [...STATUS_JA_SAIU] } },
    orderBy: { sequence: 'asc' },
  })

  const generatedTouches = await generateCadencia(
    {
      name: cadencia.lead.name,
      email: cadencia.lead.email,
      company: cadencia.lead.company,
      seniority: cadencia.lead.seniority,
      daiseeScore: cadencia.lead.daiseeScore,
      profileText: cadencia.lead.profileText,
      companyContext: cadencia.lead.companyContext,
      // Lida das notas, e não passada por quem chama: a regeneração de uma
      // cadência de lead indicado também precisa saber quem indicou.
      indicacao: lerIndicacao(cadencia.lead.notes),
    },
    tone,
    jaSairam.map((t) => ({
      sequence: t.sequence,
      type: t.type,
      subject: t.subject,
      content: t.content,
    }))
  )

  // Com um touch já enviado, o relógio da cadência começou no dia em que ele
  // saiu — reancorar em hoje atrasaria todo o resto. Sem nenhum envio, hoje é
  // a âncora, que é o comportamento da geração inicial.
  const ancora = jaSairam[0]?.sentAt ?? new Date()
  const agora = new Date()
  const preservados = new Set(jaSairam.map((t) => t.sequence))

  // A limpeza dos touches antigos ficava ANTES da chamada à IA, que leva
  // dezenas de segundos. Dois cliques no botão de gerar entravam assim:
  // ambos apagavam (nada, porque nenhum tinha gravado ainda), ambos chamavam a
  // IA e ambos gravavam — 10 touches, cada mensagem em duplicata. Apagar e
  // gravar na mesma transação faz a última geração vencer, sem sobreposição.
  const createdTouches = await prisma.$transaction(async (tx) => {
    await tx.touch.deleteMany({
      where: { cadenciaId, status: { notIn: [...STATUS_JA_SAIU] } },
    })

    return Promise.all(
      generatedTouches
        .filter((touch) => !preservados.has(touch.sequence))
        .map((touch) => {
          const offsetDays = TOUCH_OFFSET_DAYS[touch.sequence] ?? 0
          const scheduledFor = new Date(ancora)
          scheduledFor.setDate(scheduledFor.getDate() + offsetDays)

          return tx.touch.create({
            data: {
              cadenciaId,
              leadId: cadencia.leadId,
              sequence: touch.sequence,
              type: touch.type,
              channel: touch.channel,
              content: touch.content,
              subject: touch.subject,
              status: 'AGENDADO',
              // Uma cadência antiga regenerada teria touches vencidos, que o
              // processador dispararia todos de uma vez.
              scheduledFor: scheduledFor < agora ? agora : scheduledFor,
            },
          })
        })
    )
  })

  await prisma.cadencia.update({
    where: { id: cadenciaId },
    data: { status: 'PRONTO', tone },
  })

  // Devolve a cadência inteira, não só o que foi reescrito: o painel lista o
  // que vem daqui, e mostrar 4 touches depois de regenerar uma cadência de 5
  // pareceria que o T1 sumiu — exatamente o susto que este bug causou.
  return [...jaSairam, ...createdTouches].sort((a, b) => a.sequence - b.sequence)
}

// Usado pelo pipeline automático: cria a Cadencia (DRAFT) se o lead ainda não
// tiver uma, depois gera os touches. Idempotente — se já existir cadência com
// touches, não gera de novo (retorna null).
export async function ensureCadenciaGenerated(
  leadId: string,
  tone: CadenciaTone = 'CONSULTIVO'
): Promise<Touch[] | null> {
  let cadencia = await prisma.cadencia.findUnique({ where: { leadId } })

  if (cadencia) {
    const existingTouches = await prisma.touch.count({ where: { cadenciaId: cadencia.id } })
    if (existingTouches > 0) return null
  } else {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      throw new CadenciaGenerationError('Lead not found', 404)
    }
    cadencia = await prisma.cadencia.create({
      data: { leadId, name: `Cadência — ${lead.name}`, status: 'DRAFT' },
    })
  }

  return generateTouchesForCadencia(cadencia.id, tone)
}

// Regenera SOMENTE os touches ainda não enviados de uma cadência, preservando
// os que já saíram (sentAt, providerRef, status). Usado para limpar cadências
// antigas geradas antes das regras de honestidade entrarem no prompt: reescrever
// frase a frase não resolvia, porque o pitch de fundo descrevia produto errado.
//
// O que já foi enviado entra no prompt como contexto, para o texto novo não
// repetir nem reapresentar a empresa a quem já leu o T1.
export async function regenerarTouchesPendentes(
  cadenciaId: string,
  tone: CadenciaTone = 'CONSULTIVO'
): Promise<{ atualizados: Touch[]; preservados: number; semGerado: number[] }> {
  const cadencia = await prisma.cadencia.findUnique({
    where: { id: cadenciaId },
    include: { lead: true, touches: { orderBy: { sequence: 'asc' } } },
  })

  if (!cadencia) throw new CadenciaGenerationError('Cadencia not found', 404)
  if (!cadencia.lead) throw new CadenciaGenerationError('Lead not found for this cadencia', 404)

  const pendentes = cadencia.touches.filter((t) => t.status === 'AGENDADO')
  const enviados = cadencia.touches.filter((t) => t.status !== 'AGENDADO')

  if (pendentes.length === 0) {
    return { atualizados: [], preservados: enviados.length, semGerado: [] }
  }

  const generatedTouches = await generateCadencia(
    {
      name: cadencia.lead.name,
      email: cadencia.lead.email,
      company: cadencia.lead.company,
      seniority: cadencia.lead.seniority,
      daiseeScore: cadencia.lead.daiseeScore,
      profileText: cadencia.lead.profileText,
      companyContext: cadencia.lead.companyContext,
      // Lida das notas, e não passada por quem chama: a regeneração de uma
      // cadência de lead indicado também precisa saber quem indicou.
      indicacao: lerIndicacao(cadencia.lead.notes),
    },
    tone,
    enviados.map((t) => ({
      sequence: t.sequence,
      type: t.type,
      subject: t.subject,
      content: t.content,
    }))
  )

  const atualizados: Touch[] = []
  const semGerado: number[] = []

  for (const pendente of pendentes) {
    const novo = generatedTouches.find((g) => g.sequence === pendente.sequence)
    if (!novo) {
      // Sem substituto para essa sequência, o texto antigo continuaria no ar —
      // melhor devolver o número e deixar o chamador decidir do que sobrescrever.
      semGerado.push(pendente.sequence)
      continue
    }

    // Só content/subject mudam: id, scheduledFor, status e canal seguem intactos.
    const touch = await prisma.touch.update({
      where: { id: pendente.id },
      data: { content: novo.content, subject: novo.subject },
    })
    atualizados.push(touch)
  }

  return { atualizados, preservados: enviados.length, semGerado }
}
