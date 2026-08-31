import { NextRequest, NextResponse } from 'next/server'
import { monitorarInteracoes } from '@/lib/monitorInteracoes'
import { checarAceites } from '@/lib/checarAceites'
import { checarConexaoUnipile } from '@/lib/checarConexao'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Alvo do workflow do GitHub Actions (.github/workflows/monitorar-interacoes.yml),
// que roda 2x ao dia — o plano Hobby da Vercel só permite cron diário.
// Detecta aceites de convite e respostas novas de leads, gera sugestão de
// réplica e notifica o SDR por WhatsApp.
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
    // 0) a conta esta viva? Com a sessao caida, varrer conversas so devolve
    // 401 e o silencio parece dia fraco -- foi o que custou tres dias em 27/08.
    const conexao = await checarConexaoUnipile()
    console.log('[checarConexao] ' + conexao.estado + ': ' + conexao.detalhe)
    if (conexao.estado !== 'OK') {
      return NextResponse.json(
        { conexao, aviso: 'Monitoramento nao rodou: a conta precisa ser reconectada.' },
        { status: 200 }
      )
    }

    // 1) aceites de convite — libera o T2 e avisa o SDR
    const aceites = await checarAceites()
    console.log('[checarAceites] resultado:', JSON.stringify(aceites))

    // 2) respostas novas — gera a sugestão de réplica
    const resultado = await monitorarInteracoes()
    console.log('[monitorInteracoes] resultado:', JSON.stringify({
      chatsVarridos: resultado.chatsVarridos,
      novasInteracoes: resultado.novasInteracoes,
      respondidasPorFora: resultado.respondidasPorFora.reduce((s, x) => s + x.quantas, 0),
      sugestoesGeradas: resultado.sugestoesGeradas,
      falhas: resultado.falhas,
    }))
    // detalhes carregam texto de conversa — ficam fora da resposta HTTP.
    const { detalhes: _detalhes, ...resumo } = resultado
    return NextResponse.json({ conexao: conexao.estado, aceites, interacoes: resumo }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha no monitor de interações:', msg)
    return NextResponse.json({ error: `Falha no monitor: ${msg}` }, { status: 500 })
  }
}
