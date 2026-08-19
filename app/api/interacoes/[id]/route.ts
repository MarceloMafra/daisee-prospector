import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUS_VALIDOS = ['NOVA', 'RESPONDIDA', 'ARQUIVADA'] as const

// Marca uma interação como respondida ou arquivada (ação manual do SDR no painel).
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const status = body?.status

    if (!STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}` },
        { status: 400 }
      )
    }

    const interacao = await prisma.interacao.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json({ interacao }, { status: 200 })
  } catch (error) {
    console.error('Falha ao atualizar interação:', error)
    return NextResponse.json({ error: 'Falha ao atualizar a interação' }, { status: 500 })
  }
}
