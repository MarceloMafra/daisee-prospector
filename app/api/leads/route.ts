import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    // Filters
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const minScore = parseFloat(searchParams.get('minScore') || '0')
    const maxScore = parseFloat(searchParams.get('maxScore') || '100')

    // Build where clause
    const where: any = {
      daiseeScore: {
        gte: minScore,
        lte: maxScore,
      },
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    // Get total count
    const total = await prisma.lead.count({ where })

    // Get leads
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        seniority: true,
        daiseeScore: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json(
      {
        leads,
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
    console.error('Failed to fetch leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const { name, email, company, seniority } = body

    if (!name || !email || !company || !seniority) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, company, seniority' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check for duplicates
    const existing = await prisma.lead.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Lead with this email already exists' },
        { status: 409 }
      )
    }

    // Import DAISEE calculation
    const { calculateDAISEEScore } = await import('@/lib/daisee-score')

    // Calculate score
    const scoreResult = calculateDAISEEScore({
      seniority,
      companySize: body.companySize || 'MEDIA',
      segmentMatch: body.segmentMatch || 50,
    })

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company,
        seniority,
        daiseeScore: scoreResult.score,
        decisionPower: scoreResult.decisionPower,
        companySize: body.companySize || 'MEDIA',
        segmentMatch: scoreResult.segmentMatch,
        status: 'PROSPECTANDO',
        priority: scoreResult.score >= 80 ? 'ALTA' : scoreResult.score >= 50 ? 'MEDIA' : 'BAIXA',
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        daiseeScore: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('Failed to create lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
