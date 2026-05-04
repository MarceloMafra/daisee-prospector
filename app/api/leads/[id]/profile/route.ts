import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Anthropic } from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface ExtractedLeadProfile {
  name?: string | null
  email?: string | null
  phone?: string | null
  seniority?: string | null
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fieldLabels: Record<string, string> = {
  name: 'nome',
  email: 'e-mail',
  phone: 'telefone/WhatsApp',
  seniority: 'cargo/senioridade',
}

function cleanTextValue(value?: string | null, maxLength = 255) {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null
}

function cleanEmail(value?: string | null) {
  const email = cleanTextValue(value)?.toLowerCase()
  return email && emailRegex.test(email) ? email : null
}

function cleanPhone(value?: string | null) {
  const phone = cleanTextValue(value, 50)
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null

  return phone
}

function fallbackExtractProfileFields(profileText: string): ExtractedLeadProfile {
  const email = profileText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null
  const phone =
    profileText.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/)?.[0] ??
    null

  return {
    email,
    phone,
  }
}

function parseJsonObject(text: string): ExtractedLeadProfile {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  try {
    return JSON.parse(jsonMatch[0]) as ExtractedLeadProfile
  } catch {
    return {}
  }
}

async function extractLeadProfileFields(profileText: string): Promise<ExtractedLeadProfile> {
  const fallback = fallbackExtractProfileFields(profileText)

  if (!process.env.ANTHROPIC_API_KEY) {
    return fallback
  }

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 500,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `Extraia dados cadastrais do texto de um perfil LinkedIn salvo em PDF.

Retorne APENAS um JSON válido, sem markdown, neste formato:
{"name": string|null, "email": string|null, "phone": string|null, "seniority": string|null}

Regras:
- name: nome completo da pessoa do perfil.
- email: e-mail explícito no texto, se houver.
- phone: telefone/celular/WhatsApp explícito no texto, se houver.
- seniority: cargo/headline atual da pessoa, não histórico antigo.
- Use null quando não houver confiança.
- Não invente nenhum dado.

Texto do PDF:
${profileText.substring(0, 6000)}`,
        },
      ],
    })

    const responseText =
      message.content[0]?.type === 'text' ? message.content[0].text : ''
    const extracted = parseJsonObject(responseText)

    return {
      name: extracted.name ?? null,
      email: extracted.email ?? fallback.email ?? null,
      phone: extracted.phone ?? fallback.phone ?? null,
      seniority: extracted.seniority ?? null,
    }
  } catch (error) {
    console.error('Erro ao extrair dados do perfil com Claude:', error)
    return fallback
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'O arquivo deve ser um PDF' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 5MB)' }, { status: 413 })
    }

    // Extract text from PDF
    const buffer = await file.arrayBuffer()
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(Buffer.from(buffer))
    const profileText = pdfData.text?.trim()

    if (!profileText || profileText.length < 50) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto do PDF. Verifique se o arquivo é válido.' },
        { status: 400 }
      )
    }

    const extracted = await extractLeadProfileFields(profileText)
    const fieldsToUpdate: {
      name?: string
      email?: string
      phone?: string | null
      seniority?: string
    } = {}
    const updatedFields: string[] = []
    const skippedFields: string[] = []

    const extractedName = cleanTextValue(extracted.name)
    if (extractedName && extractedName !== lead.name) {
      fieldsToUpdate.name = extractedName
      updatedFields.push('name')
    }

    const extractedSeniority = cleanTextValue(extracted.seniority)
    if (extractedSeniority && extractedSeniority !== lead.seniority) {
      fieldsToUpdate.seniority = extractedSeniority
      updatedFields.push('seniority')
    }

    const extractedPhone = cleanPhone(extracted.phone)
    if (extractedPhone && extractedPhone !== lead.phone) {
      fieldsToUpdate.phone = extractedPhone
      updatedFields.push('phone')
    }

    const extractedEmail = cleanEmail(extracted.email)
    if (extractedEmail && extractedEmail !== lead.email) {
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

    await prisma.lead.update({
      where: { id: params.id },
      data: {
        profileText,
        profileUrl: file.name,
        ...fieldsToUpdate,
      },
    })

    return NextResponse.json({
      success: true,
      textLength: profileText.length,
      preview: profileText.substring(0, 200) + '...',
      extractedFields: extracted,
      updatedFields,
      skippedFields,
      message:
        updatedFields.length > 0
          ? `Perfil extraído com sucesso. Campos atualizados: ${updatedFields.map((field) => fieldLabels[field] || field).join(', ')}.`
          : 'Perfil extraído com sucesso. Nenhum dado cadastral novo foi encontrado com confiança.',
    })
  } catch (error) {
    console.error('Erro ao processar PDF:', error)
    return NextResponse.json(
      { error: 'Falha ao processar o PDF. Tente novamente.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    await prisma.lead.update({
      where: { id: params.id },
      data: { profileText: null, profileUrl: null },
    })

    return NextResponse.json({ success: true, message: 'Perfil removido com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao remover perfil' }, { status: 500 })
  }
}
