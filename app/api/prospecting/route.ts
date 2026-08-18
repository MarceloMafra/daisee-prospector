import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        cadencia: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        daiseeScore: true,
        status: true,
        linkedinConnectedAt: true,
        cadencia: {
          select: {
            id: true,
            tone: true,
            status: true,
            touches: {
              orderBy: { sequence: 'asc' },
              select: {
                id: true,
                sequence: true,
                type: true,
                channel: true,
                status: true,
                sentAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ leads }, { status: 200 })
  } catch (error) {
    console.error('Failed to fetch prospecting data:', error)
    return NextResponse.json({ error: 'Failed to fetch prospecting data' }, { status: 500 })
  }
}
