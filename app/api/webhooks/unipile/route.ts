import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifySdr } from '@/lib/notifySdr'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Recebe webhooks da Unipile (respostas de DM no LinkedIn e e-mails recebidos)
// e marca o touch correspondente do lead como RESPONDIDO.

function extractString(...candidates: Array<unknown>): string | null {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function markLeadAsReplied(params: {
  leadId: string
  channel: 'LINKEDIN' | 'EMAIL'
  detail: string
}) {
  const touch = await prisma.touch.findFirst({
    where: {
      leadId: params.leadId,
      channel: params.channel,
      status: { in: ['ENVIADO', 'ENTREGUE'] },
    },
    orderBy: { sequence: 'desc' },
  })

  if (touch) {
    await prisma.touch.update({
      where: { id: touch.id },
      data: { status: 'RESPONDIDO' },
    })
  }

  await prisma.auditLog.create({
    data: {
      leadId: params.leadId,
      action: 'LEAD_RESPONDEU',
      details: `${params.detail}${touch ? ` Touch T${touch.sequence} marcado como RESPONDIDO.` : ' Nenhum touch enviado encontrado para atualizar.'}`,
    },
  })

  return touch
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.UNIPILE_WEBHOOK_SECRET
    if (secret) {
      const received = request.headers.get('x-webhook-secret')
      if (received !== secret) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const event = extractString(payload?.event, payload?.type) || ''

    // ── Resposta no LinkedIn (DM) ──────────────────────────────────────────
    if (event.includes('message')) {
      const senderProviderId = extractString(
        payload?.sender?.attendee_provider_id,
        payload?.sender?.provider_id,
        payload?.sender_attendee_provider_id
      )

      if (!senderProviderId) {
        return NextResponse.json({ ok: true, matched: false, reason: 'sem sender' })
      }

      const lead = await prisma.lead.findFirst({
        where: { linkedinProviderId: senderProviderId },
      })

      if (!lead) {
        // Mensagem de alguém que não é lead (ou lead ainda não enriquecido)
        return NextResponse.json({ ok: true, matched: false })
      }

      const senderName = extractString(payload?.sender?.attendee_name) || lead.name
      const preview = (extractString(payload?.message) || '').substring(0, 200)
      const touch = await markLeadAsReplied({
        leadId: lead.id,
        channel: 'LINKEDIN',
        detail: `Resposta recebida no LinkedIn de ${senderName}.${preview ? ` Mensagem: "${preview}"` : ''}`,
      })

      await notifySdr({
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        event: 'RESPOSTA_LINKEDIN',
        detail: preview ? `Mensagem: "${preview}"` : null,
        linkedinUrl: lead.linkedinUrl,
      })

      return NextResponse.json({ ok: true, matched: true, leadId: lead.id, touchUpdated: Boolean(touch) })
    }

    // ── Resposta por e-mail ────────────────────────────────────────────────
    if (event.includes('mail')) {
      const fromEmail = extractString(
        payload?.from_attendee?.identifier,
        payload?.from?.identifier,
        payload?.from?.email,
        payload?.from_attendee?.email
      )?.toLowerCase()

      if (!fromEmail) {
        return NextResponse.json({ ok: true, matched: false, reason: 'sem remetente' })
      }

      const lead = await prisma.lead.findUnique({ where: { email: fromEmail } })
      if (!lead) {
        return NextResponse.json({ ok: true, matched: false })
      }

      const subject = extractString(payload?.subject) || '(sem assunto)'
      const touch = await markLeadAsReplied({
        leadId: lead.id,
        channel: 'EMAIL',
        detail: `Resposta recebida por e-mail de ${fromEmail}. Assunto: "${subject}".`,
      })

      await notifySdr({
        leadId: lead.id,
        leadName: lead.name,
        company: lead.company,
        event: 'RESPOSTA_EMAIL',
        detail: `Assunto: "${subject}"`,
        linkedinUrl: lead.linkedinUrl,
      })

      return NextResponse.json({ ok: true, matched: true, leadId: lead.id, touchUpdated: Boolean(touch) })
    }

    // Evento não tratado (status de conta etc.) — confirma recebimento
    return NextResponse.json({ ok: true, matched: false, event })
  } catch (error) {
    console.error('Erro no webhook Unipile:', error)
    // Retorna 200 para a Unipile não desativar o webhook por falhas pontuais
    return NextResponse.json({ ok: false, error: 'erro interno' })
  }
}
