import { NextResponse } from 'next/server'
import { monitorarInteracoes } from '@/lib/monitorInteracoes'
import { checarAceites } from '@/lib/checarAceites'
import { checarConexaoUnipile } from '@/lib/checarConexao'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Roda a varredura sob demanda, a partir do botão da caixa de entrada.
//
// A mesma varredura existe em /api/cron/monitorar-interacoes, mas aquela rota é
// pública para o agendador e se autentica por CRON_SECRET — que o navegador não
// tem. Esta fica sob o middleware de sessão, como o resto do painel.
//
// Existe porque atualizar a página só relia o banco: quem estivesse esperando
// uma resposta chegar via cron (08:00 e 17:00 de Brasília, pelo GitHub Actions)
// não tinha como pedir a varredura agora, e o F5 parecia não funcionar.
//
// Não envia nada ao lead: gera a sugestão de réplica e para aí.
export async function POST() {
  try {
    // Com a sessão da Unipile caída, varrer conversas só devolve 401 e o
    // silêncio parece dia fraco — foi o que custou três dias em 27/08.
    const conexao = await checarConexaoUnipile()
    if (conexao.estado !== 'OK') {
      return NextResponse.json(
        {
          ok: false,
          conexao: conexao.estado,
          mensagem: `A conta do LinkedIn precisa ser reconectada (${conexao.detalhe}). A varredura não rodou.`,
        },
        { status: 200 }
      )
    }

    const aceites = await checarAceites()
    const resultado = await monitorarInteracoes()

    // detalhes carregam o texto das conversas — ficam fora da resposta HTTP.
    const { detalhes: _detalhes, ...resumo } = resultado

    const partes: string[] = []
    if (aceites.novosAceites.length > 0) partes.push(`${aceites.novosAceites.length} aceite(s) novo(s)`)
    if (resumo.novasInteracoes > 0) partes.push(`${resumo.novasInteracoes} resposta(s) nova(s)`)
    const fechadas = resumo.respondidasPorFora.reduce((s, x) => s + x.quantas, 0)
    if (fechadas > 0) partes.push(`${fechadas} pendência(s) fechada(s) por resposta manual`)
    if (resumo.falhas.length > 0) partes.push(`${resumo.falhas.length} falha(s)`)

    return NextResponse.json(
      {
        ok: true,
        conexao: conexao.estado,
        aceites,
        interacoes: resumo,
        mensagem: partes.length
          ? `${resumo.chatsVarridos} conversas varridas — ${partes.join(', ')}.`
          : `${resumo.chatsVarridos} conversas varridas. Nenhuma novidade.`,
      },
      { status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha na varredura sob demanda:', msg)
    return NextResponse.json({ ok: false, error: `Falha na varredura: ${msg}` }, { status: 500 })
  }
}
