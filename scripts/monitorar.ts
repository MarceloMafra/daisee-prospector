// Monitor de interações rodado sob demanda, com relatório legível no terminal.
// Detecta respostas novas de leads no LinkedIn, gera a sugestão de réplica e
// registra para revisão. Nenhuma mensagem é enviada ao lead por aqui.
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/monitorar.ts            (grava + notifica)
//   npx dotenv -e .env.local -- npx tsx scripts/monitorar.ts --dry-run  (só mostra)
import { prisma } from '../lib/prisma'
import { monitorarInteracoes } from '../lib/monitorInteracoes'

const TEMP_ICON: Record<string, string> = {
  QUENTE: '🔥',
  MORNO: '🌤',
  FRIO: '❄',
  NEGATIVO: '⛔',
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? 'Modo simulação — nada será gravado.\n' : 'Varrendo conversas...\n')

  const r = await monitorarInteracoes({ dryRun })

  console.log(`Conversas varridas: ${r.chatsVarridos}`)
  console.log(`Respostas novas de leads: ${r.novasInteracoes}`)
  console.log(`Sugestões geradas: ${r.sugestoesGeradas}`)

  if (r.respondidasPorFora.length) {
    const total = r.respondidasPorFora.reduce((s, x) => s + x.quantas, 0)
    console.log(`
Pendências fechadas por resposta enviada fora do painel: ${total}`)
    for (const x of r.respondidasPorFora) console.log(`   • ${x.lead} (${x.quantas})`)
  }

  for (const d of r.detalhes) {
    console.log('\n' + '═'.repeat(70))
    console.log(`${TEMP_ICON[d.temperatura] || ''} ${d.lead} (${d.company}) — ${d.temperatura}`)
    console.log('═'.repeat(70))
    console.log(`\nELE(A) ESCREVEU:\n"${d.mensagem}"`)
    console.log(`\nLEITURA: ${d.leitura}`)
    console.log(`\n➜ SUGESTÃO DE RESPOSTA:\n${d.sugestao}`)
  }

  if (r.falhas.length) {
    console.log(`\n⚠ Falhas (${r.falhas.length}):`)
    for (const f of r.falhas) console.log(`   • ${f.lead}: ${f.motivo}`)
  }

  if (r.novasInteracoes === 0) {
    console.log('\nNenhuma resposta nova desde a última verificação.')
  } else if (!dryRun) {
    console.log(`\n✔ ${r.detalhes.length} interação(ões) registrada(s) — visíveis na ficha do lead no painel.`)
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
