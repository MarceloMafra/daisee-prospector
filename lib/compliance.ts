/**
 * Validador de qualidade de copy para prospecção B2B
 * Avalia mensagens de LinkedIn e e-mail com foco em conversão e boas práticas
 */

export interface ValidationResult {
  isValid: boolean
  regulation: string
  score: number
  violations: Array<{
    type: 'forbidden_keyword' | 'missing_requirement'
    severity: 'critical' | 'warning'
    message: string
  }>
  summary: string
}

export interface RulesInfo {
  regulation: string
  description: string
  forbiddenKeywords: string[]
  requiredStatements: string[]
}

interface CopyRule {
  id: string
  description: string
  check: (text: string, channel?: string) => { pass: boolean; severity: 'critical' | 'warning'; message: string } | null
}

const SPAM_WORDS = [
  'urgente', 'grátis', 'gratuito', 'clique agora', 'não perca', 'oferta imperdível',
  'ganhe dinheiro', 'renda extra', 'trabalhe de casa', 'resultado garantido',
  'comprovado cientificamente', 'revolucionário', 'exclusivo para você',
  'responda já', 'promoção limitada', 'vagas limitadas', 'apenas hoje',
]

const AGGRESSIVE_WORDS = [
  'você precisa', 'você deve', 'não ignore', 'última chance', 'agora ou nunca',
  'melhor do mercado', 'número 1', 'líder absoluto', 'incomparável',
]

const COPY_RULES: CopyRule[] = [
  {
    id: 'spam_words',
    description: 'Palavras de spam',
    check: (text) => {
      const lower = text.toLowerCase()
      const found = SPAM_WORDS.filter(w => lower.includes(w))
      if (found.length === 0) return null
      return {
        pass: false,
        severity: 'critical',
        message: `Linguagem de spam detectada: "${found[0]}" — prejudica entregabilidade e credibilidade`,
      }
    },
  },
  {
    id: 'aggressive_words',
    description: 'Tom agressivo',
    check: (text) => {
      const lower = text.toLowerCase()
      const found = AGGRESSIVE_WORDS.filter(w => lower.includes(w))
      if (found.length === 0) return null
      return {
        pass: false,
        severity: 'warning',
        message: `Tom muito agressivo: "${found[0]}" — prefira abordagem consultiva`,
      }
    },
  },
  {
    id: 'personalization',
    description: 'Personalização',
    check: (text) => {
      // Check if message has at least one proper noun (capitalized word that isn't at sentence start)
      const words = text.split(/\s+/)
      const hasProperNoun = words.slice(1).some(w => /^[A-ZÁÉÍÓÚÀÃÕÂÊÔ]/.test(w) && w.length > 2)
      if (hasProperNoun) return null
      return {
        pass: false,
        severity: 'warning',
        message: 'Mensagem pode ser genérica — verifique se menciona nome, empresa ou cargo do prospect',
      }
    },
  },
  {
    id: 'question_or_cta',
    description: 'Pergunta ou chamada para ação',
    check: (text) => {
      const hasQuestion = text.includes('?')
      const ctaPatterns = /conversa|reunião|call|papo|minutos|disponível|agenda|faz sentido/i
      if (hasQuestion || ctaPatterns.test(text)) return null
      return {
        pass: false,
        severity: 'warning',
        message: 'Sem pergunta ou CTA claro — toda mensagem de prospecção deve terminar com próximo passo',
      }
    },
  },
  {
    id: 'too_short',
    description: 'Conteúdo mínimo',
    check: (text) => {
      if (text.trim().length >= 80) return null
      return {
        pass: false,
        severity: 'warning',
        message: 'Mensagem muito curta — adicione contexto ou valor antes do CTA',
      }
    },
  },
  {
    id: 'linkedin_250_limit',
    description: 'Limite LinkedIn 250',
    check: (text, channel) => {
      if (channel !== 'LINKEDIN_250') return null
      if (text.length <= 300) return null
      return {
        pass: false,
        severity: 'critical',
        message: `Mensagem com ${text.length} caracteres — LinkedIn connection request tem limite de 300 caracteres`,
      }
    },
  },
  {
    id: 'linkedin_500_limit',
    description: 'Limite LinkedIn 500',
    check: (text, channel) => {
      if (channel !== 'LINKEDIN_500') return null
      if (text.length <= 600) return null
      return {
        pass: false,
        severity: 'critical',
        message: `Mensagem com ${text.length} caracteres — InMail LinkedIn tem limite de 600 caracteres`,
      }
    },
  },
  {
    id: 'multiple_cta',
    description: 'CTA único',
    check: (text) => {
      const ctaCount = (text.match(/\?/g) || []).length
      if (ctaCount <= 2) return null
      return {
        pass: false,
        severity: 'warning',
        message: `${ctaCount} perguntas na mesma mensagem — foque em um único CTA para não confundir`,
      }
    },
  },
  {
    id: 'value_proposition',
    description: 'Proposta de valor',
    check: (text) => {
      const valuePatterns = /ajud|result|impacto|desafio|solução|melhoria|reduz|aumenta|economia|eficiência/i
      if (valuePatterns.test(text)) return null
      return {
        pass: false,
        severity: 'warning',
        message: 'Sem proposta de valor clara — mencione como pode ajudar ou qual problema resolve',
      }
    },
  },
]

export function validateMessage(message: string, channel?: string): ValidationResult {
  const violations: ValidationResult['violations'] = []

  for (const rule of COPY_RULES) {
    const result = rule.check(message, channel || undefined)
    if (result && !result.pass) {
      violations.push({
        type: result.severity === 'critical' ? 'forbidden_keyword' : 'missing_requirement',
        severity: result.severity,
        message: result.message,
      })
    }
  }

  let score = 100
  for (const v of violations) {
    score -= v.severity === 'critical' ? 25 : 10
  }
  score = Math.max(0, Math.min(100, score))

  const isValid = score >= 70

  return {
    isValid,
    regulation: 'COPY',
    score,
    violations,
    summary: isValid
      ? `Copy aprovada — Score ${score}/100`
      : `${violations.length} ponto(s) de melhoria — Score ${score}/100`,
  }
}

export function getComplianceRules(): RulesInfo[] {
  return [
    {
      regulation: 'COPY',
      description: 'Qualidade de copy para prospecção B2B',
      forbiddenKeywords: SPAM_WORDS,
      requiredStatements: ['personalização', 'proposta de valor', 'pergunta ou CTA'],
    },
  ]
}

export function validateMessageAll(message: string): Record<string, ValidationResult> {
  return { COPY: validateMessage(message) }
}
