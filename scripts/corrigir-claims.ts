// Regenera os touches AGENDADOS de leads cuja cadência foi gerada antes das
// regras de honestidade entrarem no prompt. Preserva tudo que já foi enviado.
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/corrigir-claims.ts --escopo fila-t2 --dry-run
//   npx dotenv -e .env.local -- npx tsx scripts/corrigir-claims.ts --escopo fila-t2 --apply
//
// Escopos: fila-t2 | aguardando-aceite | ambos | todos
import { prisma } from '../lib/prisma'
import { regenerarTouchesPendentes } from '../lib/cadenciaGeneration'
import { violacoesEmTexto, textoDoTouch } from '../lib/auditoriaClaims'

const arg = (nome: string) =>
  process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : null

const escopo = arg('--escopo') ?? 'fila-t2'
const apply = process.argv.includes('--apply')
const soLead = arg('--lead')

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      ...(soLead ? { name: { contains: soLead, mode: 'insensitive' as const } } : {}),
    },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })

  const selecionados = leads.filter((lead) => {
    const touches = lead.cadencia?.touches ?? []
    if (!touches.length) return false

    // Só entra quem tem violação de verdade em algum touch ainda não enviado.
    const sujo = touches.some(
      (t) => t.status === 'AGENDADO' && violacoesEmTexto(textoDoTouch(t)).length > 0
    )
    if (!sujo) return false

    const t1 = touches.find((t) => t.sequence === 1)
    const t2 = touches.find((t) => t.sequence === 2)
    const respondeu = touches.some((t) => t.status === 'RESPONDIDO')
    const filaT2 = !!lead.linkedinConnectedAt && !respondeu && t2?.status === 'AGENDADO'
    const aguardandoAceite = !!t1?.sentAt && !lead.linkedinConnectedAt

    if (escopo === 'fila-t2') return filaT2
    if (escopo === 'aguardando-aceite') return aguardandoAceite
    if (escopo === 'ambos') return filaT2 || aguardandoAceite
    return true // todos
  })

  console.log('═'.repeat(70))
  console.log(`CORREÇÃO DE CLAIMS — escopo "${escopo}" — ${apply ? 'APLICANDO' : 'DRY-RUN'}`)
  console.log('═'.repeat(70))
  console.log(`Leads selecionados: ${selecionados.length}\n`)

  for (const l of selecionados) {
    const touches = l.cadencia!.touches
    const pend = touches.filter((t) => t.status === 'AGENDADO')
    const env = touches.filter((t) => t.status !== 'AGENDADO')
    const sujos = pend.filter((t) => violacoesEmTexto(textoDoTouch(t)).length > 0)
    console.log(
      `• ${l.name} (${l.company}) — regenera T${pend.map((t) => t.sequence).join(',T')}` +
        ` · preserva T${env.map((t) => t.sequence).join(',T') || '—'}` +
        ` · sujos: T${sujos.map((t) => t.sequence).join(',T')}`
    )
  }

  if (!apply) {
    console.log(`\nNada gravado. Rode de novo com --apply para regenerar.`)
    await prisma.$disconnect()
    return
  }

  console.log(`\n${'─'.repeat(70)}\nRegenerando…\n`)
  let ok = 0
  const falhas: string[] = []

  for (const l of selecionados) {
    try {
      const r = await regenerarTouchesPendentes(l.cadencia!.id, (l.cadencia!.tone as any) ?? 'CONSULTIVO')
      const restaram = await prisma.touch.findMany({
        where: { cadenciaId: l.cadencia!.id, status: 'AGENDADO' },
        orderBy: { sequence: 'asc' },
      })
      const aindaSujos = restaram.filter((t) => violacoesEmTexto(textoDoTouch(t)).length > 0)

      ok++
      console.log(
        `✓ ${l.name} — ${r.atualizados.length} touch(es) reescrito(s), ${r.preservados} preservado(s)` +
          (r.semGerado.length ? ` · ⚠ sem substituto para T${r.semGerado.join(',T')}` : '') +
          (aindaSujos.length ? ` · ⚠ AINDA SUJO em T${aindaSujos.map((t) => t.sequence).join(',T')}` : '')
      )
    } catch (e) {
      falhas.push(l.name)
      console.log(`✗ ${l.name} — ${(e as Error).message}`)
    }
  }

  console.log(`\n${'═'.repeat(70)}`)
  console.log(`Concluídos: ${ok}/${selecionados.length}`)
  if (falhas.length) console.log(`Falharam: ${falhas.join(', ')}`)
  console.log(`Confira com: npx dotenv -e .env.local -- npx tsx scripts/auditar-claims.ts`)

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
