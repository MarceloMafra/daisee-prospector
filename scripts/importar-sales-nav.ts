// Importa leads de uma lista salva do Sales Navigator.
//   --lista ALL          varre todas as listas salvas (padrão)
//   --lista <id|url>     uma lista específica; aceita a URL do Sales Navigator
//   --nome "..."         nome da lista, só para registrar na ficha do lead
//   --apply              grava (sem isso, é relatório e nada é criado)
import { prisma } from '../lib/prisma'
import { importarListaSalesNav } from '../lib/importSalesNav'

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null)

// aceita tanto o id quanto a URL: .../sales/lists/people/1234567890
function extrairId(entrada: string): string {
  const m = entrada.match(/\/lists\/people\/(\d+)/) || entrada.match(/(\d{6,})/)
  return m ? m[1] : entrada
}

async function main() {
  const bruto = arg('--lista') ?? 'ALL'
  const listId = bruto === 'ALL' ? 'ALL' : extrairId(bruto)
  const listName = arg('--nome') ?? undefined
  const apply = process.argv.includes('--apply')

  console.log(`Lista: ${listId}${listName ? ` ("${listName}")` : ''} — ${apply ? 'IMPORTANDO' : 'DRY-RUN'}\n`)

  const r = await importarListaSalesNav(listId, { listName, dryRun: !apply })

  console.log('='.repeat(72))
  console.log(`Encontrados na lista ..... ${r.total}`)
  console.log(`Já existem na base ....... ${r.duplicados}`)
  console.log(`Sem id ou nome (pulados) . ${r.pulados}`)
  console.log(`NOVOS .................... ${r.novos.length}`)
  if (apply) console.log(`Criados .................. ${r.importados}`)

  if (r.novos.length) {
    const porEmpresa = new Map<string, number>()
    for (const n of r.novos) porEmpresa.set(n.company, (porEmpresa.get(n.company) ?? 0) + 1)

    console.log(`\nNOVOS LEADS`)
    console.log('-'.repeat(72))
    for (const n of [...r.novos].sort((a, b) => b.score - a.score)) {
      console.log(
        `  ${String(n.score).padStart(3)}  ${n.name.slice(0, 26).padEnd(27)} ${n.company.slice(0, 24).padEnd(25)} ${n.seniority.slice(0, 38)}`
      )
    }
    console.log(`\nEmpresas distintas: ${porEmpresa.size}`)
    const media = Math.round(r.novos.reduce((s, n) => s + n.score, 0) / r.novos.length)
    console.log(`Score DAISEE médio: ${media}`)
  }

  if (r.erros.length) {
    console.log(`\nERROS (${r.erros.length})`)
    r.erros.slice(0, 10).forEach((e) => console.log(`  • ${e.name}: ${e.error}`))
  }

  if (!apply) console.log(`\nNada gravado. Rode de novo com --apply para importar.`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
