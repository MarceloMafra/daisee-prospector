import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Total leads
    const totalLeads = await prisma.lead.count()

    // Hot prospects (ALTA priority = score >= 80)
    const hotProspects = await prisma.lead.count({
      where: { priority: 'ALTA' },
    })

    // Pending cadencias (cadencias with status DRAFT or PRONTO)
    const pendingCadencias = await prisma.cadencia.count({
      where: {
        status: {
          in: ['DRAFT', 'PRONTO'],
        },
      },
    })

    // Completed touches (touches with status ENTREGUE or RESPONDIDO)
    const completedTouches = await prisma.touch.count({
      where: {
        status: {
          in: ['ENTREGUE', 'RESPONDIDO'],
        },
      },
    })

    // Calculate average score
    const leadStats = await prisma.lead.aggregate({
      _avg: {
        daiseeScore: true,
      },
      _min: {
        daiseeScore: true,
      },
      _max: {
        daiseeScore: true,
      },
    })

    const averageScore = Math.round((leadStats._avg.daiseeScore || 0) * 10) / 10

    // Leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      _count: true,
    })

    const statusBreakdown = leadsByStatus.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item.status] = item._count
        return acc
      },
      {}
    )

    return NextResponse.json(
      {
        totalLeads,
        hotProspects,
        pendingCadencias,
        completedTouches,
        averageScore,
        statusBreakdown,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
