import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const touch = await prisma.touch.update({
      where: { id: params.id },
      data: {
        channel: body.channel ?? undefined,
        message: body.message ?? undefined,
        status: body.status ?? undefined,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      },
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
