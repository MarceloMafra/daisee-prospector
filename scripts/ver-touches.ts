// Mostra na íntegra os touches de um lead — para revisão humana do texto.
import { prisma } from '../lib/prisma'
import { violacoesEmTexto, textoDoTouch } from '../lib/auditoriaClaims'

async function main() {
  const nome = process.argv[2]
  const lead = await prisma.lead.findFirst({
    where: { name: { contains: nome, mode: 'insensitive' } },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
  })
  if (!lead) { console.log('lead não encontrado'); await prisma.$disconnect(); return }

  console.log(`${lead.name} — ${lead.company} — ${lead.seniority}\n${'═'.repeat(70)}`)
  for (const t of lead.cadencia?.touches ?? []) {
    const vs = violacoesEmTexto(textoDoTouch(t))
    console.log(`\n── T${t.sequence} · ${t.channel} · ${t.status}${vs.length ? ' · ⚠ ' + vs.map((v) => v.regra).join('+') : ' · ✓'}`)
    if (t.subject) console.log(`Assunto: ${t.subject}`)
    console.log(t.content)
    for (const v of vs) console.log(`   ⚠ [${v.regra}] ${v.trecho}`)
  }
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
