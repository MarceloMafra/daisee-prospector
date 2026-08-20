// Notificação de WhatsApp pro SDR (João Gabriel) via API externa do Masterbot —
// mesma rota que a Marina (MASTERBOT_CDT) usa pra avisar vendedor no handoff.
// Sem as envs configuradas → no-op logado; nunca lança — falha de notificação
// não pode derrubar o webhook nem um lote de envio.
//
// Envs necessárias (local + Vercel):
//   MASTERBOT_NOTIFICA_UUID   — uuid da ApiConfig externa no Masterbot
//   MASTERBOT_NOTIFICA_TOKEN  — bearer token da mesma ApiConfig
//   SDR_WHATSAPP_NUMBER       — destinatários com DDI, separados por vírgula
//                               (ex.: 5543999998888,5543991112222)
//   SDR_NAME                  — opcional, default "João"
import { prisma } from '@/lib/prisma'

export type SdrEvent = 'CONEXAO_ACEITA' | 'RESPOSTA_LINKEDIN' | 'RESPOSTA_EMAIL'

interface NotifySdrParams {
  leadId: string
  leadName: string
  company?: string | null
  event: SdrEvent
  detail?: string | null
  linkedinUrl?: string | null
}

const EVENT_CONFIG: Record<SdrEvent, { titulo: string; acao: string }> = {
  CONEXAO_ACEITA: {
    titulo: '🤝 CONEXÃO ACEITA',
    acao: 'A DM de follow-up (T2) está pronta no painel — revisar e enviar enquanto o aceite está quente.',
  },
  RESPOSTA_LINKEDIN: {
    titulo: '🔥 RESPONDEU NO LINKEDIN',
    acao: 'Ler e responder pessoalmente o quanto antes — a cadência automática deste lead fica pausada.',
  },
  RESPOSTA_EMAIL: {
    titulo: '📧 RESPONDEU POR E-MAIL',
    acao: 'Ler e responder o e-mail pessoalmente o quanto antes — a cadência automática deste lead fica pausada.',
  },
}

const PAINEL_URL = process.env.APP_URL || 'https://daisee-prospector.vercel.app'

function buildMessage(params: NotifySdrParams): string {
  const cfg = EVENT_CONFIG[params.event]
  const sdrName = process.env.SDR_NAME || 'João'
  const lines = [
    `${cfg.titulo} — ${params.leadName}${params.company ? ` (${params.company})` : ''}`,
  ]
  if (params.detail) lines.push(params.detail)
  lines.push('', `👉 ${sdrName}: ${cfg.acao}`)
  if (params.linkedinUrl) lines.push(`Perfil: ${params.linkedinUrl}`)
  lines.push(`Painel: ${PAINEL_URL}/dashboard/prospecting`)
  return lines.join('\n')
}

export async function notifySdr(params: NotifySdrParams): Promise<{ ok: boolean; live: boolean }> {
  const uuid = process.env.MASTERBOT_NOTIFICA_UUID || ''
  const token = process.env.MASTERBOT_NOTIFICA_TOKEN || ''
  const destinatarios = (process.env.SDR_WHATSAPP_NUMBER || '')
    .split(',')
    .map((n) => n.replace(/\D/g, '')) // aceita "+55 43 99999-9999" e afins
    .filter(Boolean)

  if (!uuid || !token || destinatarios.length === 0) {
    console.log(
      `[notifySdr] envs ausentes (MASTERBOT_NOTIFICA_UUID/TOKEN, SDR_WHATSAPP_NUMBER) — notificação "${params.event}" de ${params.leadName} suprimida`
    )
    return { ok: true, live: false }
  }

  const body = buildMessage(params)
  const falhas: string[] = []

  for (const numero of destinatarios) {
    try {
      const res = await fetch(`https://api.masterbot.io/v2/api/external/${uuid}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: numero, body }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[notifySdr] falha ao notificar ${numero} sobre ${params.leadName}: ${msg}`)
      falhas.push(`${numero}: ${msg}`)
    }
  }

  const enviados = destinatarios.length - falhas.length
  if (falhas.length === 0) {
    await safeAudit(
      params.leadId,
      `Notificação WhatsApp enviada (${params.event}) para ${enviados} destinatário(s).`
    )
    return { ok: true, live: true }
  }

  await safeAudit(
    params.leadId,
    `Notificação WhatsApp (${params.event}): ${enviados} enviada(s), ${falhas.length} falha(s) — ${falhas.join(' | ')}`
  )
  return { ok: enviados > 0, live: true }
}

async function safeAudit(leadId: string, details: string) {
  try {
    await prisma.auditLog.create({ data: { leadId, action: 'SDR_NOTIFICADO', details } })
  } catch {
    // auditoria é melhor-esforço — nunca propaga erro pro fluxo principal
  }
}
