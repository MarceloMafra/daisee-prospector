// Grava no banco os horários livres da agenda do Marcelo (o "espelho"), para o
// painel sugerir horário que existe mesmo sem credencial do Google.
//
// Quem lê a agenda é o Claude, pelo conector do Google Calendar, e passa aqui
// os compromissos em JSON pela entrada padrão:
//
//   [{"inicio":"2026-10-06T14:00:00-03:00","fim":"2026-10-06T15:00:00-03:00","titulo":"Koredata"}]
//
//   npx dotenv -e .env.local -- npx tsx scripts/espelhar-agenda.ts < ocupados.json
//   npx dotenv -e .env.local -- npx tsx scripts/espelhar-agenda.ts --ver
//
// Validade: lib/agenda.ts descarta espelho com mais de 14 horas — melhor a
// sugestão sair sem horário do que oferecer um horário que já foi tomado.
import { prisma } from '../lib/prisma'
import {
  CHAVE_ESPELHO,
  ESPELHO_VALIDADE_H,
  formatarHorario,
  horariosLivres,
  salvarEspelhoDaAgenda,
  type Ocupado,
} from '../lib/agenda'

async function mostrarAtual() {
  const linha = await prisma.config.findUnique({ where: { chave: CHAVE_ESPELHO } })
  if (!linha) {
    console.log('Nenhum espelho gravado ainda.')
    return
  }
  const e = JSON.parse(linha.valor) as { horarios: string[]; conferidaEm: string }
  const idade = (Date.now() - new Date(e.conferidaEm).getTime()) / 3_600_000
  console.log(`Conferida em ${new Date(e.conferidaEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (há ${idade.toFixed(1)}h · validade ${ESPELHO_VALIDADE_H}h)`)
  for (const h of e.horarios) console.log(`  • ${h}`)
}

async function lerEntrada(): Promise<string> {
  const pedacos: Buffer[] = []
  for await (const p of process.stdin) pedacos.push(p as Buffer)
  return Buffer.concat(pedacos).toString('utf8').trim()
}

async function main() {
  if (process.argv.includes('--ver')) {
    await mostrarAtual()
    return
  }

  const bruto = await lerEntrada()
  if (!bruto) {
    console.error('Passe os compromissos em JSON pela entrada padrão (ou use --ver).')
    process.exitCode = 1
    return
  }

  const lista = JSON.parse(bruto) as { inicio: string; fim: string; titulo?: string }[]
  const ocupados: Ocupado[] = lista.map((o) => ({ inicio: new Date(o.inicio), fim: new Date(o.fim), titulo: o.titulo }))
  const invalidos = ocupados.filter((o) => Number.isNaN(o.inicio.getTime()) || Number.isNaN(o.fim.getTime()))
  if (invalidos.length) {
    console.error(`${invalidos.length} compromisso(s) com data inválida — nada foi gravado.`)
    process.exitCode = 1
    return
  }

  const quantos = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 4)
  const datas = horariosLivres(ocupados, { agora: new Date(), quantos })
  if (datas.length === 0) {
    console.error('Nenhum horário livre encontrado na janela — espelho não gravado.')
    process.exitCode = 1
    return
  }

  await salvarEspelhoDaAgenda(datas)
  console.log(`Espelho gravado com ${datas.length} horários, a partir de ${ocupados.length} compromissos:`)
  for (const d of datas) console.log(`  • ${formatarHorario(d)}`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
