import { NextRequest, NextResponse } from 'next/server'
import { validateMessage, getComplianceRules } from '@/lib/compliance'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, regulation, leadId } = body

    if (!message || !regulation) {
      return NextResponse.json(
        { error: 'Message and regulation are required' },
        { status: 400 }
      )
    }

    // Validate
    const result = validateMessage(message, regulation)

    // Log to database if leadId provided
    if (leadId) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
        })

        if (lead) {
          await prisma.complianceLog.create({
            data: {
              leadId,
              regulation: regulation as any,
              message,
              isValid: result.isValid,
              issues: result.violations.map((v) => v.message),
            },
          })
        }
      } catch (dbError) {
        console.error('Failed to log compliance check:', dbError)
        // Don't fail the response if logging fails
      }
    }

    // Format response
    return NextResponse.json(
      {
        isValid: result.isValid,
        regulation: result.regulation,
        score: result.score,
        violations: result.violations.map((v) => ({
          type: v.type,
          severity: v.severity,
          message: v.message,
        })),
        summary: result.summary,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to validate compliance:', error)
    return NextResponse.json(
      { error: 'Failed to validate compliance' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const rules = getComplianceRules()

    return NextResponse.json(
      {
        regulations: rules.map((rule) => ({
          regulation: rule.regulation,
          description: rule.description,
          forbiddenKeywords: rule.forbiddenKeywords,
          requiredStatements: rule.requiredStatements,
        })),
        total: rules.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to fetch compliance rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch compliance rules' },
      { status: 500 }
    )
  }
}
