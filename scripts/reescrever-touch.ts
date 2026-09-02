// Reescreve o texto de um touch AGENDADO à mão, passando pelas mesmas travas do
// envio automático: auditoria de claims, validação de compliance e limite de
// caracteres do canal. Grava TOUCH_EDITADO no audit log.
//
// O texto vem por stdin, para não brigar com aspas e acentos no shell:
//   npx tsx scripts/reescrever-touch.ts --lead "Nome" --seq 2 [--apply] < texto.txt
import { prisma } from '../lib/prisma'
import { violacoesEmTexto } from '../lib/auditoriaClaims'
import { validateMessage } from '../lib/compliance'

const LIMITES: Record<string, number> = { LINKEDIN_250: 200, LINKEDIN_500: 600 }
const CONVENCAO: Record<string, number> = { LINKEDIN_500: 500 }

function arg(nome: string) {
  const i = process.argv.indexOf(nome)
  return i === -1 ? null : process.argv[i + 1]
}

async function lerStdin(): Promise<string> {
  const partes: Buffer[] = []
  for await (const c of process.stdin) partes.push(c as Buffer)
  return Buffer.concat(partes).toString('utf8').trim()
}

async function main() {
  const nome = arg('--lead')
  const seq = Number(arg('--seq'))
  const motivo = arg('--motivo') ?? 'Copy reescrita à mão.'
  const aplicar = process.argv.includes('--apply')

  if (!nome || !seq) throw new Error('uso: --lead "Nome" --seq N [--motivo "..."] [--apply] < texto.txt')

  const texto = await lerStdin()
  if (!texto) throw new Error('nenhum texto recebido no stdin')

  const lead = await prisma.lead.findFirst({
    where: { name: { contains: nome, mode: 'insensitive' } },
    include: { touches: { where: { sequence: seq }, take: 1 } },
  })
  if (!lead) throw new Error(`lead nao encontrado: ${nome}`)

  const touch = lead.touches[0]
  if (!touch) throw new Error(`${lead.name} nao tem touch T${seq}`)
  if (touch.status !== 'AGENDADO') {
    throw new Error(`T${seq} de ${lead.name} esta ${touch.status} — ja saiu, nao da para reescrever`)
  }

  console.log(`${lead.name} (${lead.company}) — T${seq} ${touch.type}`)
  console.log(`\n── ANTES (${touch.content.length} chars) ──\n${touch.content}`)
  console.log(`\n── DEPOIS (${texto.length} chars) ──\n${texto}\n`)

  const violacoes = violacoesEmTexto([touch.subject, texto].filter(Boolean).join('\n'))
  const compliance = validateMessage(texto, touch.type)
  const limite = LIMITES[touch.type]
  const convencao = CONVENCAO[touch.type]

  const bloqueios: string[] = []
  for (const v of violacoes) bloqueios.push(`auditoria: ${v.regra} — ${v.trecho}`)
  if (!compliance.isValid) bloqueios.push(`compliance: ${JSON.stringify(compliance)}`)
  if (limite && texto.length > limite) bloqueios.push(`limite do canal: ${texto.length} > ${limite}`)

  if (bloqueios.length > 0) {
    console.log('❌ REPROVADO:')
    for (const b of bloqueios) console.log(`   ${b}`)
    process.exitCode = 1
    return
  }

  console.log('✅ Passou na auditoria, no compliance e no limite do canal.')
  if (convencao && texto.length > convencao) {
    console.log(`   (${texto.length} chars, acima da convenção de ${convencao} — envia normal)`)
  }

  if (!aplicar) {
    console.log('\n[dry-run] nada gravado. Use --apply')
    return
  }

  await prisma.touch.update({ where: { id: touch.id }, data: { content: texto } })
  await prisma.auditLog.create({
    data: { leadId: lead.id, action: 'TOUCH_EDITADO', details: `T${seq} (${touch.type}) reescrito. ${motivo}` },
  })
  console.log('\n✅ Gravado.')
}

main()
  .catch((e) => {
    console.error(`\n❌ ${e.message}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
