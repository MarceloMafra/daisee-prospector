import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDAISEEScore, getScorePriority } from '@/lib/daisee-score'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const leads = await prisma.lead.findMany({
      select: { id: true, seniority: true, companySize: true, segmentMatch: true },
    })

    let updated = 0
    for (const lead of leads) {
      const result = calculateDAISEEScore({
        seniority: lead.seniority,
        companySize: lead.companySize as any,
        segmentMatch: lead.segmentMatch,
      })
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          daiseeScore: result.score,
          decisionPower: result.decisionPower,
          priority: getScorePriority(result.score),
        },
      })
      updated++
    }

    return NextResponse.json({ updated }, { status: 200 })
  } catch (error) {
    console.error('Failed to recalculate scores:', error)
    return NextResponse.json({ error: 'Failed to recalculate' }, { status: 500 })
  }
}
