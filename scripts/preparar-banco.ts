/**
 * Aplica o que o `prisma db push` não cria: extensões do Postgres.
 *
 * O projeto não usa migrações versionadas, então um banco novo (ambiente de
 * teste, restauração de backup) nasce sem a extensão unaccent e a busca de
 * leads volta a ignorar acento. Rodar depois do db push resolve.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/preparar-banco.ts
 *
 * É idempotente: rodar de novo não muda nada.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const arquivo = join(process.cwd(), 'prisma', 'sql', 'extensoes.sql')
  const sql = readFileSync(arquivo, 'utf-8')

  // Uma instrução por vez: $executeRawUnsafe não aceita múltiplos comandos.
  const comandos = sql
    .split(';')
    .map(c => c.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean)

  for (const comando of comandos) {
    console.log('→ ' + comando)
    await prisma.$executeRawUnsafe(comando)
  }

  const instaladas = await prisma.$queryRawUnsafe<{ extname: string }[]>(
    'SELECT extname FROM pg_extension ORDER BY extname'
  )
  console.log('\nExtensões no banco: ' + instaladas.map(e => e.extname).join(', '))

  // Prova de que a busca sem acento funciona — se a extensão faltar, isto quebra.
  const teste = await prisma.$queryRawUnsafe<{ ok: boolean }[]>(
    "SELECT unaccent('Câmbio') ILIKE unaccent('%cambio%') AS ok"
  )
  console.log('Busca ignorando acento: ' + (teste[0].ok ? 'ok' : 'FALHOU'))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
