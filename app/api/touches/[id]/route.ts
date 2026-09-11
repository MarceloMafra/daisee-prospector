import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const touch = await prisma.touch.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        cadenciaId: true,
        channel: true,
        message: true,
        status: true,
        scheduledFor: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!touch) {
      return NextResponse.json(
        { error: 'Touch not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(touch, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch touch:', error)
    return NextResponse.json(
      { error: 'Failed to fetch touch' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const existing = await prisma.touch.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Touch not found' },
        { status: 404 }
      )
    }

    // Validate channel if provided
    if (body.channel) {
      const validChannels = ['EMAIL', 'LINKEDIN', 'WHATSAPP', 'PHONE']
      if (!validChannels.includes(body.channel)) {
        return NextResponse.json(
          { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Marcar como enviado à mão tem que carimbar a data, senão o touch fica com
    // status de enviado e sentAt nulo — e é o sentAt que o status-campanha e a
    // fila de T2 leem para dizer quando a mensagem saiu.
    const JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO']
    const carimbaSaida = body.status && JA_SAIU.includes(body.status) && !existing.sentAt
    // O caminho inverso também: devolver para AGENDADO limpa a data, senão
    // sobra o carimbo de um envio que foi desfeito.
    const limpaSaida = body.status === 'AGENDADO' && existing.sentAt

    const touch = await prisma.touch.update({
      where: { id: params.id },
      data: {
        channel: body.channel ?? undefined,
        message: body.message ?? undefined,
        status: body.status ?? undefined,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
        sentAt: carimbaSaida ? new Date() : limpaSaida ? null : undefined,
      },
      select: {
        id: true,
        cadenciaId: true,
        channel: true,
        message: true,
        status: true,
        sentAt: true,
        scheduledFor: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(touch, { status: 200 })
  } catch (error) {
    console.error('Failed to update touch:', error)
    return NextResponse.json(
      { error: 'Failed to update touch' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const touch = await prisma.touch.findUnique({
      where: { id: params.id },
    })

    if (!touch) {
      return NextResponse.json(
        { error: 'Touch not found' },
        { status: 404 }
      )
    }

    await prisma.touch.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Touch deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete touch:', error)
    return NextResponse.json(
      { error: 'Failed to delete touch' },
      { status: 500 }
    )
  }
}
