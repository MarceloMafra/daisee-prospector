// Triagem de uma lista do Sales Navigator usando SÓ os dados que a própria lista
// devolve — headline, cargo, empresa, setor, localização e o estado de contato.
// Nada de enriquecer perfil, que custa uma chamada por lead, nem de ler o
// summary, que multiplica por cinco o texto sem melhorar a decisão de "essa
// pessoa é do público ou não".
//
// A saída não é um sim/não: é uma pontuação com o MOTIVO de cada ponto, para a
// revisão ser por grupo em vez de um a um.
//
// Os três eixos são os que o Marcelo definiu em 02/09: quanto mais sênior
// melhor, quanto mais elevado o cargo melhor, e quanto mais técnico em
// compliance e gestão documental melhor.

export interface FichaTriagem {
  nome: string
  headline: string
  cargo: string
  empresa: string
  setor: string
  uf: string
  providerId: string
  convitePendente: boolean
  grau: string
}

export type Faixa = 'ALVO' | 'TALVEZ' | 'FORA'
export type Contato = 'CONECTADO' | 'CONVITE_PENDENTE' | 'NOVO'

export interface Veredito {
  ficha: FichaTriagem
  pontos: number
  faixa: Faixa
  contato: Contato
  nivel: string
  termos: string[]
  motivos: string[]
}

// ── Eixo 1: altura do cargo ────────────────────────────────────────────────
// Graduado, não binário: um Head de Compliance e um Analista de Compliance
// casam com a mesma regra de função, mas não são o mesmo lead.
const NIVEIS: { nome: string; pontos: number; re: RegExp }[] = [
  {
    nome: 'C-level/VP',
    pontos: 30,
    re: /\b(ceo|cfo|coo|cto|cio|ciso|cco|cro|clo|chief|vice[- ]?presidente|vice[- ]?president|vp|presidente|board member|conselheir\w*)\b/i,
  },
  {
    nome: 'Diretoria',
    pontos: 26,
    re: /\b(diretor\w*|director|superintendente|head|s[óo]ci[oa]|partner|managing)\b/i,
  },
  { nome: 'Gerência', pontos: 20, re: /\b(gerente|manager|gestor\w*)\b/i },
  {
    nome: 'Coordenação',
    pontos: 14,
    re: /\b(coordenador\w*|coordinator|supervisor\w*|l[íi]der|lead|chefe)\b/i,
  },
  {
    nome: 'Especialista',
    pontos: 9,
    re: /\b(especialista|specialist|consultor\w*|s[êe]nior|senior|sr|encarregad\w*)\b/i,
  },
  { nome: 'Analista', pontos: 4, re: /\b(analista|analyst|assessor\w*|t[ée]cnic[oa])\b/i },
]

// Modificadores de senioridade. "Analista Júnior de Ouvidoria" casa com Analista
// e com Júnior ao mesmo tempo, e o find() devolvia Analista — pessoa em início
// de carreira entrava como ALVO com 83 pontos. O modificador tem precedência
// sobre o nível base, porque é ele que diz onde a pessoa está na escada.
const INICIO_DE_CARREIRA =
  /\b(estagi[áa]ri\w*|intern|trainee|junior|j[úu]nior|jr|assistente|auxiliar|aprendiz)\b/i

const SENIORIDADE_ALTA = /\b(s[êe]nior|senior|sr|pleno\s*\/\s*s[êe]nior|especialista)\b/i

// ── Eixo 2: densidade técnica em compliance ────────────────────────────────
// Cada termo DISTINTO conta. "Compliance | PLD/FT | LGPD (DPO) | BACEN | CVM"
// descreve alguém muito mais dentro do assunto que um "Compliance" solto.
const TERMOS_NUCLEO: [string, RegExp][] = [
  ['compliance', /\bcompliance\b/i],
  ['PLD/FT', /\b(pld\s*\/?\s*ft|pldft|pld|lavagem de dinheiro|aml|cft)\b/i],
  ['KYC', /\b(kyc|kyb|kye|kyp|kys|know your)\b/i],
  ['auditoria', /\b(auditoria|auditor\w*|audit)\b/i],
  ['controles internos', /\b(controles internos|internal controls|sox|coso)\b/i],
  ['riscos', /\b(riscos?|risk|rcsa)\b/i],
  ['LGPD/DPO', /\b(lgpd|dpo|privacidade|prote[çc][ãa]o de dados|gdpr|encarregad[oa] de dados)\b/i],
  ['governança', /\b(governan[çc]a|grc|integridade|corporate governance)\b/i],
  ['regulatório', /\b(regulat[óo]ri\w*|regulatory|conformidade|normativ\w*)\b/i],
  ['reguladores', /\b(bacen|banco central|cvm|susep|coaf|previc|febraban|bcb)\b/i],
  ['antifraude', /\b(antifraude|anti[- ]?fraude|fraude|fraud|preven[çc][ãa]o a perdas)\b/i],
  ['jurídico', /\b(jur[íi]dic[oa]|legal|advogad[oa]|counsel|societ[áa]ri[oa])\b/i],
  ['ouvidoria', /\b(ouvidoria|ombudsman|canal de den[úu]ncias)\b/i],
  ['anticorrupção', /\b(anticorrup[çc][ãa]o|fcpa|ukba|iso 3700?1|due diligence)\b/i],
]

// ── Eixo 3: gestão documental — a dor que a DAISEE resolve ─────────────────
// Quem já nomeia o acervo no próprio título está a um passo da conversa.
const TERMOS_DOCUMENTAL: [string, RegExp][] = [
  [
    'gestão documental',
    /\b(gest[ãa]o documental|documental|ged|records? management|document management|arquiv[íi]stic[oa]|arquivo)\b/i,
  ],
  ['normativos', /\b(normativ\w*|pol[íi]ticas?|manuais?|procedimentos?)\b/i],
  ['evidências', /\b(evid[êe]ncias?|dossi[êe]s?|comprova[çc][ãa]o|rastreabilidade|trilha de auditoria)\b/i],
  ['contratos', /\b(contratos?|minutas?|clm|contract lifecycle)\b/i],
]

// Adjacentes: dor documental plausível sem ser da área-fim. O Thiago Amorim
// (TI/Regulatory no Daycoval, score 95) entrou por aqui.
const CARGO_ADJACENTE =
  /\b(tecnologia da informa[çc][ãa]o|ti|sistemas|pmo|processos|qualidade|esg|dados|controladoria|cont[áa]bil|fiscal|tribut[áa]ri[oa])\b/i

const SETOR_ALVO =
  /(banco|bancos|banking|servi[çc]os financeiros|financial services|seguro|seguros|insurance|previd[êe]ncia|mercado de capitais|capital markets|cr[ée]dito|investimento|fintech|cooperativa|corretora|c[âa]mbio|pagamentos|meios de pagamento)/i

const SETOR_TECH =
  /(tecnologia da informa[çc][ãa]o|desenvolvimento de software|software|internet|servi[çc]os de informa[çc][ãa]o)/i

// Dono de empresa sem função de compliance é outro ICP: a copy da campanha fala
// de acervo regulatório, que não é a dor de um CEO de tech.
const CARGO_DONO =
  /\b(ceo|chief executive|founder|fundador\w*|cofounder|co-founder|cofundador\w*|owner|propriet[áa]ri[oa]|empres[áa]ri[oa]|mentor|advisor)\b/i

// Vende o que a gente vende: aparece como ALVO por casar com os termos, mas é
// concorrente ou parceiro, não cliente.
const FORNECEDOR =
  /\b(consultoria em compliance|compliance solutions?|govtech|legaltech|regtech|plataforma de (governan[çc]a|compliance)|solu[çc][õo]es? de (compliance|governan[çc]a)|software de (compliance|governan[çc]a)|saas)\b/i

// Exportada para o preparo (lib/qualificacaoPreparo.ts) aplicar a mesma regra a
// quem já está na base. "aut[ôo]nom": com o acento, que é a grafia real, o
// "Profissional autônomo" do Eduardo Mormino passava batido.
export const SEM_EMPREGADOR =
  /(transi[çc][ãa]o de carreira|career transition|open to work|dispon[íi]vel para|aposentad[oa]|aut[ôo]nom[oa]|freelan|n[ãa]o informad[oa])/i

export function triar(f: FichaTriagem): Veredito {
  const motivos: string[] = []
  const cargoTexto = `${f.cargo} ${f.headline}`
  const setorTexto = `${f.setor} ${f.empresa}`
  let pontos = 0

  // Eixo 1 — altura do cargo. O primeiro nível que casar vence, e a lista está
  // em ordem decrescente: "Diretor de Compliance Sênior" pontua como Diretoria,
  // não como Especialista.
  //
  // Olha cargo E headline juntos de propósito: o role que o Sales Navigator
  // devolve vem genérico ou desatualizado com frequência, e é a headline que
  // guarda a verdade — "Consultor financeiro" cuja headline diz "Conselheiro de
  // Administração | Comitês de Auditoria", "Gerente de relacionamento" que na
  // headline é "Head de Ouvidoria".
  const nivelBase = NIVEIS.find((n) => n.re.test(cargoTexto))
  let nivelNome = nivelBase?.nome ?? '—'

  if (INICIO_DE_CARREIRA.test(cargoTexto)) {
    // Precedência sobre o nível base: quem é júnior é júnior, mesmo sendo analista.
    pontos -= 12
    nivelNome = 'Início'
    motivos.push('início de carreira (-12)')
  } else if (nivelBase) {
    pontos += nivelBase.pontos
    motivos.push(`${nivelBase.nome} (${nivelBase.pontos >= 0 ? '+' : ''}${nivelBase.pontos})`)
    // Um Analista Sênior de PLD/FT não é um Analista recém-promovido.
    if (SENIORIDADE_ALTA.test(cargoTexto) && nivelBase.pontos < 14) {
      pontos += 6
      nivelNome = `${nivelBase.nome} sênior`
      motivos.push('senioridade declarada (+6)')
    }
  }

  // Eixo 2 — densidade técnica: cada termo distinto soma, com teto em 5 termos
  // para um headline recheado de buzzword não vencer sozinho.
  const termos = TERMOS_NUCLEO.filter(([, re]) => re.test(cargoTexto)).map(([t]) => t)
  if (termos.length > 0) {
    const p = Math.min(termos.length, 5) * 9
    pontos += p
    motivos.push(`${termos.length} termo(s) de compliance (+${p})`)
  }

  // Eixo 3 — gestão documental, a dor específica da DAISEE.
  const doc = TERMOS_DOCUMENTAL.filter(([, re]) => re.test(cargoTexto)).map(([t]) => t)
  if (doc.length > 0) {
    const p = Math.min(doc.length, 3) * 12
    pontos += p
    motivos.push(`gestão documental: ${doc.join(', ')} (+${p})`)
  }

  if (termos.length === 0 && doc.length === 0 && CARGO_ADJACENTE.test(cargoTexto)) {
    pontos += 12
    motivos.push('função adjacente (+12)')
  }

  if (SETOR_ALVO.test(setorTexto)) {
    pontos += 22
    motivos.push('setor financeiro/regulado (+22)')
  } else if (SETOR_TECH.test(setorTexto) && termos.length === 0) {
    pontos -= 10
    motivos.push('setor de tecnologia sem função de compliance (-10)')
  }

  if (CARGO_DONO.test(cargoTexto) && termos.length === 0) {
    pontos -= 45
    motivos.push('dono/C-level sem função de compliance (-45)')
  }

  if (FORNECEDOR.test(`${cargoTexto} ${setorTexto}`)) {
    pontos -= 35
    motivos.push('parece fornecedor do mesmo mercado (-35)')
  }

  if (SEM_EMPREGADOR.test(`${f.empresa} ${f.headline}`)) {
    pontos -= 60
    motivos.push('sem empregador identificável (-60)')
  }

  const contato: Contato =
    f.grau === 'DISTANCE_1' ? 'CONECTADO' : f.convitePendente ? 'CONVITE_PENDENTE' : 'NOVO'

  const faixa: Faixa = pontos >= 70 ? 'ALVO' : pontos >= 40 ? 'TALVEZ' : 'FORA'
  return { ficha: f, pontos, faixa, contato, nivel: nivelNome, termos: [...termos, ...doc], motivos }
}

// Ficha enxuta para um eventual lote de IA: 225 chars/lead, ~28k tokens nos 500.
export function fichaCurta(f: FichaTriagem) {
  return { n: f.nome, h: f.headline, r: f.cargo, c: f.empresa, s: f.setor, uf: f.uf }
}

// Monta a ficha a partir do registro cru da Unipile. Fica aqui para o relatório
// de triagem e a importação lerem o item do mesmo jeito — se divergirem, o que
// o relatório aprova não é o que a importação grava.
export function fichaDeItemSalesNav(item: {
  headline?: string
  location?: string
  current_positions?: Array<{ company?: string; role?: string; industry?: string[] }>
  pending_invitation?: boolean
  network_distance?: string
  id?: string
}): Omit<FichaTriagem, 'nome'> {
  const p = item.current_positions?.[0] ?? {}
  return {
    headline: item.headline ?? '',
    cargo: p.role ?? '',
    empresa: p.company ?? '',
    setor: p.industry?.[0] ?? '',
    uf: item.location?.split(',').slice(-2)[0]?.trim() ?? '',
    providerId: item.id ?? '',
    convitePendente: Boolean(item.pending_invitation),
    grau: item.network_distance ?? '',
  }
}
