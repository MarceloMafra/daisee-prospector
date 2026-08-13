// Motor do scheduler de envio automático de touches (T1-T5).
// Chamado pelo cron (app/api/cron/process-touches) e pelo trigger manual
// (app/api/prospecting/scheduler/run) — a mesma lógica serve para os dois.
import { prisma } from '@/lib/prisma'
import {
  sendConnectionRequest,
  sendLinkedInDM,
  checkConnectionAccepted,
  sendEmail,
} from '@/lib/unipile'
import { validateMessage } from '@/lib/compliance'
import type { Touch, Lead } from '@prisma/client'

interface RateLimits {
  invitesPerDay: number
  messagesPerDay: number
  emailsPerDay: number
  maxActionsPerRun: number
}

function getRateLimits(): RateLimits {
  return {
    invitesPerDay: Number(process.env.LINKEDIN_INVITES_PER_DAY || 10),
    messagesPerDay: Number(process.env.LINKEDIN_MESSAGES_PER_DAY || 50),
    emailsPerDay: Number(process.env.EMAILS_PER_DAY || 100),
    maxActionsPerRun: Number(process.env.MAX_ACTIONS_PER_RUN || 5),
  }
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const SENT_STATUSES = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] as const

type TouchWithLead = Touch & { lead: Lead }

interface ActionResult {
  touchId: string
  leadId: string
  sequence: number
  type: string
  outcome: 'enviado' | 'pulado' | 'falhou' | 'simulado'
  reason?: string
}

export interface SchedulerResult {
  dryRun: boolean
  processedAt: string
  quotas: {
    invites: { used: number; limit: number }
    messages: { used: number; limit: number }
    emails: { used: number; limit: number }
  }
  candidates: number
  actions: ActionResult[]
}

async function countSentSince(typeIn: string[], since: Date) {
  return prisma.touch.count({
    where: {
      type: { in: typeIn as never[] },
      status: { in: SENT_STATUSES as unknown as never[] },
      sentAt: { gte: since },
    },
  })
}

async function logAudit(leadId: string, action: string, details: string) {
  await prisma.auditLog.create({ data: { leadId, action, details } })
}

async function markFailed(touch: Touch, reason: string) {
  await prisma.touch.update({
    where: { id: touch.id },
    data: { status: 'FALHOU', errorMessage: reason },
  })
  await logAudit(touch.leadId, 'TOUCH_FALHOU', `T${touch.sequence} (${touch.type}) falhou: ${reason}`)
}

async function markSent(touch: Touch, providerRef?: string) {
  await prisma.touch.update({
    where: { id: touch.id },
    data: { status: 'ENVIADO', sentAt: new Date(), providerRef },
  })
  await logAudit(touch.leadId, 'TOUCH_ENVIADO', `T${touch.sequence} (${touch.type}) enviado com sucesso.`)
}

export class SchedulerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'SchedulerError'
    this.status = status
  }
}

async function processTouch(touch: TouchWithLead, dryRun: boolean): Promise<ActionResult> {
  const base = { touchId: touch.id, leadId: touch.leadId, sequence: touch.sequence, type: touch.type }

  const validation = validateMessage(touch.content, touch.type)
  if (!validation.isValid) {
    const reason = `Reprovado na validação de copy (score ${validation.score}/100): ${validation.summary}`
    if (!dryRun) await markFailed(touch, reason)
    return { ...base, outcome: dryRun ? 'simulado' : 'falhou', reason }
  }

  if (touch.type === 'LINKEDIN_250') {
    if (!touch.lead.linkedinProviderId) {
      const reason = 'Lead sem linkedinProviderId (perfil não enriquecido) — não é possível enviar convite.'
      if (!dryRun) await markFailed(touch, reason)
      return { ...base, outcome: dryRun ? 'simulado' : 'falhou', reason }
    }
    if (dryRun) return { ...base, outcome: 'simulado', reason: 'Enviaria convite de conexão no LinkedIn.' }
    try {
      const result = await sendConnectionRequest({
        providerId: touch.lead.linkedinProviderId,
        message: touch.content,
        email: touch.lead.email ?? undefined,
      })
      await markSent(touch, result.invitation_id)
      return { ...base, outcome: 'enviado' }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await markFailed(touch, reason)
      return { ...base, outcome: 'falhou', reason }
    }
  }

  if (touch.type === 'LINKEDIN_500') {
    if (!touch.lead.linkedinProviderId) {
      const reason = 'Lead sem linkedinProviderId — não é possível enviar DM.'
      if (!dryRun) await markFailed(touch, reason)
      return { ...base, outcome: dryRun ? 'simulado' : 'falhou', reason }
    }

    let connected = Boolean(touch.lead.linkedinConnectedAt)
    if (!connected) {
      try {
        connected = await checkConnectionAccepted(touch.lead.linkedinProviderId)
        if (connected && !dryRun) {
          await prisma.lead.update({
            where: { id: touch.leadId },
            data: { linkedinConnectedAt: new Date() },
          })
        }
      } catch (error) {
        const reason = `Falha ao checar aceite de conexão: ${error instanceof Error ? error.message : String(error)}`
        return { ...base, outcome: 'pulado', reason }
      }
    }

    if (!connected) {
      return { ...base, outcome: 'pulado', reason: 'Convite ainda não aceito — DM só é enviada após conexão de 1º grau.' }
    }

    if (dryRun) return { ...base, outcome: 'simulado', reason: 'Enviaria DM no LinkedIn (lead já conectado).' }
    try {
      const result = await sendLinkedInDM({ providerId: touch.lead.linkedinProviderId, text: touch.content })
      await markSent(touch, result.chat_id)
      return { ...base, outcome: 'enviado' }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      await markFailed(touch, reason)
      return { ...base, outcome: 'falhou', reason }
    }
  }

  // EMAIL_T3 / EMAIL_T4 / EMAIL_T5
  if (!touch.lead.email) {
    const reason = 'Lead sem e-mail cadastrado — não é possível enviar touch de e-mail.'
    if (!dryRun) await markFailed(touch, reason)
    return { ...base, outcome: dryRun ? 'simulado' : 'falhou', reason }
  }

  if (dryRun) return { ...base, outcome: 'simulado', reason: `Enviaria e-mail para ${touch.lead.email}.` }
  try {
    const result = await sendEmail({
      to: touch.lead.email,
      subject: touch.subject || undefined,
      body: touch.content,
    })
    await markSent(touch, result.tracking_id)
    return { ...base, outcome: 'enviado' }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    await markFailed(touch, reason)
    return { ...base, outcome: 'falhou', reason }
  }
}

// Disparo manual de um único touch (botão "Enviar agora" na UI, individual ou em lote
// a partir da tela de Leads). Sempre real (nunca dry-run) — o clique já é a confirmação
// do usuário — mas respeita o mesmo limite de ritmo (rate limit) do scheduler automático,
// pra não estourar a cota diária da conta do LinkedIn só porque foi manual.
export async function sendTouchNow(touchId: string): Promise<ActionResult> {
  const touch = (await prisma.touch.findUnique({
    where: { id: touchId },
    include: { lead: true },
  })) as TouchWithLead | null

  if (!touch) {
    throw new SchedulerError('Touch não encontrado.', 404)
  }
  if (SENT_STATUSES.includes(touch.status as typeof SENT_STATUSES[number])) {
    throw new SchedulerError('Este touch já foi enviado.', 409)
  }

  const limits = getRateLimits()
  const now = new Date()
  const quotaKey = touch.type === 'LINKEDIN_250' ? 'LINKEDIN_250' : touch.type === 'LINKEDIN_500' ? 'LINKEDIN_500' : 'EMAIL'

  const [used, limit] =
    quotaKey === 'LINKEDIN_250'
      ? [await countSentSince(['LINKEDIN_250'], startOfDay(now)), limits.invitesPerDay]
      : quotaKey === 'LINKEDIN_500'
        ? [await countSentSince(['LINKEDIN_500'], startOfDay(now)), limits.messagesPerDay]
        : [await countSentSince(['EMAIL_T3', 'EMAIL_T4', 'EMAIL_T5'], startOfDay(now)), limits.emailsPerDay]

  if (used >= limit) {
    throw new SchedulerError(
      `Limite de ritmo atingido para este canal (${used}/${limit}). Tente novamente mais tarde.`,
      429
    )
  }

  return processTouch(touch, false)
}

export async function processScheduledTouches({ dryRun }: { dryRun: boolean }): Promise<SchedulerResult> {
  const now = new Date()
  const limits = getRateLimits()

  const [invitesUsed, messagesUsed, emailsUsed] = await Promise.all([
    countSentSince(['LINKEDIN_250'], startOfDay(now)),
    countSentSince(['LINKEDIN_500'], startOfDay(now)),
    countSentSince(['EMAIL_T3', 'EMAIL_T4', 'EMAIL_T5'], startOfDay(now)),
  ])

  const quotas = {
    invites: { used: invitesUsed, limit: limits.invitesPerDay },
    messages: { used: messagesUsed, limit: limits.messagesPerDay },
    emails: { used: emailsUsed, limit: limits.emailsPerDay },
  }

  const candidates = (await prisma.touch.findMany({
    where: {
      status: 'AGENDADO',
      OR: [{ scheduledFor: { lte: now } }, { scheduledFor: null }],
      lead: { excludedFromAutomation: false },
    },
    include: { lead: true },
    orderBy: { scheduledFor: 'asc' },
  })) as TouchWithLead[]

  const shuffled = shuffle(candidates)

  const remaining = {
    LINKEDIN_250: Math.max(0, quotas.invites.limit - quotas.invites.used),
    LINKEDIN_500: Math.max(0, quotas.messages.limit - quotas.messages.used),
    EMAIL: Math.max(0, quotas.emails.limit - quotas.emails.used),
  }

  const actions: ActionResult[] = []
  let actionsThisRun = 0

  for (const touch of shuffled) {
    if (actionsThisRun >= limits.maxActionsPerRun) break

    const quotaKey = touch.type === 'LINKEDIN_250' ? 'LINKEDIN_250' : touch.type === 'LINKEDIN_500' ? 'LINKEDIN_500' : 'EMAIL'
    if (remaining[quotaKey] <= 0) {
      actions.push({
        touchId: touch.id,
        leadId: touch.leadId,
        sequence: touch.sequence,
        type: touch.type,
        outcome: 'pulado',
        reason: 'Limite de ritmo (rate limit) atingido para este canal — tentará novamente na próxima execução.',
      })
      continue
    }

    const result = await processTouch(touch, dryRun)
    actions.push(result)

    if (result.outcome === 'enviado' || (dryRun && result.outcome === 'simulado' && result.reason?.startsWith('Enviaria'))) {
      remaining[quotaKey] -= 1
      actionsThisRun += 1
    }
  }

  return {
    dryRun,
    processedAt: now.toISOString(),
    quotas,
    candidates: candidates.length,
    actions,
  }
}
