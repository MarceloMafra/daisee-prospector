// Cliente da API Unipile (LinkedIn) — https://developer.unipile.com
// Requer UNIPILE_BASE_URL, UNIPILE_API_KEY e UNIPILE_ACCOUNT_ID no ambiente.

export class UnipileError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'UnipileError'
    this.status = status
  }
}

export function isUnipileConfigured() {
  return Boolean(
    process.env.UNIPILE_BASE_URL &&
      process.env.UNIPILE_API_KEY &&
      process.env.UNIPILE_ACCOUNT_ID
  )
}

async function unipileGet(path: string) {
  const baseUrl = (process.env.UNIPILE_BASE_URL || '').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'X-API-KEY': process.env.UNIPILE_API_KEY || '',
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.title || body?.type || ''
    } catch {
      // corpo não-JSON — mantém detail vazio
    }
    throw new UnipileError(
      `Unipile respondeu ${response.status}${detail ? `: ${detail}` : ''}`,
      response.status
    )
  }

  return response.json()
}

// Aceita URL completa (https://www.linkedin.com/in/slug/), slug puro ou provider_id.
export function extractLinkedInIdentifier(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const urlMatch = trimmed.match(/linkedin\.com\/in\/([^/?#]+)/i)
  if (urlMatch) return decodeURIComponent(urlMatch[1])

  // Sales Navigator: /sales/lead/<id>,...
  const salesMatch = trimmed.match(/linkedin\.com\/sales\/lead\/([^,/?#]+)/i)
  if (salesMatch) return salesMatch[1]

  if (/^[\w\-%.]+$/i.test(trimmed) && !trimmed.includes('linkedin.com')) {
    return decodeURIComponent(trimmed)
  }

  return null
}

export interface UnipileExperience {
  position?: string
  company?: string
  start?: string
  end?: string
  location?: string
  description?: string
  current?: boolean
}

export interface UnipileProfile {
  provider_id?: string
  public_identifier?: string
  first_name?: string
  last_name?: string
  headline?: string
  summary?: string
  location?: string
  follower_count?: number
  connections_count?: number
  websites?: string[]
  work_experience?: UnipileExperience[]
  experience?: UnipileExperience[]
  education?: Array<{
    degree?: string
    school?: string
    field_of_study?: string
    start?: string
    end?: string
  }>
  skills?: Array<{ name?: string; endorsement_count?: number } | string>
  languages?: Array<{ name?: string; proficiency?: string } | string>
  certifications?: Array<{ name?: string; organization?: string }>
  contact_info?: {
    emails?: string[]
    phones?: string[]
  }
  is_premium?: boolean
}

export async function getLinkedInProfile(identifier: string): Promise<UnipileProfile> {
  const accountId = process.env.UNIPILE_ACCOUNT_ID || ''
  const query = new URLSearchParams({
    account_id: accountId,
    linkedin_sections: '*',
  })
  return unipileGet(`/users/${encodeURIComponent(identifier)}?${query.toString()}`)
}

export function getExperiences(profile: UnipileProfile): UnipileExperience[] {
  return profile.work_experience || profile.experience || []
}

export function getCurrentPosition(profile: UnipileProfile): UnipileExperience | null {
  const experiences = getExperiences(profile)
  return experiences.find((exp) => exp.current || !exp.end) || experiences[0] || null
}

export function getFullName(profile: UnipileProfile): string | null {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return name || null
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return ''
  return ` (${start || '?'} — ${end || 'atual'})`
}

// Converte o JSON estruturado da Unipile em texto de perfil no mesmo formato
// consumido pela geração de cadência (campo profileText).
export function buildProfileText(profile: UnipileProfile): string {
  const lines: string[] = []
  const name = getFullName(profile)

  if (name) lines.push(name)
  if (profile.headline) lines.push(profile.headline)
  if (profile.location) lines.push(`Localização: ${profile.location}`)
  if (typeof profile.follower_count === 'number') {
    lines.push(`Seguidores: ${profile.follower_count}`)
  }
  if (profile.websites?.length) lines.push(`Sites: ${profile.websites.join(', ')}`)

  if (profile.summary) {
    lines.push('', 'Resumo:', profile.summary)
  }

  const experiences = getExperiences(profile)
  if (experiences.length) {
    lines.push('', 'Experiência:')
    for (const exp of experiences) {
      const header = [exp.position, exp.company].filter(Boolean).join(' — ')
      lines.push(`- ${header}${formatPeriod(exp.start, exp.end)}`)
      if (exp.description) lines.push(`  ${exp.description.replace(/\s+/g, ' ').trim()}`)
    }
  }

  if (profile.education?.length) {
    lines.push('', 'Formação:')
    for (const edu of profile.education) {
      const parts = [edu.school, edu.degree, edu.field_of_study].filter(Boolean).join(' — ')
      lines.push(`- ${parts}${formatPeriod(edu.start, edu.end)}`)
    }
  }

  if (profile.skills?.length) {
    const skillNames = profile.skills
      .map((skill) => (typeof skill === 'string' ? skill : skill.name))
      .filter(Boolean)
      .slice(0, 30)
    if (skillNames.length) {
      lines.push('', `Competências: ${skillNames.join(', ')}`)
    }
  }

  if (profile.languages?.length) {
    const languageNames = profile.languages
      .map((lang) => (typeof lang === 'string' ? lang : lang.name))
      .filter(Boolean)
    if (languageNames.length) {
      lines.push('', `Idiomas: ${languageNames.join(', ')}`)
    }
  }

  if (profile.certifications?.length) {
    const certs = profile.certifications
      .map((cert) => [cert.name, cert.organization].filter(Boolean).join(' — '))
      .filter(Boolean)
    if (certs.length) {
      lines.push('', 'Certificações:', ...certs.map((cert) => `- ${cert}`))
    }
  }

  return lines.join('\n').trim()
}
