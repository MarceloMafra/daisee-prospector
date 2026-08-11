import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

async function main() {
  const [email, password, name] = process.argv.slice(2)

  if (!email || !password || !name) {
    console.error('Uso: pnpm create-user <email> <senha> "<nome>"')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name },
    create: { email: email.toLowerCase(), passwordHash, name },
  })

  console.log(`Conta criada/atualizada: ${user.email} (${user.name})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
