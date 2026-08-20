// Dump JSON de todos os touches ainda não enviados — rede de segurança antes de
// qualquer regeneração em lote. Restaura com scripts/restaurar-touches.ts.
import { prisma } from '../lib/prisma'
import * as fs from 'fs'

async function main() {
  const destino = process.argv[2]
  if (!destino) {
    console.error('uso: tsx scripts/backup-touches.ts <arquivo.json>')
    process.exit(1)
  }

  const touches = await prisma.touch.findMany({
    where: { status: 'AGENDADO' },
    select: {
      id: true, leadId: true, cadenciaId: true, sequence: true,
      subject: true, content: true, status: true,
      lead: { select: { name: true, company: true } },
    },
    orderBy: [{ leadId: 'asc' }, { sequence: 'asc' }],
  })

  fs.writeFileSync(destino, JSON.stringify(touches, null, 2), 'utf8')
  console.log(`${touches.length} touches AGENDADOS salvos em ${destino}`)
  await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
