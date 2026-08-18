// Dispara o T2 (DM de follow-up no LinkedIn) pros leads indicados por nome,
// com intervalo aleatório de 30-90s entre envios. Travas de segurança:
// só envia se o lead está conectado (linkedinConnectedAt), o T2 está AGENDADO
// e o T1 não está RESPONDIDO (lead que respondeu sai da cadência — conversa é
// humana). A quota diária de DMs é validada pelo próprio sendTouchNow().
//
// Uso: npx dotenv -e .env.local -- npx tsx scripts/send-t2.ts "Marcela Ikeda" "Katia Caruso" ...
import { prisma } from '../lib/prisma'
import { sendTouchNow } from '../lib/scheduler'

const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

async function main() {
  const names = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  if (names.length === 0) {
    console.log('Informe os nomes dos leads. Ex.: npx tsx scripts/send-t2.ts "Marcela Ikeda" "Katia Caruso"')
    process.exitCode = 1
    return
  }

  let sent = 0
  for (const [i, name] of names.entries()) {
    const lead = await prisma.lead.findFirst({
      where: { name: { contains: name } },
      include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    })
    const label = `[${i + 1}/${names.length}] ${lead?.name ?? name}`

    if (!lead || !lead.cadencia) {
      console.log(`${label}: lead/cadência não encontrado — pulando`)
      continue
    }
    const t1 = lead.cadencia.touches.find((t) => t.sequence === 1)
    const t2 = lead.cadencia.touches.find((t) => t.sequence === 2)
    if (!lead.linkedinConnectedAt) {
      console.log(`${label}: não está conectado — pulando`)
      continue
    }
    if (t1?.status === 'RESPONDIDO') {
      console.log(`${label}: T1 RESPONDIDO (conversa humana em curso) — pulando`)
      continue
    }
    if (!t2 || t2.status !== 'AGENDADO') {
      console.log(`${label}: T2 ${t2?.status ?? 'inexistente'} — pulando`)
      continue
    }

    try {
      const result = await sendTouchNow(t2.id)
      if (result.outcome === 'enviado') {
        sent++
        console.log(`${label}: T2 enviado ✔`)
      } else {
        console.log(`${label}: ${result.outcome}${result.reason ? ` — ${result.reason}` : ''}`)
      }
    } catch (err) {
      console.log(`${label}: FALHOU — ${err instanceof Error ? err.message : err}`)
    }

    if (i < names.length - 1) {
      const gap = randomGap()
      console.log(`  aguardando ${Math.round(gap / 1000)}s antes do próximo...`)
      await sleep(gap)
    }
  }

  console.log(`\n${sent}/${names.length} T2 enviados.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
