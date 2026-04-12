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
    description: 'Lei Geral de Proteção de Dados',
    forbiddenKeywords: [
      { pattern: 'rastreamento sem consentimento', reason: 'Rastreamento sem consentimento viola a LGPD' },
      { pattern: 'monitorar dados pessoais', reason: 'Monitorar dados pessoais sem consentimento é proibido pela LGPD' },
      { pattern: 'vender dados pessoais', reason: 'Venda de dados pessoais é proibida pela LGPD' },
      { pattern: 'compartilhar dados sem permissão', reason: 'Compartilhar dados pessoais sem autorização viola a LGPD' },
      { pattern: 'coleta obrigatória de dados', reason: 'Coleta obrigatória de dados sem consentimento é proibida' },
    ],
    requiredStatements: [
      { pattern: 'consentimento|consent|autorizo', reason: 'Deve incluir declaração de consentimento ou autorização para tratamento de dados' },
      { pattern: 'direito de|opt-out|desinscrever|cancelar', reason: 'Deve oferecer opção de descadastro conforme exigido pela LGPD' },
      { pattern: 'privacidade|proteção de dados', reason: 'Deve mencionar compromisso com privacidade ou proteção de dados' },
    ],
  },

  PHARMA: {
    regulation: 'PHARMA',
    description: 'ANVISA — Regulação Farmacêutica e de Saúde',
    forbiddenKeywords: [
      { pattern: '\\bcur(a|ada|ado|ar|aremos|arão|á)\\b', reason: 'Produtos farmacêuticos não podem afirmar que curam doenças (ANVISA)' },
      { pattern: '\\b(milagre|milagroso|milagrosa)\\b', reason: 'Alegações milagrosas são estritamente proibidas pela ANVISA' },
      { pattern: '\\b(eficácia|eficaz).*(comprovada|garantida)', reason: 'Não é permitido alegar eficácia sem evidências clínicas comprovadas' },
      { pattern: '\\bsem\\b.*(efeito colateral|efeitos colaterais)', reason: 'Não é permitido afirmar ausência de efeitos colaterais sem evidências (ANVISA)' },
      { pattern: '\\b(substitui|substituir|substituto)\\b.*(medicamento|tratamento)', reason: 'Não é permitido afirmar que substitui medicamento prescrito' },
      { pattern: '\\b(aprovado|registrado)\\b.*(governo|ministério|anvisa)', reason: 'Não é permitido fazer alegações falsas de aprovação regulatória' },
      { pattern: '\\b(melhor|superior|mais eficaz)\\b.*(remédio|tratamento|solução|medicamento)', reason: 'Alegações superlativas exigem evidências comprovadas (ANVISA)' },
    ],
    requiredStatements: [
      { pattern: 'consult(e|ar|oria)', reason: 'Recomenda-se indicar consulta a profissionais de saúde (exigência ANVISA)' },
      { pattern: 'registro(.*?)anvisa', reason: 'Produtos farmacêuticos devem mencionar registro ANVISA quando aplicável' },
    ],
  },

  INSURANCE: {
    regulation: 'INSURANCE',
    description: 'SUSEP — Superintendência de Seguros Privados',
    forbiddenKeywords: [
      { pattern: 'ganho garantido|lucro certo|rendimento garantido', reason: 'Não é permitido garantir retornos ou lucros em produtos de seguro (SUSEP)' },
      { pattern: 'sem risco|risco zero|100% seguro', reason: 'Não é permitido alegar risco zero em produtos de seguro (SUSEP)' },
      { pattern: 'nunca perde|sempre ganha|ganhar com certeza', reason: 'Não é permitido garantir ganhos financeiros (SUSEP)' },
      { pattern: 'melhor taxa|menor preço garantido', reason: 'Comparações sem comprovação não são permitidas (SUSEP)' },
      { pattern: 'aprovado pelo(a)\\s+(government|estado|susep)', reason: 'Não é permitido fazer alegações falsas de aprovação regulatória' },
    ],
    requiredStatements: [
      { pattern: 'condições|riscos|limitações', reason: 'Deve informar condições, riscos e limitações do produto (SUSEP)' },
      { pattern: 'contrato|apólice', reason: 'Produtos de seguro devem referenciar contrato ou apólice' },
      { pattern: 'susep|regulado|regulação', reason: 'Deve mencionar regulação SUSEP quando aplicável' },
    ],
  },

  CONAR: {
    regulation: 'CONAR',
    description: 'CONAR — Código Brasileiro de Autorregulamentação Publicitária',
    forbiddenKeywords: [
      { pattern: 'enganoso|falso|mentir|engano', reason: 'Alegações enganosas ou falsas violam o Código CONAR' },
      { pattern: 'discriminatório|preconceito|racista|sexista', reason: 'Conteúdo discriminatório viola as normas do CONAR' },
      { pattern: 'explorar|vulnerável|criança', reason: 'Não é permitido explorar populações vulneráveis (ética CONAR)' },
      { pattern: 'comparação injusta|concorrente inferior', reason: 'Comparações injustas com concorrentes violam o CONAR' },
      { pattern: 'urgência artificial|aproveite agora ou nunca', reason: 'Táticas de urgência artificial são vedadas pelo CONAR' },
    ],
    requiredStatements: [
      { pattern: 'verdade|honestidade|sincero', reason: 'A publicidade deve ser verdadeira e honesta (princípio CONAR)' },
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
          message: `Regulação desconhecida: ${regulation}. Opções válidas: LGPD, PHARMA, INSURANCE, CONAR`,
        },
      ],
      summary: `Regulação inválida: ${regulation}`,
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
    ? `Mensagem em conformidade com os requisitos de ${regulation}`
    : `${violations.length} problema(s) de conformidade encontrado(s)`

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
