// Restaura content/subject dos touches a partir de um dump de backup-touches.ts.
// Só toca em touch que ainda está AGENDADO — nunca reescreve algo já enviado.
import { prisma } from '../lib/prisma'
import * as fs from 'fs'

async function main() {
  const origem = process.argv[2]
  const apply = process.argv.includes('--apply')
  if (!origem) {
    console.error('uso: tsx scripts/restaurar-touches.ts <arquivo.json> [--apply] [--lead "Nome"]')
    process.exit(1)
  }
  const soLead = process.argv.includes('--lead')
    ? process.argv[process.argv.indexOf('--lead') + 1]
    : null

  const dump: any[] = JSON.parse(fs.readFileSync(origem, 'utf8'))
  const alvo = soLead
    ? dump.filter((t) => (t.lead?.name ?? '').toLowerCase().includes(soLead.toLowerCase()))
    : dump

  console.log(`${alvo.length} touches no dump${soLead ? ` para "${soLead}"` : ''} — ${apply ? 'RESTAURANDO' : 'DRY-RUN'}`)

  let restaurados = 0
  for (const t of alvo) {
    const atual = await prisma.touch.findUnique({ where: { id: t.id } })
    if (!atual || atual.status !== 'AGENDADO') continue
    if (atual.content === t.content && atual.subject === t.subject) continue
    if (apply) {
      await prisma.touch.update({ where: { id: t.id }, data: { content: t.content, subject: t.subject } })
    }
    restaurados++
    console.log(`  ${apply ? '↩' : '·'} ${t.lead?.name} T${t.sequence}`)
  }

  console.log(`${apply ? 'Restaurados' : 'Seriam restaurados'}: ${restaurados}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
