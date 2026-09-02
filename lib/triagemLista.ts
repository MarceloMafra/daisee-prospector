// Triagem de uma lista do Sales Navigator usando SÓ os dados que a própria lista
// devolve — headline, cargo, empresa, setor e localização. Nada de enriquecer
// perfil, que custa uma chamada por lead, nem de ler o summary, que multiplica
// por cinco o texto sem melhorar a decisão de "esse é do público ou não".
//
// A saída não é um sim/não: é uma pontuação com o MOTIVO de cada ponto, para a
// revisão ser por grupo em vez de um a um.

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

export interface Veredito {
  ficha: FichaTriagem
  pontos: number
  faixa: 'ALVO' | 'TALVEZ' | 'FORA'
  motivos: string[]
}

// Função de compliance/riscos: o público que a campanha atual atende.
const CARGO_NUCLEO =
  /\b(compliance|pld\s*\/?\s*ft|pldft|\bpld\b|\baml\b|\bkyc\b|\bkyb\b|lavagem de dinheiro|auditoria|auditor|controles internos|\briscos?\b|\brisk\b|\blgpd\b|\bdpo\b|privacidade|prote[çc][ãa]o de dados|governan[çc]a|\bgrc\b|integridade|regulat[óo]ri|\bregulatory\b|\bsox\b|\bcoso\b|ouvidoria|jur[íi]dic|\blegal\b|conformidade|anticorrup[çc][ãa]o|\bcvm\b|\bbacen\b|\bsusep\b|\bcoaf\b)\b/i

// Adjacentes: dor documental plausível sem ser da área-fim. O Thiago Amorim
// (TI/Regulatory no Daycoval, score 95) entrou por aqui.
const CARGO_ADJACENTE =
  /\b(gest[ãa]o documental|documenta[çc][ãa]o|arquivo|processos|qualidade|\bpmo\b|\besg\b|\bti\b|sistemas|tecnologia da informa[çc][ãa]o|dados|contratos?|\bfiscal\b|tribut[áa]ri|cont[áa]bil|controladoria)\b/i

const SENIORIDADE =
  /\b(head|diretor|director|superintendente|gerente|manager|coordenador|coordinator|supervisor|especialista|chefe|l[íi]der|lead|\bcco\b|\bcro\b|\bcfo\b|\bclo\b|s[óo]cio|partner)\b/i

// Setor do EMPREGADOR, não do lead: é o que separa "compliance num banco" de
// "compliance numa agência de marketing".
const SETOR_ALVO =
  /(banco|bancos|banking|servi[çc]os financeiros|financial services|seguro|seguros|insurance|previd[êe]ncia|mercado de capitais|capital markets|cr[ée]dito|investimento|fintech|cooperativa|corretora|c[âa]mbio|pagamentos|meios de pagamento)/i

const SETOR_TECH = /(tecnologia da informa[çc][ãa]o|desenvolvimento de software|software|internet|servi[çc]os de informa[çc][ãa]o|\bti\b)/i

// Cargo de dono de empresa: sem função de compliance, é outro ICP inteiro — a
// copy da campanha fala de acervo regulatório, que não é a dor de um CEO.
const CARGO_DONO =
  /\b(ceo|chief executive|founder|fundador|cofounder|co-founder|cofundador|presidente|owner|propriet[áa]ri|empres[áa]ri|mentor|conselheir|board member|advisor)\b/i

const SEM_EMPREGADOR =
  /(transi[çc][ãa]o de carreira|career transition|open to work|dispon[íi]vel para|aposentad|autonom|freelan|n[ãa]o informad|^consultant$|^consultoria$)/i

export function triar(f: FichaTriagem): Veredito {
  const motivos: string[] = []
  let pontos = 0

  const cargoTexto = `${f.cargo} ${f.headline}`
  const nucleo = CARGO_NUCLEO.exec(cargoTexto)
  const adjacente = CARGO_ADJACENTE.exec(cargoTexto)

  if (nucleo) {
    pontos += 50
    motivos.push(`função-núcleo: "${nucleo[0]}"`)
  } else if (adjacente) {
    pontos += 20
    motivos.push(`função adjacente: "${adjacente[0]}"`)
  }

  const setor = `${f.setor} ${f.empresa}`
  if (SETOR_ALVO.test(setor)) {
    pontos += 30
    motivos.push('setor financeiro/regulado')
  } else if (SETOR_TECH.test(setor)) {
    pontos -= 10
    motivos.push('setor de tecnologia')
  }

  if (SENIORIDADE.test(cargoTexto)) {
    pontos += 10
    motivos.push('cargo com senioridade')
  }

  // Dono de empresa SEM função de compliance é o ICP errado. Com função de
  // compliance (um sócio de consultoria de GRC, por exemplo), continua valendo.
  if (CARGO_DONO.test(cargoTexto) && !nucleo) {
    pontos -= 45
    motivos.push('dono/C-level sem função de compliance')
  }

  if (SEM_EMPREGADOR.test(`${f.empresa} ${f.headline}`)) {
    pontos -= 60
    motivos.push('sem empregador identificável')
  }

  if (f.convitePendente) {
    pontos -= 100
    motivos.push('convite já pendente')
  }

  const faixa = pontos >= 60 ? 'ALVO' : pontos >= 30 ? 'TALVEZ' : 'FORA'
  return { ficha: f, pontos, faixa, motivos }
}

// Ficha enxuta para o lote de IA: 225 chars/lead, ~28k tokens nos 500.
export function fichaCurta(f: FichaTriagem) {
  return { n: f.nome, h: f.headline, r: f.cargo, c: f.empresa, s: f.setor, uf: f.uf }
}
