import { NextRequest, NextResponse } from 'next/server'
import { CadenciaGenerationError, CadenciaTone, generateTouchesForCadencia } from '@/lib/cadenciaGeneration'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { tone = 'CONSULTIVO' } = body

    const validTones = ['CONSULTIVO', 'DIRETO', 'CRIATIVO']
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Invalid tone. Must be one of: ${validTones.join(', ')}` },
        { status: 400 }
      )
    }

    const createdTouches = await generateTouchesForCadencia(params.id, tone as CadenciaTone)

    return NextResponse.json(
      {
        cadenciaId: params.id,
        tone,
        touches: createdTouches.map((t) => ({
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
    if (error instanceof CadenciaGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Failed to generate cadencia:', msg)
    return NextResponse.json(
      { error: `Failed to generate cadencia: ${msg}` },
      { status: 500 }
    )
  }
}
