// Passa os touches AGENDADOS pela mesma validação de copy que o scheduler aplica
// no momento do envio — pega reprovação e estouro de limite antes do disparo.
import { prisma } from '../lib/prisma'
import { validateMessage } from '../lib/compliance'

// Limites que REPROVAM o envio, iguais aos de lib/compliance.ts. O prompt pede
// 500 no T2, mas isso é convenção de copy: DM de 513 chars já saiu sem erro.
const LIMITES: Record<string, number> = { LINKEDIN_250: 200, LINKEDIN_500: 600 }
const CONVENCAO: Record<string, number> = { LINKEDIN_500: 500 }

async function main() {
  const touches = await prisma.touch.findMany({
    where: { status: 'AGENDADO', lead: { excludedFromAutomation: false } },
    include: { lead: { select: { name: true, company: true, linkedinConnectedAt: true } } },
    orderBy: [{ sequence: 'asc' }],
  })

  const problemas: string[] = []
  const avisos: string[] = []
  for (const t of touches) {
    const v = validateMessage(t.content, t.type)
    const limite = LIMITES[t.type]
    const estourou = limite && t.content.length > limite
    if (!v.isValid || estourou) {
      problemas.push(
        `• ${t.lead.name} (${t.lead.company}) T${t.sequence} ${t.type}` +
          (estourou ? ` — ${t.content.length} chars (limite ${limite})` : '') +
          (!v.isValid ? ` — copy ${v.score}/100: ${v.summary}` : '')
      )
    }

    const acimaDaConvencao = CONVENCAO[t.type] && t.content.length > CONVENCAO[t.type] && !estourou
    if (acimaDaConvencao) {
      avisos.push(`• ${t.lead.name} T${t.sequence} — ${t.content.length} chars (convenção ${CONVENCAO[t.type]}, envia normal)`)
    }
  }

  console.log(`Touches AGENDADOS verificados: ${touches.length}`)
  console.log(`Com problema: ${problemas.length}\n`)
  problemas.forEach((p) => console.log(p))
  if (avisos.length) {
    console.log(`
Acima da convenção de estilo (não bloqueia envio): ${avisos.length}`)
    avisos.forEach((a) => console.log(a))
  }
  await prisma.$disconnect()
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
