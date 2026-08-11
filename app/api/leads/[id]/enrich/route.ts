import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UnipileError, isUnipileConfigured } from '@/lib/unipile'
import { EnrichmentError, enrichLeadFromLinkedIn } from '@/lib/enrichment'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isUnipileConfigured()) {
      return NextResponse.json(
        { error: 'Integração Unipile não configurada (UNIPILE_BASE_URL, UNIPILE_API_KEY, UNIPILE_ACCOUNT_ID).' },
        { status: 503 }
      )
    }

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    let body: { linkedinUrl?: string; dryRun?: boolean; regenerateCompanyContext?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // corpo vazio é permitido — usa o linkedinUrl já salvo no lead
    }

    const result = await enrichLeadFromLinkedIn(lead, body)

    if (result.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        identifier: result.identifier,
        textLength: result.profileText.length,
        preview: result.profileText.substring(0, 400),
        fieldsToUpdate: result.fieldsToUpdate,
        skippedFields: result.skippedFields,
      })
    }

    return NextResponse.json({
      success: true,
      textLength: result.profileText.length,
      preview: result.profileText.substring(0, 200) + '...',
      updatedFields: result.updatedFields,
      skippedFields: result.skippedFields,
      message:
        result.updatedFields.length > 0
          ? `Perfil enriquecido via LinkedIn. Campos atualizados: ${result.updatedFields.join(', ')}.`
          : 'Perfil enriquecido via LinkedIn. Dados cadastrais já estavam atualizados.',
    })
  } catch (error) {
    if (error instanceof EnrichmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    if (error instanceof UnipileError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Perfil não encontrado no LinkedIn. Confira a URL salva no lead.' },
          { status: 404 }
        )
      }
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json(
          { error: 'Credenciais da Unipile inválidas ou expiradas. Atualize UNIPILE_API_KEY.' },
          { status: 502 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Limite de requisições da Unipile atingido. Tente novamente em alguns minutos.' },
          { status: 429 }
        )
      }
      console.error('Erro Unipile ao enriquecer lead:', error)
      return NextResponse.json(
        { error: 'Falha na comunicação com a Unipile. Tente novamente.' },
        { status: 502 }
      )
    }

    console.error('Erro ao enriquecer lead via LinkedIn:', error)
    return NextResponse.json(
      { error: 'Falha ao enriquecer o lead. Tente novamente.' },
      { status: 500 }
    )
  }
}
