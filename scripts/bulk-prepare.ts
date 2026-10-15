// Processamento em lote: qualifica, enriquece via LinkedIn e gera cadência
// para os leads que ainda não têm cadência com touches.
// Roda local (sem timeout de serverless), direto contra o banco apontado pelo env.
//
// Desde 15/09 o preparo qualifica ANTES de gastar (lib/qualificacaoPreparo.ts):
// ordena pelos pontos da triagem, deixa de fora quem não tem empregador e
// confere o perfil enriquecido antes de gerar a cadência.
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/bulk-prepare.ts --status              (só relatório)
//   npx dotenv -e .env.local -- npx tsx scripts/bulk-prepare.ts --limite 40           (processa)
//
// Filtros opcionais:
//   --faixas ALVO,TALVEZ       só essas faixas da triagem
//   --min-pontos 55            só quem fez N pontos ou mais na triagem
//   --incluir-sem-triagem      com filtro ativo, inclui também quem não passou pela triagem
import { prisma } from '../lib/prisma'
import { enrichLeadFromLinkedIn } from '../lib/enrichment'
import { ensureCadenciaGenerated } from '../lib/cadenciaGeneration'
import {
  bloquearPreparo,
  lerTriagem,
  motivoBloqueioPosEnriquecimento,
  selecionarParaPreparo,
} from '../lib/qualificacaoPreparo'
import type { Faixa } from '../lib/triagemLista'
import { comRetentativaDeBanco, ehErroDeConexao as isDbConnError } from '../lib/dbRetry'

const PAUSE_MS = 3000 // pausa entre leads pra não fazer rajada na Unipile
const DB_RETRY_DELAYS_MS = [10_000, 30_000, 60_000] // backoff quando o Neon cai no meio do lote
const MAX_CONSECUTIVE_DB_FAILURES = 3 // aborta o lote se o banco ficar fora por vários leads seguidos

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// O filtro de erro vive em lib/dbRetry.ts, compartilhado com o send-batch e o
// scheduler. O que existia aqui reconhecia só quatro padrões e deixava passar
// justamente os dois mais frequentes — esgotamento de pool e "Server has closed
// the connection" —, que foram as falhas de 10 e 14/10. Os atrasos continuam
// longos porque aqui o lote dura horas: não adianta insistir de 2 em 2 segundos
// enquanto o Neon ainda está subindo.
const withDbRetry = <T>(label: string, fn: () => Promise<T>) =>
  comRetentativaDeBanco(label, fn, DB_RETRY_DELAYS_MS)

const arg = (nome: string) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : undefined)
const primeiraLinha = (err: unknown) => (err instanceof Error ? err.message : String(err)).split('\n')[0]

async function main() {
  const statusOnly = process.argv.includes('--status')

  const faixas = arg('--faixas')
    ?.split(',')
    .map((f) => f.trim().toUpperCase())
    .filter((f): f is Faixa => f === 'ALVO' || f === 'TALVEZ')
  const minPontosBruto = arg('--min-pontos')
  const minPontos = minPontosBruto !== undefined ? Number(minPontosBruto) : undefined
  if (minPontos !== undefined && Number.isNaN(minPontos)) {
    console.error('--min-pontos precisa de um número, ex.: --min-pontos 55')
    process.exitCode = 1
    return
  }
  const incluirSemTriagem = process.argv.includes('--incluir-sem-triagem') ? true : undefined

  const limiteArg = process.argv.includes('--limite')
    ? Number(process.argv[process.argv.indexOf('--limite') + 1])
    : null
  const limite = limiteArg && limiteArg > 0 ? limiteArg : null

  // Esta era a última consulta fora da rede de novas tentativas: foi ela que
  // derrubou a primeira tentativa de 01/10, e no preparo agendado das 19h a
  // falha significa fila vazia no disparo da manhã seguinte.
  const leads = await comRetentativaDeBanco('bulk-prepare: base', () =>
    prisma.lead.findMany({
      include: { cadencia: { include: { touches: { select: { id: true } } } } },
    })
  )

  const comCadencia = leads.filter((l) => l.cadencia && l.cadencia.touches.length > 0)
  // Fora da automação = trabalhado à mão ou bloqueado para revisão. Antes de
  // 15/09 o preparo não olhava isso e gerava cadência até para esses.
  const foraDaAutomacao = leads.filter((l) => l.excludedFromAutomation && !(l.cadencia && l.cadencia.touches.length > 0))
  const semCadencia = leads.filter((l) => !l.excludedFromAutomation && (!l.cadencia || l.cadencia.touches.length === 0))

  const { elegiveis, fora } = selecionarParaPreparo(semCadencia, { faixas, minPontos, incluirSemTriagem })
  const pending = limite ? elegiveis.slice(0, limite) : elegiveis

  // Cadência com 1-4 touches = geração interrompida no meio. Não regeneramos
  // automaticamente (poderia apagar touch já enviado) — só reportamos.
  const partial = leads.filter((l) => l.cadencia && l.cadencia.touches.length > 0 && l.cadencia.touches.length < 5)

  console.log(`Total de leads: ${leads.length}`)
  console.log(`Com cadência gerada: ${comCadencia.length}`)
  if (partial.length > 0) {
    console.log(`⚠ Cadências PARCIAIS (menos de 5 touches — conferir manualmente): ${partial.map((l) => `${l.name} (${l.cadencia!.touches.length})`).join(', ')}`)
  }
  console.log(`Sem cadência e fora da automação (não entram): ${foraDaAutomacao.length}`)
  console.log(`Sem cadência na automação: ${semCadencia.length} → ${elegiveis.length} elegíveis, ${fora.length} fora do preparo`)
  if (faixas?.length || minPontos !== undefined) {
    console.log(`Filtro: ${[faixas?.length ? `faixas ${faixas.join(',')}` : null, minPontos !== undefined ? `mínimo ${minPontos} pts` : null].filter(Boolean).join(' · ')}`)
  }

  if (fora.length > 0) {
    console.log(`\nFora do preparo (${fora.length}):`)
    for (const { lead, motivo } of fora) console.log(`  - ${lead.name} (${lead.company}) — ${motivo}`)
  }

  if (limite && elegiveis.length > limite) {
    console.log(`\nLimite de ${limite} lead(s) nesta rodada — ${elegiveis.length - limite} ficam para a próxima.`)
  }
  console.log(`\nNa ordem de preparo (${pending.length}):`)
  for (const l of pending) {
    const t = lerTriagem(l.notes)
    const rotulo = t ? `${t.faixa} ${t.pontos}` : 'sem triagem'
    console.log(`  - [${rotulo}] ${l.name} (${l.company})${l.profileText ? ' [perfil já enriquecido]' : ''}${l.linkedinUrl ? '' : ' [SEM linkedinUrl]'}`)
  }

  if (statusOnly || pending.length === 0) return

  console.log(`\nIniciando processamento de ${pending.length} leads...\n`)

  const results: Array<{ name: string; outcome: 'ok' | 'adiado' | 'bloqueado' | 'falhou'; reason?: string }> = []
  let consecutiveDbFailures = 0

  for (const [i, lead] of pending.entries()) {
    if (i > 0) await sleep(PAUSE_MS)
    const label = `[${i + 1}/${pending.length}] ${lead.name}`
    try {
      let profileText = lead.profileText
      let empresaNoPerfil: string | null = lead.company

      if (!profileText) {
        try {
          const enriched = await withDbRetry(label, () => enrichLeadFromLinkedIn(lead, {}))
          profileText = enriched.profileText
          empresaNoPerfil = (enriched.fieldsToUpdate.company as string | undefined) ?? lead.company
          console.log(`${label}: enriquecido (${enriched.updatedFields.length} campos atualizados)`)
        } catch (err) {
          if (isDbConnError(err)) throw err
          // Sem o perfil não há como conferir se a pessoa segue no cargo, e a
          // cadência sairia genérica. Antes seguia para a cadência mesmo assim.
          console.log(`${label}: enriquecimento falhou (${primeiraLinha(err)}) — cadência não gerada, entra de novo na próxima rodada`)
          results.push({ name: lead.name, outcome: 'adiado', reason: `enriquecimento falhou: ${primeiraLinha(err)}` })
          continue
        }
      } else {
        console.log(`${label}: perfil já enriquecido, pulando enrich`)
      }

      const bloqueio = motivoBloqueioPosEnriquecimento({ empresaNaLista: lead.company, empresaNoPerfil, profileText })
      if (bloqueio) {
        await withDbRetry(label, () => bloquearPreparo(lead.id, bloqueio))
        console.log(`${label}: BLOQUEADO — ${bloqueio}. Tirado da automação para revisão.`)
        results.push({ name: lead.name, outcome: 'bloqueado', reason: bloqueio })
        continue
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
      console.log(`${label}: FALHOU — ${primeiraLinha(err)}`)
      results.push({ name: lead.name, outcome: 'falhou', reason: primeiraLinha(err) })
      if (isDbConnError(err)) {
        consecutiveDbFailures++
        if (consecutiveDbFailures >= MAX_CONSECUTIVE_DB_FAILURES) {
          console.log(`\nBanco fora do ar por ${consecutiveDbFailures} leads seguidos (mesmo com retry) — abortando o lote. Rode de novo quando o banco voltar; o script é idempotente.`)
          break
        }
      }
    }
  }

  const porResultado = (o: string) => results.filter((r) => r.outcome === o)
  console.log(`\n===== RESUMO =====`)
  console.log(`${porResultado('ok').length}/${results.length} com cadência gerada.`)
  for (const [outcome, titulo] of [
    ['bloqueado', 'Bloqueados para revisão (tirados da automação)'],
    ['adiado', 'Adiados (enriquecimento falhou)'],
    ['falhou', 'Falhas'],
  ] as const) {
    const lista = porResultado(outcome)
    if (lista.length === 0) continue
    console.log(`${titulo} (${lista.length}):`)
    for (const r of lista) console.log(`  - ${r.name}: ${r.reason}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
