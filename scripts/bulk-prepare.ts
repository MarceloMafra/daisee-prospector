// Processamento em lote: enriquecimento via LinkedIn (melhor esforço) + geração
// de cadência pra todo lead que ainda não tem cadência com touches.
// Roda local (sem timeout de serverless), direto contra o banco apontado pelo env.
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/bulk-prepare.ts --status   (só relatório)
//   npx dotenv -e .env.local -- npx tsx scripts/bulk-prepare.ts           (processa)
import { prisma } from '../lib/prisma'
import { enrichLeadFromLinkedIn } from '../lib/enrichment'
import { ensureCadenciaGenerated } from '../lib/cadenciaGeneration'

const PAUSE_MS = 3000 // pausa entre leads pra não fazer rajada na Unipile
const DB_RETRY_DELAYS_MS = [10_000, 30_000, 60_000] // backoff quando o Neon cai no meio do lote
const MAX_CONSECUTIVE_DB_FAILURES = 3 // aborta o lote se o banco ficar fora por vários leads seguidos

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isDbConnError = (err: unknown) =>
  err instanceof Error && /Can't reach database server|Connection terminated|ECONNRESET|ETIMEDOUT/i.test(err.message)

// Executa fn; em erro de conexão com o banco, espera e tenta de novo (backoff).
async function withDbRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= DB_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isDbConnError(err) || attempt === DB_RETRY_DELAYS_MS.length) throw err
      const wait = DB_RETRY_DELAYS_MS[attempt]
      console.log(`${label}: banco inacessível, aguardando ${wait / 1000}s pra tentar de novo (tentativa ${attempt + 2})...`)
      await sleep(wait)
    }
  }
  throw lastErr
}

async function main() {
  const statusOnly = process.argv.includes('--status')

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'asc' },
    include: { cadencia: { include: { touches: { select: { id: true } } } } },
  })

  const pending = leads.filter((l) => !l.cadencia || l.cadencia.touches.length === 0)
  const done = leads.length - pending.length
  // Cadência com 1-4 touches = geração interrompida no meio. Não regeneramos
  // automaticamente (poderia apagar touch já enviado) — só reportamos.
  const partial = leads.filter((l) => l.cadencia && l.cadencia.touches.length > 0 && l.cadencia.touches.length < 5)

  console.log(`Total de leads: ${leads.length}`)
  console.log(`Com cadência gerada: ${done}`)
  if (partial.length > 0) {
    console.log(`⚠ Cadências PARCIAIS (menos de 5 touches — conferir manualmente): ${partial.map((l) => `${l.name} (${l.cadencia!.touches.length})`).join(', ')}`)
  }
  console.log(`Pendentes (sem cadência ou sem touches): ${pending.length}`)
  for (const l of pending) {
    console.log(`  - ${l.name} (${l.company})${l.profileText ? ' [perfil já enriquecido]' : ''}${l.linkedinUrl ? '' : ' [SEM linkedinUrl]'}`)
  }

  if (statusOnly || pending.length === 0) return

  console.log(`\nIniciando processamento de ${pending.length} leads...\n`)

  const results: Array<{ name: string; outcome: 'ok' | 'falhou'; reason?: string }> = []
  let consecutiveDbFailures = 0

  for (const [i, lead] of pending.entries()) {
    const label = `[${i + 1}/${pending.length}] ${lead.name}`
    try {
      if (!lead.profileText) {
        try {
          const enriched = await withDbRetry(label, () => enrichLeadFromLinkedIn(lead, {}))
          console.log(`${label}: enriquecido (${enriched.updatedFields?.length ?? 0} campos atualizados)`)
        } catch (err) {
          console.log(`${label}: enriquecimento falhou (${err instanceof Error ? err.message : err}) — seguindo pra cadência mesmo assim`)
        }
      } else {
        console.log(`${label}: perfil já enriquecido, pulando enrich`)
      }

      const touches = await withDbRetry(label, () => ensureCadenciaGenerated(lead.id, 'CONSULTIVO'))
      if (touches === null) {
        console.log(`${label}: cadência já existia com touches — nada a fazer`)
      } else {
        console.log(`${label}: cadência gerada com ${touches.length} touches ✔`)
      }
      results.push({ name: lead.name, outcome: 'ok' })
      consecutiveDbFailures = 0
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.log(`${label}: FALHOU — ${reason.split('\n')[0]}`)
      results.push({ name: lead.name, outcome: 'falhou', reason: reason.split('\n')[0] })
      if (isDbConnError(err)) {
        consecutiveDbFailures++
        if (consecutiveDbFailures >= MAX_CONSECUTIVE_DB_FAILURES) {
          console.log(`\nBanco fora do ar por ${consecutiveDbFailures} leads seguidos (mesmo com retry) — abortando o lote. Rode de novo quando o banco voltar; o script é idempotente.`)
          break
        }
      }
    }

    if (i < pending.length - 1) await sleep(PAUSE_MS)
  }

  const ok = results.filter((r) => r.outcome === 'ok').length
  const failed = results.filter((r) => r.outcome === 'falhou')
  console.log(`\n===== RESUMO =====`)
  console.log(`${ok}/${results.length} processados com sucesso.`)
  if (failed.length > 0) {
    console.log(`Falhas (${failed.length}):`)
    for (const f of failed) console.log(`  - ${f.name}: ${f.reason}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
