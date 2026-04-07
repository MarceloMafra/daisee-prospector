import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cadencia = await prisma.cadencia.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        leadId: true,
        status: true,
        touches: {
          select: {
            id: true,
            channel: true,
            message: true,
            status: true,
            scheduledFor: true,
            createdAt: true,
          },
        },
        generatedAt: true,
        updatedAt: true,
      },
    })

    if (!cadencia) {
      return NextResponse.json(
        { error: 'Cadencia not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(cadencia, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch cadencia:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cadencia' },
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

    const existing = await prisma.cadencia.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Cadencia not found' },
        { status: 404 }
      )
    }

    const cadencia = await prisma.cadencia.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        status: body.status ?? undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        leadId: true,
        status: true,
        generatedAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(cadencia, { status: 200 })
  } catch (error) {
    console.error('Failed to update cadencia:', error)
    return NextResponse.json(
      { error: 'Failed to update cadencia' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cadencia = await prisma.cadencia.findUnique({
      where: { id: params.id },
    })

    if (!cadencia) {
      return NextResponse.json(
        { error: 'Cadencia not found' },
        { status: 404 }
      )
    }

    // Delete associated touches first
    await prisma.touch.deleteMany({
      where: { cadenciaId: params.id },
    })

    await prisma.cadencia.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Cadencia deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete cadencia:', error)
    return NextResponse.json(
      { error: 'Failed to delete cadencia' },
      { status: 500 }
    )
  }
}
