import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCadencia } from '@/lib/claude'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { tone = 'CONSULTIVO' } = body

    // Validate tone
    const validTones = ['CONSULTIVO', 'DIRETO', 'CRIATIVO']
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Invalid tone. Must be one of: ${validTones.join(', ')}` },
        { status: 400 }
      )
    }

    // Get cadencia with associated lead
    const cadencia = await prisma.cadencia.findUnique({
      where: { id: params.id },
      include: { lead: true },
    })

    if (!cadencia) {
      return NextResponse.json(
        { error: 'Cadencia not found' },
        { status: 404 }
      )
    }

    if (!cadencia.lead) {
      return NextResponse.json(
        { error: 'Lead not found for this cadencia' },
        { status: 404 }
      )
    }

    // Delete existing touches if any
    await prisma.touch.deleteMany({
      where: { cadenciaId: params.id },
    })

    // Generate cadencia using Claude
    const generatedTouches = await generateCadencia(
      {
        name: cadencia.lead.name,
        email: cadencia.lead.email,
        company: cadencia.lead.company,
        seniority: cadencia.lead.seniority,
        daiseeScore: cadencia.lead.daiseeScore,
        profileText: cadencia.lead.profileText,
        companyContext: cadencia.lead.companyContext,
      },
      tone as 'CONSULTIVO' | 'DIRETO' | 'CRIATIVO'
    )

    // Create touches in database
    const createdTouches = await Promise.all(
      generatedTouches.map((touch) =>
        prisma.touch.create({
          data: {
            cadenciaId: params.id,
            leadId: cadencia.leadId,
            sequence: touch.sequence,
            type: touch.type,
            channel: touch.channel,
            content: touch.content,
            subject: touch.subject,
            status: 'AGENDADO',
          },
        })
      )
    )

    // Update cadencia status to PRONTO
    await prisma.cadencia.update({
      where: { id: params.id },
      data: {
        status: 'PRONTO',
        tone: tone as 'CONSULTIVO' | 'DIRETO' | 'CRIATIVO',
      },
    })

    return NextResponse.json(
      {
        cadenciaId: params.id,
        tone,
        touches: createdTouches.map((t: typeof createdTouches[0]) => ({
          id: t.id,
          sequence: t.sequence,
          type: t.type,
          channel: t.channel,
          content: t.content,
          subject: t.subject,
          status: t.status,
        })),
        message: `Generated ${createdTouches.length} touches successfully`,
      },
      { status: 201 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Failed to generate cadencia:', msg)
    return NextResponse.json(
      { error: `Failed to generate cadencia: ${msg}` },
      { status: 500 }
    )
  }
}
