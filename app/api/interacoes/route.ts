import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InteracaoStatus, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUS_VALIDOS = ['NOVA', 'RESPONDIDA', 'ARQUIVADA'] as const

// Lista as respostas de leads para a caixa de entrada do painel.
//
// ?status=NOVA        — só as de um status (default: todas)
// ?contagem=1         — devolve apenas o total por status, sem o corpo das interações
//   (usado pelo badge do menu lateral, que não precisa carregar mensagem nem sugestão)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const apenasContagem = searchParams.get('contagem') === '1'

    if (status && !STATUS_VALIDOS.includes(status as (typeof STATUS_VALIDOS)[number])) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      )
    }

    const where: Prisma.InteracaoWhereInput = status
      ? { status: status as InteracaoStatus }
      : {}

    const porStatus = await prisma.interacao.groupBy({ by: ['status'], _count: true })
    const contagem = { NOVA: 0, RESPONDIDA: 0, ARQUIVADA: 0 }
    for (const linha of porStatus) contagem[linha.status] = linha._count

    if (apenasContagem) {
      return NextResponse.json({ contagem }, { status: 200 })
    }

    const interacoes = await prisma.interacao.findMany({
      where,
      orderBy: { recebidaEm: 'desc' },
      include: {
        lead: {
          // status e linkedinProviderId vão junto: o primeiro abastece a caixa que
          // pergunta a fase do pipeline ao arquivar, o segundo diz se dá para
          // responder pelo painel ou só pela conversa.
          select: {
            id: true,
            name: true,
            company: true,
            seniority: true,
            linkedinUrl: true,
            status: true,
            linkedinProviderId: true,
          },
        },
      },
    })

    return NextResponse.json({ interacoes, contagem }, { status: 200 })
  } catch (error) {
    console.error('Falha ao listar interações:', error)
    return NextResponse.json({ error: 'Falha ao listar as interações' }, { status: 500 })
  }
}
