import { NextRequest, NextResponse } from 'next/server'
import { sendTouchNow, SchedulerError } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Disparo manual e imediato de um touch — usado pelo botão "Enviar agora" (individual
// na página do lead, ou em lote na tela de Leads). O clique é a confirmação; aqui só
// aplicamos o limite de ritmo, sem dry-run.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await sendTouchNow(params.id)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof SchedulerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao enviar touch manualmente:', msg)
    return NextResponse.json({ error: `Falha ao enviar: ${msg}` }, { status: 500 })
  }
}
