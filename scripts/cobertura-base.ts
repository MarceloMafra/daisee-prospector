// Onde cada lead da base está em relação ao convite T1 — inclusive os que o
// relatório do funil não mostra (sem cadência, cadência incompleta, excluídos).
import { prisma } from '../lib/prisma'

async function main() {
  const leads = await prisma.lead.findMany({
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })

  const grupos = new Map<string, string[]>()
  const add = (k: string, v: string) => {
    const a = grupos.get(k) ?? []
    a.push(v)
    grupos.set(k, a)
  }

  for (const l of leads) {
    const rot = `${l.name} (${l.company})`
    const ts = l.cadencia?.touches ?? []
    const t1 = ts.find((t) => t.sequence === 1)

    if (!l.cadencia) { add('SEM CADÊNCIA — precisa gerar', rot); continue }
    if (ts.length === 0) { add('CADÊNCIA VAZIA — precisa gerar touches', rot); continue }
    if (!t1) { add('SEM T1 na cadência', rot); continue }

    if (t1.sentAt) { add('T1 JÁ ENVIADO', rot); continue }
    if (t1.status === 'FALHOU') { add('T1 FALHOU', `${rot} — ${t1.errorMessage?.slice(0, 50) ?? ''}`); continue }
    if (['ENVIADO', 'ENTREGUE', 'RESPONDIDO'].includes(t1.status)) {
      add('T1 marcado enviado SEM data (base antiga)', rot); continue
    }

    const incompleta = ts.length < 5 ? ` [cadência com ${ts.length} touches]` : ''
    if (l.excludedFromAutomation) { add('A ENVIAR — mas fora da automação', `${rot} · ${l.status}${incompleta}`); continue }
    add('A ENVIAR — na fila', rot + incompleta)
  }

  console.log(`BASE: ${leads.length} leads`)
  console.log('='.repeat(70))
  const ordem = [
    'T1 JÁ ENVIADO',
    'T1 marcado enviado SEM data (base antiga)',
    'T1 FALHOU',
    'A ENVIAR — na fila',
    'A ENVIAR — mas fora da automação',
    'SEM CADÊNCIA — precisa gerar',
    'CADÊNCIA VAZIA — precisa gerar touches',
    'SEM T1 na cadência',
  ]
  for (const k of ordem) {
    const v = grupos.get(k)
    if (!v?.length) continue
    console.log(`\n${k}: ${v.length}`)
    if (k !== 'T1 JÁ ENVIADO') v.forEach((x) => console.log(`   • ${x}`))
  }
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
