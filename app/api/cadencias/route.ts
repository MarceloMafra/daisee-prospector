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
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId')

    // Build where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (leadId) {
      where.leadId = leadId
    }

    // Get total count
    const total = await prisma.cadencia.count({ where })

    // Get cadencias
    const cadencias = await prisma.cadencia.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        leadId: true,
        status: true,
        touches: {
          select: { id: true, status: true },
        },
        generatedAt: true,
        updatedAt: true,
      },
      orderBy: { generatedAt: 'desc' },
      skip,
      take: limit,
    })

    const cadenciasWithTouchCount = cadencias.map((c: typeof cadencias[0]) => ({
      ...c,
      touchCount: c.touches.length,
      completedTouches: c.touches.filter(
        (t: typeof c.touches[0]) => t.status === 'ENTREGUE' || t.status === 'RESPONDIDO'
      ).length,
      touches: undefined,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        cadencias: cadenciasWithTouchCount,
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
    console.error('Failed to fetch cadencias:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cadencias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, description, leadId } = body

    if (!name || !leadId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, leadId' },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Create cadencia
    const cadencia = await prisma.cadencia.create({
      data: {
        name,
        description,
        leadId,
        status: 'DRAFT',
      },
      select: {
        id: true,
        name: true,
        description: true,
        leadId: true,
        status: true,
        generatedAt: true,
      },
    })

    return NextResponse.json(cadencia, { status: 201 })
  } catch (error) {
    console.error('Failed to create cadencia:', error)
    return NextResponse.json(
      { error: 'Failed to create cadencia' },
      { status: 500 }
    )
  }
}
