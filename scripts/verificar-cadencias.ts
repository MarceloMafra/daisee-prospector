// Cruza o audit log com o estado atual dos touches e aponta duas patologias:
//
// 1. HISTÓRICO PERDIDO — o audit log prova que o touch saiu, mas o banco o marca
//    AGENDADO. Nasceu do caso de 31/08: regenerar uma cadência no painel apagava
//    TODOS os touches e recriava os cinco como AGENDADO, inclusive os já
//    enviados. Para o banco, o lead virava alguém que nunca foi contactado — e o
//    send-batch o devolvia à fila de primeira mensagem. A raiz está corrigida em
//    lib/cadenciaGeneration.ts; este script encontra o dano que ficou para trás.
//
// 2. ENVIO DUPLICADO — o mesmo touch saiu mais de uma vez. Não é corrigível por
//    script (a mensagem já foi entregue), mas precisa aparecer: em 20/08 o T2 do
//    Felipe Faria da Costa saiu pela segunda vez dois dias DEPOIS de ele
//    responder, o que é exatamente o que a automação não deve fazer.
//
// Uso: ./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/verificar-cadencias.ts [--apply]
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// "T2 (LINKEDIN_500) enviado com sucesso." → 2
function sequenciaDoLog(details: string | null): number | null {
  const m = details?.match(/\bT([1-5])\b/)
  return m ? Number(m[1]) : null
}

async function main() {
  const aplicar = process.argv.includes('--apply')

  const leads = await prisma.lead.findMany({
    include: {
      touches: { orderBy: { sequence: 'asc' } },
      auditLog: { where: { action: 'TOUCH_ENVIADO' }, orderBy: { createdAt: 'asc' } },
    },
  })

  const perdidos: { lead: (typeof leads)[number]; faltando: { sequence: number; quando: Date }[] }[] = []
  const duplicados: { nome: string; sequence: number; datas: Date[] }[] = []

  for (const lead of leads) {
    // Primeiro envio provado de cada sequência.
    const provas = new Map<number, Date[]>()
    for (const log of lead.auditLog) {
      const seq = sequenciaDoLog(log.details)
      if (seq === null) continue
      provas.set(seq, [...(provas.get(seq) ?? []), log.createdAt])
    }

    for (const [seq, datas] of provas) {
      if (datas.length > 1) duplicados.push({ nome: lead.name, sequence: seq, datas })
    }

    const faltando = [...provas.entries()]
      .filter(([seq]) => lead.touches.find((t) => t.sequence === seq)?.status === 'AGENDADO')
      .map(([sequence, datas]) => ({ sequence, quando: datas[0] }))
      .sort((a, b) => a.sequence - b.sequence)

    if (faltando.length > 0) perdidos.push({ lead, faltando })
  }

  console.log(`${leads.length} leads verificados.\n`)

  if (duplicados.length > 0) {
    console.log(`⚠️  ${duplicados.length} touch(es) enviados mais de uma vez:`)
    for (const d of duplicados) {
      console.log(`  ${d.nome} — T${d.sequence} × ${d.datas.length}: ${d.datas.map((x) => x.toISOString().slice(0, 16)).join(', ')}`)
    }
    console.log('  (não corrigível por script — a mensagem já foi entregue)\n')
  }

  if (perdidos.length === 0) {
    console.log('✅ Nenhuma cadência com histórico de envio perdido.')
    return
  }

  console.log(`⚠️  ${perdidos.length} lead(s) com histórico de envio perdido:\n`)
  for (const { lead, faltando } of perdidos.sort((a, b) => b.lead.daiseeScore - a.lead.daiseeScore)) {
    console.log(`  ${lead.name} (${lead.company}) — score ${lead.daiseeScore}, status ${lead.status}`)
    for (const f of faltando) {
      console.log(`    T${f.sequence} saiu em ${f.quando.toISOString()} mas está AGENDADO`)
    }
  }

  console.log(
    '\nEnquanto o T1 estiver AGENDADO, o send-batch e o cron tratam essas pessoas\n' +
      'como nunca contactadas e podem mandar uma segunda primeira-mensagem.'
  )

  if (!aplicar) {
    console.log('\n[dry-run] nada alterado. Use --apply para restaurar o estado real.')
    return
  }

  for (const { lead, faltando } of perdidos) {
    for (const f of faltando) {
      const touch = lead.touches.find((t) => t.sequence === f.sequence)!
      await prisma.touch.update({
        where: { id: touch.id },
        data: { status: 'ENVIADO', sentAt: f.quando },
      })
      console.log(`  ✅ ${lead.name}: T${f.sequence} → ENVIADO em ${f.quando.toISOString()}`)
    }
  }
}

main().finally(() => prisma.$disconnect())
