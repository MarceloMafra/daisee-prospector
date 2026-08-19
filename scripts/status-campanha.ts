// Relatório read-only do funil de prospecção: o que foi enviado, quem aceitou,
// quem respondeu e — o mais importante — quais leads estão esperando ação.
//
// Uso: npx dotenv -e .env.local -- npx tsx scripts/status-campanha.ts
import { prisma } from '../lib/prisma'

const d = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : '—')

async function main() {
  const leads = await prisma.lead.findMany({
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })

  const comCadencia = leads.filter((l) => l.cadencia && l.cadencia.touches.length > 0)
  const t1 = (l: (typeof comCadencia)[number]) => l.cadencia!.touches.find((t) => t.sequence === 1)
  const t2 = (l: (typeof comCadencia)[number]) => l.cadencia!.touches.find((t) => t.sequence === 2)
  const foi = (s?: string) => s === 'ENVIADO' || s === 'ENTREGUE' || s === 'RESPONDIDO'

  // Só conta como convite da campanha o T1 que o sistema realmente disparou
  // (tem sentAt). Leads da base antiga entraram marcados como enviados, sem data.
  const convidados = comCadencia.filter((l) => foi(t1(l)?.status) && t1(l)?.sentAt)
  const conectados = convidados.filter((l) => l.linkedinConnectedAt)
  const responderam = comCadencia.filter((l) =>
    l.cadencia!.touches.some((t) => t.status === 'RESPONDIDO')
  )
  const t2Enviado = conectados.filter((l) => foi(t2(l)?.status))
  // Ação imediata: aceitou o convite, não respondeu ainda e o T2 segue parado.
  const aguardandoT2 = conectados.filter(
    (l) => !foi(t2(l)?.status) && !responderam.includes(l) && !l.excludedFromAutomation
  )
  const aguardandoAceite = convidados.filter((l) => !l.linkedinConnectedAt)
  const filaT1 = comCadencia.filter(
    (l) => !l.excludedFromAutomation && t1(l)?.status === 'AGENDADO' && l.cadencia!.touches.length >= 5
  )
  const emNegociacao = leads.filter((l) => l.excludedFromAutomation && l.status !== 'PROSPECTANDO')

  const pct = (n: number, base: number) => (base ? ` (${Math.round((n / base) * 100)}%)` : '')

  console.log('═'.repeat(64))
  console.log('FUNIL DA CAMPANHA')
  console.log('═'.repeat(64))
  console.log(`Leads na base ................ ${leads.length}`)
  console.log(`Convites T1 enviados ......... ${convidados.length}`)
  console.log(`Conexões aceitas ............. ${conectados.length}${pct(conectados.length, convidados.length)}`)
  console.log(`DMs T2 enviadas .............. ${t2Enviado.length}`)
  console.log(`Responderam .................. ${responderam.length}${pct(responderam.length, convidados.length)}`)
  console.log(`Fila de T1 restante .......... ${filaT1.length}`)

  if (responderam.length) {
    console.log(`\n🔥 RESPONDERAM — conversa humana (cadência pausada)`)
    for (const l of responderam) {
      const qual = l.cadencia!.touches.filter((t) => t.status === 'RESPONDIDO').map((t) => `T${t.sequence}`).join(', ')
      console.log(`   • ${l.name} (${l.company}) — respondeu ${qual}`)
    }
  }

  if (emNegociacao.length) {
    console.log(`\n🤝 EM NEGOCIAÇÃO — fora da automação`)
    for (const l of emNegociacao) console.log(`   • ${l.name} (${l.company}) — ${l.status}`)
  }

  if (aguardandoT2.length) {
    console.log(`\n⚡ AÇÃO: aceitaram e ainda não receberam o T2`)
    for (const l of aguardandoT2) {
      console.log(`   • ${l.name} (${l.company}) — conectou ${d(l.linkedinConnectedAt)}`)
    }
    console.log(`   → npx dotenv -e .env.local -- npx tsx scripts/send-t2.ts ${aguardandoT2.map((l) => `"${l.name.split(' ').slice(0, 2).join(' ')}"`).join(' ')}`)
  }

  if (t2Enviado.length) {
    console.log(`\n✉  T2 ENVIADO — aguardando resposta`)
    for (const l of t2Enviado) console.log(`   • ${l.name} (${l.company}) — DM em ${d(t2(l)!.sentAt)}`)
  }

  console.log(`\n⏳ AGUARDANDO ACEITE DO CONVITE (${aguardandoAceite.length})`)
  for (const l of aguardandoAceite) console.log(`   • ${l.name} (${l.company}) — convite em ${d(t1(l)!.sentAt)}`)

  const falhas = comCadencia.filter((l) => l.cadencia!.touches.some((t) => t.status === 'FALHOU'))
  if (falhas.length) {
    console.log(`\n⚠  TOUCHES QUE FALHARAM`)
    for (const l of falhas) {
      for (const t of l.cadencia!.touches.filter((x) => x.status === 'FALHOU')) {
        console.log(`   • ${l.name}: T${t.sequence} — ${(t.errorMessage || '').split('\n')[0].slice(0, 90)}`)
      }
    }
  }

  console.log(`\n📋 PRÓXIMOS NA FILA DE CONVITE`)
  for (const l of filaT1.slice(0, 10)) console.log(`   • ${l.name} (${l.company})`)
  if (filaT1.length > 10) console.log(`   … e mais ${filaT1.length - 10}`)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
