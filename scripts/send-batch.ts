// Dispara o próximo touch (T1 — convite LinkedIn) pros primeiros N leads da lista
// processada hoje, na ordem de criação (mesma ordem exibida no lote), com intervalo
// aleatório de 30-90s entre envios — mesmo comportamento do botão em lote da UI.
// A quota diária (LINKEDIN_INVITES_PER_DAY) é validada pelo próprio sendTouchNow().
//
// Uso: npx dotenv -e .env.local -- npx tsx scripts/send-batch.ts [quantidade]
import { prisma } from '../lib/prisma'
import { sendTouchNow } from '../lib/scheduler'

const TARGET = parseInt(process.argv[2] || '10', 10)
const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

async function main() {
  // Todos os leads elegíveis pra automação, na ordem da lista (ordem de criação).
  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      cadencia: { isNot: null },
    },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })

  // Só leads "frescos": cadência completa (5 touches) e próximo touch é o T1
  // ainda AGENDADO — ou seja, ninguém foi contactado. Cadência parcial fica de fora.
  const candidates = leads.filter((l) => {
    if (l.cadencia!.touches.length < 5) {
      console.log(`  (pulando ${l.name}: cadência parcial com ${l.cadencia!.touches.length} touches)`)
      return false
    }
    const next = l.cadencia!.touches.find((t) => t.status === 'AGENDADO')
    return next?.sequence === 1
  })

  console.log(`Meta: ${TARGET} envios. Candidatos na fila (ordem da lista): ${candidates.length}`)
  candidates.slice(0, TARGET + 5).forEach((l, i) => console.log(`  ${i + 1}. ${l.name} (${l.company})`))

  let sent = 0
  const results: Array<{ name: string; outcome: string }> = []

  for (const lead of candidates) {
    if (sent >= TARGET) break
    const touch = lead.cadencia!.touches.find((t) => t.status === 'AGENDADO')!
    const label = `[${sent + 1}/${TARGET}] ${lead.name}`

    try {
      const result = await sendTouchNow(touch.id)
      // sendTouchNow devolve falha como outcome (não lança) — só conta envio real.
      if (result.outcome === 'enviado') {
        sent++
        console.log(`${label}: T${touch.sequence} (${touch.type}) → enviado ✔`)
        results.push({ name: lead.name, outcome: 'enviado' })
      } else {
        console.log(`${label}: T${touch.sequence} (${touch.type}) → ${result.outcome}${result.reason ? ` — ${result.reason}` : ''}`)
        results.push({ name: lead.name, outcome: `${result.outcome}${result.reason ? `: ${result.reason}` : ''}` })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`${label}: FALHOU — ${msg}`)
      results.push({ name: lead.name, outcome: `falhou: ${msg}` })
      if (/Limite de ritmo atingido/i.test(msg)) {
        console.log('Quota diária atingida — encerrando o lote de envio.')
        break
      }
    }

    if (sent < TARGET) {
      const gap = randomGap()
      console.log(`  aguardando ${Math.round(gap / 1000)}s antes do próximo...`)
      await sleep(gap)
    }
  }

  console.log(`\n===== RESUMO DO DISPARO =====`)
  console.log(`${sent}/${TARGET} convites enviados.`)
  for (const r of results) console.log(`  - ${r.name}: ${r.outcome}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
