import { NextRequest, NextResponse } from 'next/server'
import { monitorarInteracoes } from '@/lib/monitorInteracoes'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Alvo do Vercel Cron (ver vercel.json) — roda 2x ao dia.
// Detecta respostas novas de leads, gera sugestão de réplica e notifica o SDR.
// Nunca envia mensagem para o lead: a sugestão fica aguardando revisão humana.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
  }

  try {
    const resultado = await monitorarInteracoes()
    console.log('[monitorInteracoes] resultado:', JSON.stringify({
      chatsVarridos: resultado.chatsVarridos,
      novasInteracoes: resultado.novasInteracoes,
      sugestoesGeradas: resultado.sugestoesGeradas,
      falhas: resultado.falhas,
    }))
    // detalhes carregam texto de conversa — ficam fora da resposta HTTP.
    const { detalhes: _detalhes, ...resumo } = resultado
    return NextResponse.json(resumo, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha no monitor de interações:', msg)
    return NextResponse.json({ error: `Falha no monitor: ${msg}` }, { status: 500 })
  }
}
