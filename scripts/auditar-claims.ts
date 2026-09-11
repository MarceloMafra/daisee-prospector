// Auditoria read-only dos touches ainda não enviados, procurando as violações
// das regras de honestidade (lib/claude.ts): case em setor que não atendemos,
// número de resultado inventado e DAISEE descrita como automação.
//
// Uso: npx dotenv -e .env.local -- npx tsx scripts/auditar-claims.ts [--lead "Nome"]
import { prisma } from '../lib/prisma'
import { violacoesEmTexto, textoDoTouch, type RegraId } from '../lib/auditoriaClaims'

const argLead = process.argv.includes('--lead')
  ? process.argv[process.argv.indexOf('--lead') + 1]
  : null

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      ...(argLead ? { name: { contains: argLead, mode: 'insensitive' as const } } : {}),
    },
    include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
    orderBy: { createdAt: 'asc' },
  })

  type Achado = {
    lead: string
    empresa: string
    aguardaT2: boolean
    aguardaAceite: boolean
    seq: number
    canal: string
    regras: string[]
    trechos: string[]
  }

  const achados: Achado[] = []

  for (const lead of leads) {
    const touches = lead.cadencia?.touches ?? []
    if (!touches.length) continue

    const t1 = touches.find((t) => t.sequence === 1)
    const t2 = touches.find((t) => t.sequence === 2)
    const respondeu = touches.some((t) => t.status === 'RESPONDIDO')
    const t1Saiu = !!t1?.sentAt
    const aguardaT2 = !!lead.linkedinConnectedAt && !respondeu && t2?.status === 'AGENDADO'
    const aguardaAceite = t1Saiu && !lead.linkedinConnectedAt

    for (const t of touches) {
      if (t.status !== 'AGENDADO') continue
      const vs = violacoesEmTexto(textoDoTouch(t))
      if (!vs.length) continue

      achados.push({
        lead: lead.name,
        empresa: lead.company ?? '—',
        aguardaT2,
        aguardaAceite,
        seq: t.sequence,
        canal: t.channel,
        regras: vs.map((v) => v.regra),
        trechos: vs.map((v) => `[${v.regra}] ${v.trecho}`),
      })
    }
  }

  const porLead = new Map<string, Achado[]>()
  for (const a of achados) {
    const arr = porLead.get(a.lead) ?? []
    arr.push(a)
    porLead.set(a.lead, arr)
  }

  const grupos: [string, [string, Achado[]][]][] = [
    ['🔴 FILA DE T2 — aceitaram e a DM está agendada', [...porLead].filter(([, v]) => v.some((a) => a.aguardaT2))],
    ['🟠 AGUARDANDO ACEITE DO CONVITE', [...porLead].filter(([, v]) => !v.some((a) => a.aguardaT2) && v.some((a) => a.aguardaAceite))],
    ['🟡 DEMAIS LEADS', [...porLead].filter(([, v]) => !v.some((a) => a.aguardaT2) && !v.some((a) => a.aguardaAceite))],
  ]

  console.log('═'.repeat(70))
  console.log('AUDITORIA DE CLAIMS — touches AGENDADOS')
  console.log('═'.repeat(70))
  console.log(`Leads verificados ....... ${leads.length}`)
  console.log(`Touches com violação .... ${achados.length}`)
  console.log(`Leads afetados .......... ${porLead.size}`)
  // Todas as seis regras, nao so tres. INTENCAO ficava de fora do resumo e era
  // justamente a inegociavel: quem lia o cabecalho nao via o "Sem compromisso".
  const REGRAS: RegraId[] = ['CASE', 'NUMERO', 'AUTOMACAO', 'REPERTORIO', 'AUTORIA', 'INTENCAO']
  for (const r of REGRAS) {
    console.log(`  ${r.padEnd(22, '.')} ${achados.filter((a) => a.regras.includes(r)).length}`)
  }

  const detalhe = !process.argv.includes('--resumo')

  for (const [titulo, grupo] of grupos) {
    if (!grupo.length) continue
    console.log(`\n${'═'.repeat(70)}\n${titulo} — ${grupo.length} lead(s)\n${'═'.repeat(70)}`)
    for (const [nome, itens] of grupo) {
      console.log(`\n• ${nome} (${itens[0].empresa})`)
      for (const a of itens) {
        console.log(`   T${a.seq} ${a.canal} · ${a.regras.join(' + ')}`)
        if (detalhe) for (const tr of a.trechos) console.log(`      ${tr}`)
      }
    }
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
