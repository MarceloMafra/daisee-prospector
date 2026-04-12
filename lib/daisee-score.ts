export interface DAISEEInput {
  seniority: string
  companySize?: 'MICRO' | 'PEQUENA' | 'MEDIA' | 'GRANDE' | 'ENTERPRISE'
  segmentMatch?: number // 0-100
}

export interface DAISEEResult {
  score: number
  decisionPower: number
  companySize: number
  segmentMatch: number
}

/**
 * Detecta o nível de senioridade a partir do cargo (PT e EN)
 * Retorna decisionPower de 0-100
 */
function calcDecisionPower(seniority: string): number {
  const s = seniority.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos para comparação

  // C-Level / CEO / Fundador
  if (/(^|\s)(ceo|coo|cfo|cto|ciso|cpo|president|fundador|founder|socio|sócio|proprietar)/.test(s)) return 100

  // VP / Vice-Presidente
  if (/(^|\s)(vp|vice.president|vice.presidente|vice presidente)/.test(s)) return 85

  // Diretor
  if (/(^|\s)(diret|director|head of|head,)/.test(s)) return 75

  // Gerente / Manager
  if (/(^|\s)(gerente|manager|coordenador|coordinator|lider|líder|lead\b)/.test(s)) return 60

  // Sênior / Senior Specialist / Analista Sênior
  if (/(senior|sênior|sr\.?\s|especialista|specialist|consultor|consultant)/.test(s)) return 40

  // Pleno
  if (/(pleno|pl\.?\s|analista\b|analyst\b|engineer\b|engenheiro)/.test(s)) return 25

  // Júnior / Estágio
  if (/(junior|júnior|jr\.?\s|estagi|intern|trainee|assistente|assistant)/.test(s)) return 10

  return 20 // desconhecido
}

/**
 * Score por tamanho da empresa
 * ENTERPRISE: 500+ funcionários
 * GRANDE: 250-499
 * MEDIA: 50-249
 * PEQUENA: 10-49
 * MICRO: 1-9
 */
function calcCompanySizeScore(companySize?: string): number {
  switch (companySize) {
    case 'ENTERPRISE': return 100
    case 'GRANDE':     return 80
    case 'MEDIA':      return 55
    case 'PEQUENA':    return 30
    case 'MICRO':      return 10
    default:           return 40
  }
}

export function calculateDAISEEScore(input: DAISEEInput): DAISEEResult {
  const decisionPower    = calcDecisionPower(input.seniority)
  const companySizeScore = calcCompanySizeScore(input.companySize)
  const segmentMatch     = Math.min(Math.max(input.segmentMatch || 50, 0), 100)

  // Pesos: Cargo 40% | Empresa 35% | Segmento 25%
  const weighted =
    decisionPower    * 0.40 +
    companySizeScore * 0.35 +
    segmentMatch     * 0.25

  const score = Math.round(Math.min(Math.max(weighted, 0), 100) * 10) / 10

  return { score, decisionPower, companySize: companySizeScore, segmentMatch }
}

/**
 * Determina a fase do funil automaticamente com base nos dados do lead
 */
export function suggestPipelineStage(params: {
  score: number
  seniority: string
  companySize: string
  touchesSent: number
}): { status: string; reason: string } {
  const { score, seniority, companySize, touchesSent } = params
  const decisionPower = calcDecisionPower(seniority)
  const isICP =
    score >= 50 &&
    decisionPower >= 40 &&
    (companySize === 'GRANDE' || companySize === 'ENTERPRISE')

  if (touchesSent > 0) {
    return { status: 'EM_PROGRESSO', reason: `${touchesSent} touch(es) enviado(s)` }
  }

  if (isICP) {
    return { status: 'QUALIFICADO', reason: `Score ${score}, cargo elegível, empresa ${companySize}` }
  }

  if (score < 40 || decisionPower < 25) {
    return { status: 'DESCARTADO', reason: `Score ${score} ou cargo abaixo do ICP` }
  }

  return { status: 'PROSPECTANDO', reason: 'Aguardando qualificação' }
}

export function getScorePriority(score: number): 'ALTA' | 'MEDIA' | 'BAIXA' {
  if (score >= 80) return 'ALTA'
  if (score >= 50) return 'MEDIA'
  return 'BAIXA'
}
