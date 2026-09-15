// Casos da qualificação antes do preparo (lib/qualificacaoPreparo.ts).
//
//   npx dotenv -e .env.local -- npx tsx scripts/testar-qualificacao.ts
import {
  lerTriagem,
  mesmaEmpresa,
  motivoBloqueioPosEnriquecimento,
  selecionarParaPreparo,
  semCargoAtual,
  semEmpregador,
} from '../lib/qualificacaoPreparo'

let falhas = 0
function confere(descricao: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(`${ok ? '✔' : '✘'} ${descricao}${ok ? '' : ` — esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`}`)
}

console.log('— Triagem gravada na importação')
confere('TALVEZ com termos', lerTriagem('Importado do Sales Navigator.\nTriagem: TALVEZ (64 pts) — compliance, riscos'), { faixa: 'TALVEZ', pontos: 64 })
confere('ALVO sem termos', lerTriagem('Triagem: ALVO (82 pts)'), { faixa: 'ALVO', pontos: 82 })
confere('lista sem triagem', lerTriagem('Importado do Sales Navigator (lista "Gestão documental").'), null)
confere('notes nulo', lerTriagem(null), null)

console.log('\n— Mesma empresa escrita de outro jeito')
const empresas: [string, string | null, boolean][] = [
  ['C6Bank', 'C6 Bank', true],
  ['Banco Bmg', 'Bmg', true],
  ['Cooperativa Central Ailos', 'Ailos', true],
  ['Citi Brasil', 'Citi', true],
  ['banco BV', 'Banco BV', true],
  ['Banco PAN', null, true],
  ['Sicoob Coopemata', 'Sicoob Crediguaçu', false],
  ['Compliance Women Committee', 'Banco Inter', false],
]
for (const [a, b, esperado] of empresas) confere(`"${a}" × "${b}"`, mesmaEmpresa(a, b), esperado)

console.log('\n— Sem empregador')
confere('empresa "Não informado"', semEmpregador({ company: 'Não informado', notes: null, seniority: 'Compliance | PLD' }), true)
confere('autônomo com acento', semEmpregador({ company: 'Banco Daycoval', notes: 'Headline: Profissional autônomo em Gerenciamento de Riscos', seniority: '' }), true)
confere('empregado normal', semEmpregador({ company: 'Cielo', notes: 'Headline: Riscos Corporativos | Controles Internos', seniority: '' }), false)

console.log('\n— Cargo atual no perfil enriquecido')
const ATUAL = [
  'Renata Lopes',
  '',
  'Experiência:',
  '- Especialista em crédito — Sicoob Crediguaçu (1/1/2026 — atual)',
  '- Especialista de Riscos e Crédito — Sicoob Coopemata (4/1/2024 — 2/1/2026)',
  '  Condução de análises econômico-financeiras.',
  '',
  'Formação:',
  '- PUC Minas — Bacharel (1/1/2000 — 1/1/2004)',
].join('\n')
const ENCERRADO = [
  'Gabriela',
  '',
  'Experiência:',
  '- Diretora — Compliance Women Committee (1/1/2023 — 6/1/2026)',
  '- Analista — Banco X (1/1/2019 — 1/1/2022)',
  '',
  'Formação:',
  '- USP — MBA (1/1/2025 — atual)',
].join('\n')
confere('cargo em aberto', semCargoAtual(ATUAL), false)
confere('todos encerrados (formação em aberto não conta)', semCargoAtual(ENCERRADO), true)
confere('experiência sem datas não prova nada', semCargoAtual('Nome\n\nExperiência:\n- Gerente — Banco Y'), false)
confere('perfil sem seção de experiência', semCargoAtual('Nome\nHeadline'), false)
confere('cargo com parênteses no título', semCargoAtual('Nome\n\nExperiência:\n- Analista (PLD) — Banco Z (3/1/2025 — atual)'), false)

console.log('\n— Motivo do bloqueio depois de enriquecer')
confere('trocou de empresa', motivoBloqueioPosEnriquecimento({ empresaNaLista: 'Sicoob Coopemata', empresaNoPerfil: 'Sicoob Crediguaçu', profileText: ATUAL })?.startsWith('empresa mudou'), true)
confere('cargo encerrado', motivoBloqueioPosEnriquecimento({ empresaNaLista: 'Compliance Women Committee', empresaNoPerfil: 'Compliance Women Committee', profileText: ENCERRADO })?.includes('cargo encerrado'), true)
confere('segue no cargo', motivoBloqueioPosEnriquecimento({ empresaNaLista: 'Sicoob Crediguaçu', empresaNoPerfil: 'Sicoob Crediguaçu', profileText: ATUAL }), null)

console.log('\n— Seleção e ordem do preparo')
const lead = (name: string, notes: string | null, company = 'Banco X') => ({
  name,
  notes,
  company,
  seniority: '',
  daiseeScore: 40,
  createdAt: new Date('2026-09-01T12:00:00Z'),
})
const base = [
  lead('Talvez 53', 'Triagem: TALVEZ (53 pts)'),
  lead('Alvo 84', 'Triagem: ALVO (84 pts)'),
  lead('Sem triagem', 'Importado do Sales Navigator (lista "Gestão documental").'),
  lead('Não informado', 'Triagem: TALVEZ (45 pts)', 'Não informado'),
  lead('Fora 20', 'Triagem: FORA (20 pts)'),
]
const nomes = (r: ReturnType<typeof selecionarParaPreparo<(typeof base)[number]>>) => ({
  elegiveis: r.elegiveis.map((l) => l.name),
  fora: r.fora.map((f) => `${f.lead.name}: ${f.motivo}`),
})
confere('sem filtro: pontos primeiro, sem triagem no fim', nomes(selecionarParaPreparo(base)), {
  elegiveis: ['Alvo 84', 'Talvez 53', 'Sem triagem'],
  fora: ['Não informado: sem empregador identificável', 'Fora 20: triagem FORA (20 pts)'],
})
confere('--faixas ALVO', nomes(selecionarParaPreparo(base, { faixas: ['ALVO'] })).elegiveis, ['Alvo 84'])
confere('--min-pontos 50 deixa sem triagem de fora', nomes(selecionarParaPreparo(base, { minPontos: 50 })).elegiveis, ['Alvo 84', 'Talvez 53'])
confere('--min-pontos 50 --incluir-sem-triagem', nomes(selecionarParaPreparo(base, { minPontos: 50, incluirSemTriagem: true })).elegiveis, ['Alvo 84', 'Talvez 53', 'Sem triagem'])

if (falhas) {
  console.log(`\n${falhas} caso(s) falharam.`)
  process.exitCode = 1
} else {
  console.log('\nTodos os casos passaram.')
}
