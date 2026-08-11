import { NextRequest, NextResponse } from 'next/server'
import { processScheduledTouches } from '@/lib/scheduler'
import { processAutoPipeline } from '@/lib/autoPipeline'

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

  const pipelineDryRun = process.env.AUTO_PIPELINE_ENABLED !== 'true'
  const sendDryRun = process.env.AUTO_SEND_ENABLED !== 'true'

  try {
    const pipeline = await processAutoPipeline({ dryRun: pipelineDryRun })
    console.log('[autoPipeline] resultado:', JSON.stringify(pipeline))

    const scheduler = await processScheduledTouches({ dryRun: sendDryRun })
    console.log('[scheduler] resultado:', JSON.stringify(scheduler))

    return NextResponse.json({ pipeline, scheduler }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha no cron de automação:', msg)
    return NextResponse.json({ error: `Falha no cron: ${msg}` }, { status: 500 })
  }
}
