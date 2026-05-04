import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        cadencia: {
          include: {
            touches: {
              orderBy: { sequence: 'asc' },
            },
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(lead, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
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

    // Check if lead exists
    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // If email is being updated, check for duplicates
    if (body.email && body.email !== existing.email) {
      const duplicate = await prisma.lead.findUnique({
        where: { email: body.email },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'Lead with this email already exists' },
          { status: 409 }
        )
      }
    }

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }

    // Update lead
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        email: body.email ?? undefined,
        company: body.company ?? undefined,
        seniority: body.seniority ?? undefined,
        daiseeScore: body.daiseeScore ?? undefined,
        decisionPower: body.decisionPower ?? undefined,
        companySize: body.companySize ?? undefined,
        segmentMatch: body.segmentMatch ?? undefined,
        status: body.status ?? undefined,
        priority: body.priority ?? undefined,
        linkedinUrl: body.linkedinUrl ?? undefined,
        phone: body.phone !== undefined ? (body.phone || null) : undefined,
        notes: body.notes !== undefined ? (body.notes || null) : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        seniority: true,
        daiseeScore: true,
        decisionPower: true,
        companySize: true,
        segmentMatch: true,
        status: true,
        priority: true,
        phone: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(lead, { status: 200 })
  } catch (error) {
    console.error('Failed to update lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    await prisma.lead.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: 'Lead deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
