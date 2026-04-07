/**
 * Compliance validation rules for 4 Brazilian regulations:
 * - LGPD: Lei Geral de Proteção de Dados (Data Protection)
 * - PHARMA: ANVISA (Pharmaceutical Regulations)
 * - INSURANCE: SUSEP (Insurance Regulations)
 * - CONAR: Publicidade (Advertising Code)
 */

export interface ComplianceRule {
  regulation: string
  forbiddenKeywords: Array<{ pattern: string; reason: string }>
  requiredStatements: Array<{ pattern: string; reason: string }>
  description: string
}

const rules: Record<string, ComplianceRule> = {
  LGPD: {
    regulation: 'LGPD',
    description:
      'Lei Geral de Proteção de Dados - Brazilian Data Protection Law',
    forbiddenKeywords: [
      {
        pattern: 'rastreamento sem consentimento',
        reason: 'Tracking without consent violates LGPD',
      },
      {
        pattern: 'monitorar dados pessoais',
        reason: 'Monitoring personal data without consent is forbidden',
      },
      {
        pattern: 'vender dados pessoais',
        reason: 'Selling personal data is prohibited by LGPD',
      },
      {
        pattern: 'compartilhar dados sem permissão',
        reason: 'Sharing personal data without permission violates LGPD',
      },
      {
        pattern: 'coleta obrigatória de dados',
        reason: 'Mandatory data collection without consent is prohibited',
      },
    ],
    requiredStatements: [
      {
        pattern: 'consentimento|consent|autorizo',
        reason:
          'Must include consent or authorization statement for data processing',
      },
      {
        pattern: 'direito de|opt-out|desinscrever|cancelar',
        reason: 'Must provide opt-out or unsubscribe option as required by LGPD',
      },
      {
        pattern: 'privacidade|proteção de dados',
        reason: 'Should mention privacy or data protection commitment',
      },
    ],
  },

  PHARMA: {
    regulation: 'PHARMA',
    description: 'ANVISA Pharmaceutical and Healthcare Regulations',
    forbiddenKeywords: [
      {
        pattern: '\\bcur(a|ada|ado|ar|aremos|arão|á)\\b',
        reason: 'Pharmaceutical products cannot claim to cure diseases (ANVISA)',
      },
      {
        pattern: '\\b(milagre|milagroso|milagrosa)\\b',
        reason: 'Miraculous claims are strictly forbidden by ANVISA',
      },
      {
        pattern: '\\b(eficácia|eficaz).*(comprovada|garantida)',
        reason: 'Cannot claim unproven efficacy without clinical evidence',
      },
      {
        pattern: '\\bsem\\b.*(efeito colateral|efeitos colaterais)',
        reason: 'Cannot claim absence of side effects without evidence (ANVISA)',
      },
      {
        pattern: '\\b(substitui|substituir|substituto)\\b.*(medicamento|tratamento)',
        reason: 'Cannot claim to substitute prescribed medication',
      },
      {
        pattern: '\\b(aprovado|registrado)\\b.*(governo|ministério|anvisa)',
        reason: 'Cannot make false approval claims',
      },
      {
        pattern: '\\b(melhor|superior|mais eficaz)\\b.*(remédio|tratamento|solução|medicamento)',
        reason: 'Superlative claims require evidence (ANVISA)',
      },
    ],
    requiredStatements: [
      {
        pattern: 'consult(e|ar|oria)',
        reason:
          'Should recommend consulting healthcare professionals (ANVISA requirement)',
      },
      {
        pattern: 'registro(.*?)anvisa',
        reason:
          'Pharmaceutical products should mention ANVISA registration if applicable',
      },
    ],
  },

  INSURANCE: {
    regulation: 'INSURANCE',
    description: 'SUSEP Insurance Regulations',
    forbiddenKeywords: [
      {
        pattern: 'ganho garantido|lucro certo|rendimento garantido',
        reason: 'Cannot guarantee returns or profits in insurance (SUSEP)',
      },
      {
        pattern: 'sem risco|risco zero|100% seguro',
        reason: 'Cannot claim zero risk in insurance products (SUSEP)',
      },
      {
        pattern: 'nunca perde|sempre ganha|ganhar com certeza',
        reason: 'Cannot guarantee financial gains (SUSEP)',
      },
      {
        pattern: 'melhor taxa|menor preço garantido',
        reason: 'Cannot make unsubstantiated comparison claims',
      },
      {
        pattern: 'aprovado pelo(a)\\s+(government|estado|susep)',
        reason: 'Cannot make false regulatory approval claims',
      },
    ],
    requiredStatements: [
      {
        pattern: 'condições|riscos|limitações',
        reason: 'Must disclose terms, conditions, and limitations (SUSEP)',
      },
      {
        pattern: 'contrato|apólice',
        reason: 'Insurance products must reference contract or policy documentation',
      },
      {
        pattern: 'susep|regulado|regulação',
        reason:
          'Should mention SUSEP regulation if applicable to insurance products',
      },
    ],
  },

  CONAR: {
    regulation: 'CONAR',
    description: 'CONAR - Brazilian Advertising Code',
    forbiddenKeywords: [
      {
        pattern: 'enganoso|falso|mentir|engano',
        reason:
          'Deceptive or false claims violate CONAR advertising code',
      },
      {
        pattern: 'discriminatório|preconceito|racista|sexista',
        reason:
          'Discriminatory content violates CONAR advertising standards',
      },
      {
        pattern: 'explorar|vulnerável|criança',
        reason:
          'Cannot exploit vulnerable populations (CONAR ethical standards)',
      },
      {
        pattern: 'comparação injusta|concorrente inferior',
        reason: 'Unfair comparisons with competitors violate CONAR',
      },
      {
        pattern: 'urgência artificial|aproveite agora ou nunca',
        reason:
          'Artificial urgency tactics are discouraged by CONAR standards',
      },
    ],
    requiredStatements: [
      {
        pattern: 'verdade|honestidade|sincero',
        reason: 'Advertising must be truthful and honest (CONAR principle)',
      },
    ],
  },
}

export interface ValidationResult {
  isValid: boolean
  regulation: string
  score: number // 0-100
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

/**
 * Validate a message against a specific regulation
 */
export function validateMessage(
  message: string,
  regulation: string
): ValidationResult {
  const normalizedMessage = message.toLowerCase()
  const rule = rules[regulation]

  if (!rule) {
    return {
      isValid: false,
      regulation,
      score: 0,
      violations: [
        {
          type: 'forbidden_keyword',
          severity: 'critical',
          message: `Unknown regulation: ${regulation}. Valid options: LGPD, PHARMA, INSURANCE, CONAR`,
        },
      ],
      summary: `Invalid regulation: ${regulation}`,
    }
  }

  const violations: ValidationResult['violations'] = []

  // Check forbidden keywords
  for (const keyword of rule.forbiddenKeywords) {
    const regex = new RegExp(keyword.pattern, 'i')
    if (regex.test(normalizedMessage)) {
      violations.push({
        type: 'forbidden_keyword',
        severity: 'critical',
        message: keyword.reason,
      })
    }
  }

  // Check required statements
  for (const requirement of rule.requiredStatements) {
    const regex = new RegExp(requirement.pattern, 'i')
    if (!regex.test(normalizedMessage)) {
      violations.push({
        type: 'missing_requirement',
        severity: 'warning',
        message: requirement.reason,
      })
    }
  }

  // Calculate score (0-100)
  // Start at 100, deduct points for violations
  let score = 100
  for (const violation of violations) {
    if (violation.severity === 'critical') {
      score -= 30 // Critical violations deduct 30 points each
    } else {
      score -= 10 // Warnings deduct 10 points each
    }
  }
  score = Math.max(0, Math.min(100, score)) // Clamp between 0 and 100

  const isValid = violations.length === 0
  const summary = isValid
    ? `Message complies with ${regulation} requirements`
    : `Found ${violations.length} compliance issue(s)`

  return {
    isValid,
    regulation,
    score,
    violations,
    summary,
  }
}

/**
 * Get information about available compliance rules
 */
export function getComplianceRules(): RulesInfo[] {
  return Object.entries(rules).map(([_, rule]) => ({
    regulation: rule.regulation,
    description: rule.description,
    forbiddenKeywords: rule.forbiddenKeywords.map((k) => k.reason),
    requiredStatements: rule.requiredStatements.map((r) => r.reason),
  }))
}

/**
 * Validate a message against all regulations
 */
export function validateMessageAll(
  message: string
): Record<string, ValidationResult> {
  const results: Record<string, ValidationResult> = {}
  for (const regulation of Object.keys(rules)) {
    results[regulation] = validateMessage(message, regulation)
  }
  return results
}
