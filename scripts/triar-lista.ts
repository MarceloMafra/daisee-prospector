// Tria uma lista do Sales Navigator sem enriquecer perfil e sem ler o summary —
// só com o que a própria lista devolve. Custo: 1 chamada à Unipile, zero de IA.
//
//   npx tsx scripts/triar-lista.ts [--lista <id|url|ALL>] [--max 500] [--faixa ALVO] [--csv saida.csv]
//
// A revisão é por GRUPO, não lead a lead: cada um sai com a pontuação e o motivo.
import { fetchAllSalesNavLeadListMembers, getSalesNavFullName } from '../lib/unipile'
import { triar, type FichaTriagem, type Veredito } from '../lib/triagemLista'
import { prisma } from '../lib/prisma'
import { writeFileSync } from 'fs'

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null)
const extrairId = (e: string) => (e.match(/\/lists\/people\/(\d+)/) || e.match(/(\d{6,})/))?.[1] ?? e

async function main() {
  const bruto = arg('--lista') ?? 'ALL'
  const listId = bruto === 'ALL' ? 'ALL' : extrairId(bruto)
  const max = Number(arg('--max') ?? 500)
  const faixaFiltro = arg('--faixa')
  const csv = arg('--csv')

  console.log(`Lista: ${listId} (teto ${max})\n`)
  const itens: any[] = await fetchAllSalesNavLeadListMembers(listId, max)

  // Quem já está na base não precisa de triagem.
  const base = await prisma.lead.findMany({ select: { linkedinProviderId: true, name: true } })
  const idsNaBase = new Set(base.map((b) => b.linkedinProviderId).filter(Boolean))
  const nomesNaBase = new Set(base.map((b) => b.name.toLowerCase()))

  const vereditos: Veredito[] = []
  let jaNaBase = 0

  for (const i of itens) {
    const nome = getSalesNavFullName(i)
    if (!nome || !i.id) continue
    if (idsNaBase.has(i.id) || nomesNaBase.has(nome.toLowerCase())) {
      jaNaBase++
      continue
    }
    const p = i.current_positions?.[0] ?? {}
    const ficha: FichaTriagem = {
      nome,
      headline: i.headline ?? '',
      cargo: p.role ?? '',
      empresa: p.company ?? '',
      setor: p.industry?.[0] ?? '',
      uf: i.location?.split(',').slice(-2)[0]?.trim() ?? '',
      providerId: i.id,
      convitePendente: Boolean(i.pending_invitation),
      grau: i.network_distance ?? '',
    }
    vereditos.push(triar(ficha))
  }

  vereditos.sort((a, b) => b.pontos - a.pontos)

  const porFaixa = (f: string) => vereditos.filter((v) => v.faixa === f)
  console.log('='.repeat(78))
  console.log(`Na lista ............ ${itens.length}`)
  console.log(`Já na base .......... ${jaNaBase}`)
  console.log(`Triados ............. ${vereditos.length}`)
  console.log(`  ALVO  (>= 60) ..... ${porFaixa('ALVO').length}`)
  console.log(`  TALVEZ (30-59) .... ${porFaixa('TALVEZ').length}`)
  console.log(`  FORA  (< 30) ...... ${porFaixa('FORA').length}`)
  console.log('='.repeat(78))

  for (const faixa of ['ALVO', 'TALVEZ', 'FORA'] as const) {
    if (faixaFiltro && faixa !== faixaFiltro) continue
    const grupo = porFaixa(faixa)
    if (grupo.length === 0) continue
    console.log(`\n${'─'.repeat(78)}\n${faixa} — ${grupo.length} lead(s)\n${'─'.repeat(78)}`)
    // FORA é longo e serve só para conferir que nada bom caiu fora: mostra uma amostra.
    const mostrar = faixa === 'FORA' && !faixaFiltro ? grupo.slice(0, 15) : grupo
    for (const v of mostrar) {
      console.log(
        `${String(v.pontos).padStart(4)}  ${v.ficha.nome.slice(0, 28).padEnd(29)} ${v.ficha.empresa.slice(0, 24).padEnd(25)} ${v.ficha.cargo.slice(0, 34)}`
      )
      console.log(`      ${v.motivos.join(' · ')}`)
    }
    if (mostrar.length < grupo.length) {
      console.log(`      … e mais ${grupo.length - mostrar.length}. Use --faixa FORA para ver todos.`)
    }
  }

  if (csv) {
    const linhas = [
      'pontos,faixa,nome,empresa,cargo,setor,uf,headline,motivos',
      ...vereditos.map((v) =>
        [v.pontos, v.faixa, v.ficha.nome, v.ficha.empresa, v.ficha.cargo, v.ficha.setor, v.ficha.uf, v.ficha.headline, v.motivos.join(' | ')]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ]
    writeFileSync(csv, linhas.join('\n'), 'utf8')
    console.log(`\nCSV: ${csv}`)
  }
}

main()
  .catch((e) => {
    console.error(`❌ ${e.message}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
