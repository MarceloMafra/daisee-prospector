import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureCadenciaGenerated } from '@/lib/cadenciaGeneration'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Segunda etapa da indicação: gera a cadência do lead recém-cadastrado. Fica
// separada do cadastro porque enriquecer e gerar juntos passa do tempo de uma
// função na Vercel. Só gera para quem passou pela conferência do perfil.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const leadId = String(body?.leadId ?? '')
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })

    if (lead.excludedFromAutomation) {
      return NextResponse.json(
        { error: 'O lead está fora da automação (bloqueado na conferência do perfil). Revise a ficha antes.' },
        { status: 409 }
      )
    }
    if (!lead.profileText) {
      return NextResponse.json(
        { error: 'O perfil ainda não foi enriquecido. Enriqueça pela ficha antes de gerar a cadência.' },
        { status: 409 }
      )
    }

    const touches = await ensureCadenciaGenerated(lead.id, 'CONSULTIVO')
    return NextResponse.json({ gerada: touches !== null, touches: touches?.length ?? 0 }, { status: 200 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Falha ao gerar cadência da indicação:', msg)
    return NextResponse.json({ error: `Falha ao gerar a cadência: ${msg}` }, { status: 500 })
  }
}
