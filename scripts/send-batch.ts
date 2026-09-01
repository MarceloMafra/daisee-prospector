// Dispara o próximo touch (T1 — convite LinkedIn) pros primeiros N leads da lista
// processada hoje, na ordem de criação (mesma ordem exibida no lote), com intervalo
// aleatório de 30-90s entre envios — mesmo comportamento do botão em lote da UI.
// A quota diária (LINKEDIN_INVITES_PER_DAY) é validada pelo próprio sendTouchNow().
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/send-batch.ts [quantidade] --dry-run
//   npx dotenv -e .env.local -- npx tsx scripts/send-batch.ts [quantidade] --apply
//
// Este script ENVIA de verdade. Sem --apply ele só lista quem seria convidado:
// argumento desconhecido aborta, em vez de ser ignorado e virar disparo real.
import { prisma } from '../lib/prisma'
import { sendTouchNow } from '../lib/scheduler'

const FLAGS_CONHECIDAS = new Set(['--dry-run', '--apply', '--pular'])
const extras = process.argv.slice(2).filter((a) => a.startsWith('-'))
const desconhecidas = extras.filter((a) => !FLAGS_CONHECIDAS.has(a))

if (desconhecidas.length) {
  console.error(`Argumento não reconhecido: ${desconhecidas.join(', ')}`)
  console.error('Use --dry-run para simular ou --apply para enviar de verdade.')
  process.exit(1)
}

// Nomes fora desta rodada, sem mexer no banco. Nasceu de um lead cuja cadencia
// foi regenerada no painel: a regeneracao devolve o T1 para AGENDADO e ele
// reentra na fila como se nunca tivesse sido contactado -- prestes a receber a
// mesma mensagem duas vezes. Use --pular "Nome" ate o estado ser corrigido.
const PULAR = process.argv
  .map((a, i) => (a === '--pular' ? process.argv[i + 1] : null))
  .filter((v): v is string => !!v && !v.startsWith('-'))

const APPLY = process.argv.includes('--apply')
const TARGET = parseInt(process.argv.find((a) => /^\d+$/.test(a)) || '10', 10)
const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

async function main() {
  // Elegíveis pra automação, do maior score DAISEE para o menor. A quota diária
  // do LinkedIn é o recurso escasso: com a base grande, gastar os convites de
  // hoje em ordem de importação deixaria diretor de compliance esperando dias
  // atrás de analista. Empate cai na ordem de criação, que preserva a fila antiga.
  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      cadencia: { isNot: null },
    },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: [{ daiseeScore: 'desc' }, { createdAt: 'asc' }],
  })

  // Só leads "frescos": cadência completa (5 touches) e próximo touch é o T1
  // ainda AGENDADO — ou seja, ninguém foi contactado. Cadência parcial fica de fora.
  const candidates = leads.filter((l) => {
    if (PULAR.some((p) => l.name.toLowerCase().includes(p.toLowerCase()))) {
      console.log(`  (pulando ${l.name}: pedido por --pular)`)
      return false
    }
    if (l.cadencia!.touches.length < 5) {
      console.log(`  (pulando ${l.name}: cadência parcial com ${l.cadencia!.touches.length} touches)`)
      return false
    }
    const next = l.cadencia!.touches.find((t) => t.status === 'AGENDADO')
    return next?.sequence === 1
  })

  console.log(`Meta: ${TARGET} envios. Candidatos na fila (maior score primeiro): ${candidates.length}`)
  candidates.slice(0, TARGET + 5).forEach((l, i) =>
    console.log(`  ${i + 1}. ${l.name} (${l.company}) — score ${l.daiseeScore}`)
  )

  if (!APPLY) {
    console.log(`\nDRY-RUN — nada foi enviado.`)
    console.log(`Seriam convidados os ${Math.min(TARGET, candidates.length)} primeiros da lista acima.`)
    console.log(`Para enviar de verdade: repita o comando com --apply`)
    await prisma.$disconnect()
    return
  }

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
