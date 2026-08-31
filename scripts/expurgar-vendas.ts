/**
 * Expurga as promessas de resultado do kit de vendas herdado do daisee-automation
 * (março/2026), anterior às regras de honestidade da campanha.
 *
 * O que sai: número de eficiência prometido ao lead ("70% de redução no tempo de
 * busca", "90% menos risco", "20h/mês recuperadas", "30 dias até 100% operacional").
 * O 70% existe, mas é o depoimento de UM cliente — vale como referência citada, não
 * como promessa a quem está lendo.
 *
 * O que fica: característica do produto ("100% privada" descreve arquitetura, não
 * promete ganho) e meta interna de pipeline ("FIN 40 → 60 leads"), que é nossa e
 * nunca vai para o lead.
 *
 *   npx tsx scripts/expurgar-vendas.ts            (dry-run)
 *   npx tsx scripts/expurgar-vendas.ts --apply
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { violacoesEmTexto } from '../lib/auditoriaClaims'

const DIR = join(process.cwd(), 'docs', 'vendas')
const apply = process.argv.includes('--apply')

const TROCAS: { de: RegExp; para: string }[] = [
  // O 70% em todas as formas que apareceram no kit.
  { de: /Redução de 70% no tempo de busca de ([^\n*]+)/gi, para: 'Menos tempo localizando $1' },
  { de: /Redução de 70% no tempo de busca ([^\n*]+)/gi, para: 'Menos tempo na busca $1' },
  { de: /70% redução (?:em|no) tempo de busca de ([^\n|]+)/gi, para: 'menos tempo localizando $1' },
  { de: /70% redução (?:em|no|de) tempo de busca ?([^\n|]*)/gi, para: 'menos tempo de busca $1' },
  { de: /70% redução busca/gi, para: 'menos tempo de busca' },
  { de: /Reduziu Tempo de Busca em 70%/gi, para: 'Reduziu o Tempo de Busca' },
  { de: /Perdem 70% do Tempo em Buscas/gi, para: 'Perdem Tempo em Buscas' },

  // Números inventados sobre risco e ganho.
  { de: /90% menos risco de us(?:ar|o de) versão (desatualizada|errada)/gi, para: 'menos risco de usar versão $1' },
  { de: /a métrica "90% menos risco de versão desatualizada"/gi, para: 'o risco de trabalhar sobre versão desatualizada' },
  { de: /20h\/mês recuperadas/gi, para: 'tempo recuperado' },
  { de: /20h\/mês analista/gi, para: 'tempo do analista' },
  { de: /\| 3x onboarding/gi, para: '| onboarding mais rápido' },
  { de: /Analistas sêniores perdem até 20% da jornada localizando documentos \(20h\/mês\)/gi,
    para: 'Quanto da jornada de um analista sênior vai para localizar documentos? (pergunte — não presuma)' },
  { de: /Analistas sêniores perdem até 20% da jornada localizando documentos/gi,
    para: 'Quanto da jornada de um analista sênior vai para localizar documentos? (pergunte — não presuma)' },

  // Formas que escaparam da primeira passada, quase todas dentro de tabelas.
  { de: /Como reduz 20h\/mês de busca/gi, para: 'Como encurta o tempo de busca' },
  { de: /\| Redução Busca \| 70% \| 70% \| 70% \| 70% \| 70% \|/gi,
    para: '| Redução Busca | sim | sim | sim | sim | sim |' },
  { de: /\| Horas\/Mês \| 20h \| 20h \| 20h \| 20h \| 20h \|/gi,
    para: '| Horas/Mês | a apurar | a apurar | a apurar | a apurar | a apurar |' },
  { de: /90% menos risco de versão (desatualizada|errada)/gi, para: 'menos risco de versão $1' },
  { de: /70% redução tempo de busca/gi, para: 'menos tempo de busca' },
  { de: /30 dias operacional/gi, para: 'prazo a combinar' },
  { de: /Demonstrar DAISEE com caso similar do setor/gi,
    para: 'Demonstrar a DAISEE no cenário que o próprio lead descreveu' },

  // Ultima linha de tabela do cheat sheet, com as promessas encadeadas.
  { de: /90% menos risco versão/gi, para: 'menos risco de versão' },
  { de: /Onboarding 3x\+? rápido/gi, para: 'Onboarding mais rápido' },
  { de: /\| 60 dias \|/g, para: '| prazo a combinar |' },

  // Promessa medida em horas. A regra NUMERO so enxergava percentual, entao
  // estas sobreviveram a primeira auditoria.
  { de: /20h\/mês perdidas buscando documentos/gi, para: 'tempo perdido buscando documentos' },
  { de: /De "perdidos 20h\/mês buscando" para operacional em 30 dias/gi,
    para: 'De "perdido procurando documento" para acervo consultável' },
  { de: /Recuperação de ~?20h\/mês por analista de sinistros/gi,
    para: 'Tempo recuperado pelo analista de sinistros' },
  { de: /Analistas perdem 20h\/mês buscando documentos/gi,
    para: 'Quanto tempo os analistas perdem buscando documentos? (pergunte)' },
  { de: /Mencione recuperação de 20h\/mês por analista como métrica/gi,
    para: 'Pergunte quanto tempo o analista gasta procurando documento hoje' },
  { de: /Inclua a métrica "20h\/mês por analista de sinistros"/gi,
    para: 'Pergunte pelo tempo que o analista de sinistros gasta na busca' },
  { de: /"20h\/mês, analista de sinistros"/gi, para: '"tempo do analista de sinistros"' },
  { de: /"20h\/mês, recuperadas"/gi, para: '"tempo recuperado"' },
  { de: /1 grande número\/métrica \(ex: "20h\/mês"\)/gi,
    para: '1 pergunta que force o lead a estimar o próprio custo' },

  // Promessa de prazo de implantação.
  { de: /"30 dias até 100% operacional\. Começa a trazer valor no dia 2[^"]*"/gi,
    para: '"O prazo de implantação depende do volume e do formato do acervo — prefiro te dar um número depois de ver o seu caso."' },
  { de: /30 dias até estar 100% operacional[^"]*/gi,
    para: 'o prazo depende do volume e do formato do acervo' },
]

const CABECALHO = `> **Material revisado em 31/08/2026.** Este kit veio do projeto daisee-automation
> (março/2026), anterior às regras de honestidade da campanha. As promessas de
> resultado foram removidas: não prometemos percentual de redução, prazo de
> implantação nem ganho de eficiência a quem ainda não conhecemos.
>
> **O único número citável** é o depoimento da Dinamica Merchandising — 70% de
> redução no tempo de busca de documentos —, e sempre como o que aquele cliente
> relatou, nunca como promessa ao lead. Faltando case no setor de quem se fala,
> diga que falta e pergunte pelo contexto dele.
>
> A DAISEE é uma IA privada de gestão documental, e a MasterVendas é **parceira**
> da DAISEE, não a desenvolvedora.

`

function main() {
  // O HTML do guia do Sales Navigator tambem carrega promessa; o LEIA-ME fica
  // de fora porque CITA as promessas removidas para explicar o expurgo.
  const arquivos = readdirSync(DIR).filter(
    (f) => /\.(md|txt|html)$/i.test(f) && f !== 'LEIA-ME.md'
  )
  let totalTrocas = 0

  for (const f of arquivos) {
    const caminho = join(DIR, f)
    const antes = readFileSync(caminho, 'utf-8')
    let depois = antes
    const aplicadas: string[] = []

    for (const t of TROCAS) {
      t.de.lastIndex = 0
      const achados = depois.match(t.de)
      if (!achados) continue
      depois = depois.replace(t.de, t.para)
      aplicadas.push(`${achados.length}× ${achados[0].slice(0, 46)}`)
      totalTrocas += achados.length
    }

    if (!depois.startsWith('>')) {
      // O cabeçalho entra depois do título, para não empurrar o H1 para baixo.
      const linhas = depois.split('\n')
      const iTitulo = linhas.findIndex((l) => l.startsWith('#'))
      if (iTitulo >= 0) {
        linhas.splice(iTitulo + 1, 0, '', CABECALHO.trimEnd())
        depois = linhas.join('\n')
      } else {
        depois = CABECALHO + depois
      }
    }

    // Audita o CORPO, sem o cabecalho: ele cita a Dinamica, e a excecao do
    // depoimento vale para o texto inteiro -- com ele dentro, qualquer numero
    // remanescente passaria despercebido.
    const corpo = depois.replace(CABECALHO.trimEnd(), '')
    // Meta de pipeline e leitura de mercado sao numeros NOSSOS, de planejamento
    // interno -- nunca vao para o lead. A regra NUMERO existe para promessa de
    // resultado, entao esses ficam.
    // Percentual em CSS (color-mix, border-radius) nao e promessa nenhuma.
    const INTERNO = /(leads|penetra[çc][ãa]o|META|BASE ATUAL|meta anual|color-mix|border-radius|srgb)/i
    const restantes = violacoesEmTexto(corpo).filter(v => !INTERNO.test(v.trecho))
    console.log(
      `${f.padEnd(38)} ${aplicadas.length ? aplicadas.length + ' regra(s)' : 'nada a trocar'}` +
        `  → auditoria: ${restantes.length ? restantes.map((v) => v.regra).join(',') : 'limpa'}`
    )
    aplicadas.forEach((a) => console.log('    · ' + a))
    if (restantes.length) restantes.forEach((v) => console.log('    ⚠ ' + v.regra + ': ' + v.trecho.slice(0, 110)))

    if (apply) writeFileSync(caminho, depois, 'utf-8')
  }

  console.log(`\n${totalTrocas} substituição(ões) ${apply ? 'gravadas' : 'a aplicar'}.`)
  if (!apply) console.log('Repita com --apply para gravar.')
}

main()
