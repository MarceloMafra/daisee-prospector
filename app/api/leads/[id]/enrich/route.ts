import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  UnipileError,
  buildProfileText,
  extractLinkedInIdentifier,
  getCurrentPosition,
  getFullName,
  getLinkedInProfile,
  isUnipileConfigured,
} from '@/lib/unipile'

export const dynamic = 'force-dynamic'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanTextValue(value?: string | null, maxLength = 255) {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null
}

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

    let body: { linkedinUrl?: string; dryRun?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // corpo vazio é permitido — usa o linkedinUrl já salvo no lead
    }

    const identifier = extractLinkedInIdentifier(body.linkedinUrl || lead.linkedinUrl)
    if (!identifier) {
      return NextResponse.json(
        { error: 'Lead sem URL do LinkedIn. Salve a URL do perfil antes de enriquecer.' },
        { status: 400 }
      )
    }

    const profile = await getLinkedInProfile(identifier)
    const profileText = buildProfileText(profile)

    if (!profileText || profileText.length < 50) {
      return NextResponse.json(
        { error: 'A Unipile retornou um perfil vazio ou incompleto. Verifique a URL do LinkedIn.' },
        { status: 422 }
      )
    }

    const currentPosition = getCurrentPosition(profile)
    const normalizedUrl = profile.public_identifier
      ? `https://www.linkedin.com/in/${profile.public_identifier}`
      : lead.linkedinUrl

    const fieldsToUpdate: {
      name?: string
      email?: string
      phone?: string
      company?: string
      seniority?: string
      linkedinUrl?: string
    } = {}
    const updatedFields: string[] = []
    const skippedFields: string[] = []

    // LinkedIn abrevia o sobrenome fora da rede (ex.: "Luke M.") —
    // nunca sobrescreve um nome já salvo com uma versão abreviada.
    const extractedName = cleanTextValue(getFullName(profile))
    const isAbbreviated = /\s[A-ZÀ-Ü]\.?$/.test(extractedName || '')
    if (extractedName && extractedName !== lead.name && !isAbbreviated) {
      fieldsToUpdate.name = extractedName
      updatedFields.push('name')
    }

    const extractedSeniority = cleanTextValue(
      profile.headline || currentPosition?.position
    )
    if (extractedSeniority && extractedSeniority !== lead.seniority) {
      fieldsToUpdate.seniority = extractedSeniority
      updatedFields.push('seniority')
    }

    const extractedCompany = cleanTextValue(currentPosition?.company)
    if (extractedCompany && extractedCompany !== lead.company) {
      fieldsToUpdate.company = extractedCompany
      updatedFields.push('company')
    }

    const extractedPhone = cleanTextValue(profile.contact_info?.phones?.[0], 50)
    if (extractedPhone && extractedPhone !== lead.phone) {
      fieldsToUpdate.phone = extractedPhone
      updatedFields.push('phone')
    }

    const extractedEmail = cleanTextValue(profile.contact_info?.emails?.[0])?.toLowerCase()
    if (extractedEmail && emailRegex.test(extractedEmail) && extractedEmail !== lead.email) {
      const duplicateEmail = await prisma.lead.findUnique({
        where: { email: extractedEmail },
      })
      if (duplicateEmail && duplicateEmail.id !== lead.id) {
        skippedFields.push('email')
      } else {
        fieldsToUpdate.email = extractedEmail
        updatedFields.push('email')
      }
    }

    if (normalizedUrl && normalizedUrl !== lead.linkedinUrl) {
      fieldsToUpdate.linkedinUrl = normalizedUrl
      updatedFields.push('linkedinUrl')
    }

    if (body.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        identifier,
        textLength: profileText.length,
        preview: profileText.substring(0, 400),
        fieldsToUpdate,
        skippedFields,
      })
    }

    await prisma.lead.update({
      where: { id: params.id },
      data: {
        profileText,
        profileUrl: normalizedUrl || `linkedin:${identifier}`,
        ...fieldsToUpdate,
      },
    })

    await prisma.auditLog.create({
      data: {
        leadId: lead.id,
        action: 'ENRICH_LINKEDIN',
        details: `Perfil enriquecido via Unipile (${identifier}). Campos atualizados: ${
          updatedFields.length ? updatedFields.join(', ') : 'nenhum'
        }.`,
      },
    })

    return NextResponse.json({
      success: true,
      textLength: profileText.length,
      preview: profileText.substring(0, 200) + '...',
      updatedFields,
      skippedFields,
      message:
        updatedFields.length > 0
          ? `Perfil enriquecido via LinkedIn. Campos atualizados: ${updatedFields.join(', ')}.`
          : 'Perfil enriquecido via LinkedIn. Dados cadastrais já estavam atualizados.',
    })
  } catch (error) {
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
