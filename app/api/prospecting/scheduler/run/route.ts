import { NextRequest, NextResponse } from 'next/server'
import { processScheduledTouches } from '@/lib/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Trigger manual do scheduler — usado para testar o fluxo ponta a ponta sem
// esperar o cron. Só executa em modo real (dryRun=false) se AUTO_SEND_ENABLED=true
// E o chamador pedir explicitamente; caso contrário força dry-run por segurança.
export async function POST(request: NextRequest) {
  let body: { dryRun?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    // corpo vazio é aceitável — usa defaults
  }

  const autoSendEnabled = process.env.AUTO_SEND_ENABLED === 'true'
  const requestedRealRun = body.dryRun === false
  const dryRun = !(autoSendEnabled && requestedRealRun)

  try {
    const result = await processScheduledTouches({ dryRun })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha no trigger manual do scheduler:', msg)
    return NextResponse.json({ error: `Falha no scheduler: ${msg}` }, { status: 500 })
  }
}
