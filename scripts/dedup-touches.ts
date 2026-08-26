import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const apply = process.argv.includes('--apply')

async function main() {
  const cads = await p.cadencia.findMany({
    include: { lead: { select: { name: true } }, touches: { orderBy: { createdAt: 'asc' } } },
  })
  for (const c of cads) {
    const seqs = c.touches.map(t => t.sequence)
    if (new Set(seqs).size === seqs.length) continue

    // Mantém o lote mais recente inteiro; touches já enviados nunca entram na poda.
    const maisRecente = c.touches.reduce((a, t) => (t.createdAt > a ? t.createdAt : a), c.touches[0].createdAt)
    const janela = 5000 // o mesmo lote grava em poucos milissegundos
    const manter = c.touches.filter(
      t => t.status !== 'AGENDADO' || maisRecente.getTime() - t.createdAt.getTime() < janela
    )
    const remover = c.touches.filter(t => !manter.some(m => m.id === t.id))

    console.log(c.lead.name + ': ' + c.touches.length + ' → ' + manter.length + ' (remove ' + remover.length + ')')
    remover.forEach(t => console.log('   remove T' + t.sequence + ' de ' + t.createdAt.toISOString().slice(11, 19) + ' [' + t.status + ']'))
    manter.forEach(t => console.log('   mantém T' + t.sequence + ' de ' + t.createdAt.toISOString().slice(11, 19) + ' [' + t.status + ']'))

    if (apply && remover.length) {
      await p.touch.deleteMany({ where: { id: { in: remover.map(t => t.id) } } })
      console.log('   → removidos')
    }
  }
  if (!apply) console.log('\nDRY-RUN. Repita com --apply.')
}
main().finally(() => p.$disconnect())
