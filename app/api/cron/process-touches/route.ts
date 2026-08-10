import { NextRequest, NextResponse } from 'next/server'
import { processScheduledTouches } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Alvo do Vercel Cron (ver vercel.json). A Vercel injeta automaticamente
// "Authorization: Bearer <CRON_SECRET>" nas chamadas que ela mesma dispara.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  const dryRun = process.env.AUTO_SEND_ENABLED !== 'true'

  try {
    const result = await processScheduledTouches({ dryRun })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha no scheduler de touches:', msg)
    return NextResponse.json({ error: `Falha no scheduler: ${msg}` }, { status: 500 })
  }
}
