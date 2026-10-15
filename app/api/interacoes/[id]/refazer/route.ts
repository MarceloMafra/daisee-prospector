import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { violacoesEmTexto } from '@/lib/auditoriaClaims'
import { corrigirComCritica } from '@/lib/refazerCopy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recebe o texto reprovado e devolve a versão corrigida pela IA. NÃO envia nada:
// o SDR revisa o que voltou e continua sendo quem clica em "Enviar agora", que
// reaudita no servidor. Rota separada do envio justamente para que refazer nunca
// possa disparar mensagem por acidente.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const texto = typeof body?.texto === 'string' ? body.texto.trim() : ''

    if (!texto) {
      return NextResponse.json({ error: 'Não há texto para refazer.' }, { status: 400 })
    }

    const interacao = await prisma.interacao.findUnique({
      where: { id: params.id },
      select: { id: true, leadId: true },
    })
    if (!interacao) {
      return NextResponse.json({ error: 'Interação não encontrada.' }, { status: 404 })
    }

    const violacoes = violacoesEmTexto(texto)
    if (!violacoes.length) {
      return NextResponse.json({ texto, violacoesRestantes: [], mudou: false }, { status: 200 })
    }

    const refeito = await corrigirComCritica(texto, violacoes)

    if (!refeito.mudou) {
      return NextResponse.json(
        {
          error: 'A IA não conseguiu corrigir sem piorar o texto. A correção aqui é manual.',
          texto,
          violacoesRestantes: violacoes,
        },
        { status: 422 }
      )
    }

    await prisma.auditLog.create({
      data: {
        leadId: interacao.leadId,
        action: 'COPY_REFEITA',
        details: `Refeita com a crítica (${violacoes.map((v) => v.regra).join(', ')}): ${texto.length} → ${refeito.texto.length} caracteres. Restaram ${refeito.violacoesRestantes.length} violação(ões).`,
      },
    })

    return NextResponse.json(
      { texto: refeito.texto, violacoesRestantes: refeito.violacoesRestantes, mudou: true },
      { status: 200 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao refazer a copy:', msg)
    return NextResponse.json({ error: `Falha ao refazer: ${msg}` }, { status: 500 })
  }
}
