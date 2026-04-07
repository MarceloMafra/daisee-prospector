import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  try {

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    // Filters
    const cadenciaId = searchParams.get('cadenciaId')
    const status = searchParams.get('status')

    const where: any = {}

    if (cadenciaId) {
      where.cadenciaId = cadenciaId
    }

    if (status) {
      where.status = status
    }

    // Get total count
    const total = await prisma.touch.count({ where })

    // Get touches
    const touches = await prisma.touch.findMany({
      where,
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
      orderBy: { scheduledFor: 'asc' },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        touches,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch touches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch touches' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { cadenciaId, leadId, sequence, type, content, subject, channel, message, scheduledFor } = body

    if (!cadenciaId || !leadId || !sequence || !type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: cadenciaId, leadId, sequence, type, content' },
        { status: 400 }
      )
    }

    // Verify cadencia exists
    const cadencia = await prisma.cadencia.findUnique({
      where: { id: cadenciaId },
    })

    if (!cadencia) {
      return NextResponse.json(
        { error: 'Cadencia not found' },
        { status: 404 }
      )
    }

    // Validate type
    const validTypes = ['LINKEDIN_250', 'LINKEDIN_500', 'EMAIL_T3', 'EMAIL_T4', 'EMAIL_T5']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create touch
    const touch = await prisma.touch.create({
      data: {
        cadenciaId,
        leadId,
        sequence,
        type,
        content,
        subject,
        channel: channel || 'EMAIL',
        message,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: 'AGENDADO',
      },
      select: {
        id: true,
        cadenciaId: true,
        leadId: true,
        sequence: true,
        type: true,
        channel: true,
        content: true,
        subject: true,
        status: true,
        scheduledFor: true,
        createdAt: true,
      },
    })

    return NextResponse.json(touch, { status: 201 })
  } catch (error) {
    console.error('Failed to create touch:', error)
    return NextResponse.json(
      { error: 'Failed to create touch' },
      { status: 500 }
    )
  }
}
