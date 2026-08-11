// Lógica de enriquecimento de lead via LinkedIn (Unipile) + análise de empresa (Claude).
// Extraído de app/api/leads/[id]/enrich/route.ts para ser reaproveitado também
// pelo pipeline automático (lib/autoPipeline.ts) sem duplicar código.
import { Anthropic } from '@anthropic-ai/sdk'
import type { Lead } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  UnipilePost,
  buildCompanyContext,
  buildProfileText,
  extractLinkedInIdentifier,
  getCompanyPosts,
  getCurrentPosition,
  getFullName,
  getLinkedInCompany,
  getLinkedInProfile,
  mapEmployeeCountToCompanySize,
} from '@/lib/unipile'
import { calculateDAISEEScore, getScorePriority } from '@/lib/daisee-score'

export class EnrichmentError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'EnrichmentError'
    this.status = status
  }
}

// Sintetiza análise de cenário da empresa (estilo Account IQ do Sales Navigator)
// a partir dos dados coletados na Unipile. Fallback: texto factual puro.
async function generateCompanyAnalysis(params: {
  companyFacts: string
  posts: UnipilePost[]
  leadName: string
  leadSeniority: string
}): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null

  const postsText = params.posts
    .map((post) => `- [${post.date || post.parsed_datetime || 'recente'}] ${(post.text || '').replace(/\s+/g, ' ').trim().substring(0, 400)}`)
    .filter((line) => line.length > 15)
    .join('\n')

  try {
    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Você é um analista de inteligência comercial B2B. Com base APENAS nos dados abaixo, produza uma análise de cenário da empresa para apoiar prospecção, em português do Brasil, neste formato exato (texto puro, sem markdown):

Prioridades estratégicas
[2 a 3 temas. Cada tema: uma linha com o nome do tema, seguida de um parágrafo de 2-3 frases explicando.]

Desafios de negócios
[2 a 3 desafios prováveis, no mesmo formato.]

Ganchos de abordagem
[2 a 3 sugestões práticas para abordar ${params.leadName} (${params.leadSeniority}), conectando as prioridades/desafios acima a uma conversa de prospecção.]

Regras:
- Baseie-se somente nos dados fornecidos. Onde precisar inferir, use linguagem de hipótese ("provavelmente", "tende a", "sugere").
- NÃO invente números, aquisições, nomes de produtos ou fatos.
- Não inclua cabeçalho, saudação ou comentários fora do formato.

Dados da empresa:
${params.companyFacts}

Posts recentes da empresa no LinkedIn:
${postsText || '(nenhum post disponível)'}`,
        },
      ],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
    return text.length >= 100 ? text : null
  } catch (error) {
    console.error('Erro ao gerar análise da empresa com Claude:', error)
    return null
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanTextValue(value?: string | null, maxLength = 255) {
  if (!value) return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null
}

export interface EnrichLeadOptions {
  linkedinUrl?: string
  dryRun?: boolean
  regenerateCompanyContext?: boolean
}

export interface EnrichLeadResult {
  identifier: string
  profileText: string
  dryRun: boolean
  fieldsToUpdate: Record<string, unknown>
  updatedFields: string[]
  skippedFields: string[]
}

export async function enrichLeadFromLinkedIn(lead: Lead, opts: EnrichLeadOptions = {}): Promise<EnrichLeadResult> {
  const identifier = extractLinkedInIdentifier(opts.linkedinUrl || lead.linkedinUrl)
  if (!identifier) {
    throw new EnrichmentError('Lead sem URL do LinkedIn. Salve a URL do perfil antes de enriquecer.', 400)
  }

  const profile = await getLinkedInProfile(identifier)
  const profileText = buildProfileText(profile)

  if (!profileText || profileText.length < 50) {
    throw new EnrichmentError('A Unipile retornou um perfil vazio ou incompleto. Verifique a URL do LinkedIn.', 422)
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
    linkedinProviderId?: string
    companyContext?: string
    companySize?: 'MICRO' | 'PEQUENA' | 'MEDIA' | 'GRANDE' | 'ENTERPRISE'
    daiseeScore?: number
    decisionPower?: number
    segmentMatch?: number
    priority?: 'BAIXA' | 'MEDIA' | 'ALTA'
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

  if (profile.provider_id && profile.provider_id !== lead.linkedinProviderId) {
    fieldsToUpdate.linkedinProviderId = profile.provider_id
    updatedFields.push('linkedinProviderId')
  }

  // Contexto da empresa atual do lead: fatos via Unipile + posts recentes →
  // análise de cenário sintetizada pelo Claude (estilo Account IQ).
  // Não sobrescreve contexto existente, exceto com regenerateCompanyContext: true.
  if (currentPosition?.company_id) {
    const shouldFillContext = !lead.companyContext?.trim() || opts.regenerateCompanyContext
    try {
      const company = await getLinkedInCompany(currentPosition.company_id)

      const companySize = mapEmployeeCountToCompanySize(company.employee_count)
      if (companySize && companySize !== lead.companySize) {
        fieldsToUpdate.companySize = companySize
        updatedFields.push('companySize')
      }

      if (shouldFillContext) {
        const companyFacts = buildCompanyContext(company)
        let posts: UnipilePost[] = []
        try {
          posts = await getCompanyPosts(currentPosition.company_id)
        } catch {
          // posts são opcionais — análise segue só com os fatos
        }

        const analysis = await generateCompanyAnalysis({
          companyFacts,
          posts,
          leadName: fieldsToUpdate.name || lead.name,
          leadSeniority: fieldsToUpdate.seniority || lead.seniority,
        })

        const companyContext = analysis
          ? `${companyFacts}\n\n${analysis}`
          : companyFacts
        if (companyContext && companyContext.length >= 30) {
          fieldsToUpdate.companyContext = companyContext
          updatedFields.push('companyContext')
        }
      } else {
        skippedFields.push('companyContext')
      }
    } catch (companyError) {
      // Falha ao buscar empresa não bloqueia o enriquecimento do perfil
      console.error('Erro ao buscar empresa na Unipile:', companyError)
      skippedFields.push('companyContext')
    }
  }

  // Recalcula o DAISEE Score com os dados enriquecidos (cargo 40% + porte 35% + segmento 25%)
  const scoreInput = {
    seniority: fieldsToUpdate.seniority || lead.seniority,
    companySize: fieldsToUpdate.companySize || lead.companySize,
    segmentMatch: lead.segmentMatch,
  }
  const daisee = calculateDAISEEScore(scoreInput)
  if (daisee.score !== lead.daiseeScore) {
    fieldsToUpdate.daiseeScore = daisee.score
    fieldsToUpdate.decisionPower = daisee.decisionPower
    fieldsToUpdate.segmentMatch = daisee.segmentMatch
    fieldsToUpdate.priority = getScorePriority(daisee.score)
    updatedFields.push('daiseeScore')
  }

  if (opts.dryRun) {
    return { identifier, profileText, dryRun: true, fieldsToUpdate, updatedFields, skippedFields }
  }

  await prisma.lead.update({
    where: { id: lead.id },
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

  return { identifier, profileText, dryRun: false, fieldsToUpdate, updatedFields, skippedFields }
}
