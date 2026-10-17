// Onda de follow-up para quem aceitou o convite e não respondeu (ver lib/ondaFollowup.ts).
//
// Uso:
//   dotenv -e .env.local -- npx tsx scripts/onda-followup.ts --canal linkedin --dry-run
//   dotenv -e .env.local -- npx tsx scripts/onda-followup.ts --canal linkedin --amostra 5
//   dotenv -e .env.local -- npx tsx scripts/onda-followup.ts --canal linkedin --apply [--limite 40]
//   dotenv -e .env.local -- npx tsx scripts/onda-followup.ts --canal email --apply
//
//   --dry-run  lista quem entraria, sem gerar texto nem gravar nada
//   --amostra  gera N textos (usa a IA) e imprime, sem gravar nem enviar
//   --apply    ENVIA DE VERDADE
//
// Mesmas proteções do send-batch: ordem por maior score, pausa de 30-90s entre
// envios, auditoria de copy antes de cada envio (reprovado é pulado), teto
// diário, janela de horário e nova checagem de resposta imediatamente antes de
// enviar. Argumento desconhecido aborta, em vez de virar disparo real.
import { prisma } from '../lib/prisma'
import { comRetentativaDeBanco } from '../lib/dbRetry'
import { sendLinkedInDM, sendEmail } from '../lib/unipile'
import {
  elegivelDm,
  elegivelEmail,
  gerarFollowup,
  corpoDoEmail,
  SEQUENCIA_DM,
  SEQUENCIA_EMAIL,
  type LeadParaOnda,
} from '../lib/ondaFollowup'

const FLAGS_COM_VALOR = new Set(['--canal', '--amostra', '--limite', '--pular'])
const FLAGS_SOLTAS = new Set(['--dry-run', '--apply'])
const args = process.argv.slice(2)

const desconhecidas = args.filter((a) => {
  if (!a.startsWith('-')) return false
  return !FLAGS_COM_VALOR.has(a) && !FLAGS_SOLTAS.has(a)
})
if (desconhecidas.length) {
  console.error(`Argumento não reconhecido: ${desconhecidas.join(', ')}`)
  process.exit(1)
}

const valor = (flag: string) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

const CANAL = valor('--canal')
if (CANAL !== 'linkedin' && CANAL !== 'email') {
  console.error('Informe --canal linkedin ou --canal email.')
  process.exit(1)
}
const APPLY = args.includes('--apply')
const DRY = args.includes('--dry-run')
const AMOSTRA = valor('--amostra') ? parseInt(valor('--amostra')!, 10) : 0
if ([APPLY, DRY, AMOSTRA > 0].filter(Boolean).length !== 1) {
  console.error('Use exatamente um modo: --dry-run, --amostra N ou --apply.')
  process.exit(1)
}
const LIMITE = parseInt(valor('--limite') ?? '40', 10)
const PULAR = args.map((a, i) => (a === '--pular' ? args[i + 1] : null)).filter((v): v is string => !!v)

const TIPO = CANAL === 'linkedin' ? 'LINKEDIN_FOLLOWUP' : 'EMAIL_FOLLOWUP'
const CANAL_DB = CANAL === 'linkedin' ? 'LINKEDIN' : 'EMAIL'
const SEQUENCIA = CANAL === 'linkedin' ? SEQUENCIA_DM : SEQUENCIA_EMAIL
const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000
const FORA_DO_DIA = new Date('2099-01-01T00:00:00Z') // o scheduler automático nunca pega

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const gap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))
const hora = () => new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
const log = (m: string) => console.log(`[${hora()}] ${m}`)

function inicioDoDiaBR() {
  const br = new Date(Date.now() - 3 * 3_600_000)
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate(), 3, 0, 0))
}

function foraDaJanela() {
  const br = new Date(Date.now() - 3 * 3_600_000)
  const min = br.getUTCHours() * 60 + br.getUTCMinutes()
  return min < 8 * 60 || min > 20 * 60 + 30
}

type LeadOnda = LeadParaOnda & { cadenciaId?: string }

async function carregarLeads(): Promise<LeadOnda[]> {
  const leads = await comRetentativaDeBanco('onda-followup: fila', () =>
    prisma.lead.findMany({
      where: { excludedFromAutomation: false, linkedinConnectedAt: { not: null } },
      select: {
        id: true,
        name: true,
        company: true,
        seniority: true,
        email: true,
        daiseeScore: true,
        linkedinProviderId: true,
        linkedinConnectedAt: true,
        excludedFromAutomation: true,
        profileText: true,
        _count: { select: { interacoes: true } },
        cadencia: {
          select: { id: true, touches: { select: { type: true, status: true, sentAt: true, content: true, subject: true } } },
        },
      },
    })
  )
  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    seniority: l.seniority,
    email: l.email,
    daiseeScore: l.daiseeScore,
    linkedinProviderId: l.linkedinProviderId,
    linkedinConnectedAt: l.linkedinConnectedAt,
    excludedFromAutomation: l.excludedFromAutomation,
    profileText: l.profileText,
    interacoes: l._count.interacoes,
    touches: (l.cadencia?.touches ?? []) as LeadParaOnda['touches'],
    cadenciaId: l.cadencia?.id,
  }))
}

async function respondeuAgora(leadId: string) {
  const [n, r] = await Promise.all([
    prisma.interacao.count({ where: { leadId } }),
    prisma.touch.count({ where: { leadId, status: 'RESPONDIDO' } }),
  ])
  return n + r > 0
}

async function main() {
  const todos = await carregarLeads()
  const elegivel = CANAL === 'linkedin' ? elegivelDm : elegivelEmail
  const motivos = new Map<string, number>()
  const fila = todos
    .filter((l) => {
      if (PULAR.some((p) => l.name.toLowerCase().includes(p.toLowerCase()))) return false
      const v = elegivel(l)
      if (!v.ok) motivos.set(v.motivo!, (motivos.get(v.motivo!) ?? 0) + 1)
      return v.ok
    })
    .sort((a, b) => b.daiseeScore - a.daiseeScore)

  log(`Canal ${CANAL}: ${fila.length} elegíveis de ${todos.length} conectados.`)
  for (const [m, n] of [...motivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   fora: ${n} — ${m}`)

  const jaHoje = await prisma.touch.count({
    where: { type: TIPO as never, status: { in: ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] }, sentAt: { gte: inicioDoDiaBR() } },
  })
  const restante = Math.max(0, LIMITE - jaHoje)
  log(`Enviados hoje neste canal: ${jaHoje}. Meta do lote: ${LIMITE}. Restam ${restante}.`)

  if (DRY) {
    fila.slice(0, restante).forEach((l, i) => console.log(`${String(i + 1).padStart(3)}. ${l.name} (${l.company}) — score ${l.daiseeScore}`))
    console.log('\nDRY-RUN — nada foi gerado nem enviado.')
    return
  }

  if (AMOSTRA > 0) {
    for (const l of fila.slice(0, AMOSTRA)) {
      const t = await gerarFollowup(l, CANAL_DB)
      console.log(`\n── ${l.name} · ${l.seniority} · ${l.company} (score ${l.daiseeScore})`)
      if (t.assunto) console.log(`Assunto: ${t.assunto}`)
      console.log(CANAL === 'email' ? corpoDoEmail(t.conteudo) : t.conteudo)
      console.log(`[${t.conteudo.length} caracteres${t.corrigido ? ', corrigido pela auditoria' : ''}] ${t.violacoes.length ? '⚠ REPROVADO: ' + t.violacoes.map((v) => v.regra).join(', ') : '✓ auditoria ok'}`)
    }
    console.log('\nAMOSTRA — nada foi gravado nem enviado.')
    return
  }

  // --apply
  let enviados = 0
  let pulados = 0
  for (const l of fila) {
    if (enviados >= restante) break
    if (foraDaJanela()) {
      log('Fora da janela de envio (08:00–20:30, Brasília). Encerrando o lote.')
      break
    }
    const cadenciaId = l.cadenciaId
    if (!cadenciaId) continue

    const t = await gerarFollowup(l, CANAL_DB)
    if (!t.conteudo || t.violacoes.length) {
      pulados++
      log(`[${enviados + 1}/${restante}] ${l.name}: PULADO pela auditoria — ${t.violacoes.map((v) => v.regra).join(', ') || 'texto vazio'}`)
      continue
    }
    const corpo = CANAL === 'email' ? corpoDoEmail(t.conteudo) : t.conteudo

    // Cria o touch fora do alcance do scheduler automático antes de enviar: se algo
    // falhar depois do envio, a próxima rodada vê o touch pendente e NÃO repete.
    const touch = await prisma.touch.create({
      data: {
        leadId: l.id,
        cadenciaId,
        sequence: SEQUENCIA,
        type: TIPO as never,
        channel: CANAL_DB,
        content: corpo,
        subject: t.assunto,
        status: 'AGENDADO',
        scheduledFor: FORA_DO_DIA,
      },
    })

    if (await respondeuAgora(l.id)) {
      await prisma.touch.delete({ where: { id: touch.id } })
      pulados++
      log(`[${enviados + 1}/${restante}] ${l.name}: respondeu há instantes — não enviado.`)
      continue
    }

    try {
      const ref =
        CANAL === 'linkedin'
          ? (await sendLinkedInDM({ providerId: l.linkedinProviderId!, text: corpo })).chat_id
          : (await sendEmail({ to: l.email!, subject: t.assunto, body: corpo })).tracking_id
      try {
        await prisma.touch.update({ where: { id: touch.id }, data: { status: 'ENVIADO', sentAt: new Date(), providerRef: ref } })
        await prisma.auditLog.create({ data: { leadId: l.id, action: 'TOUCH_ENVIADO', details: `Onda follow-up (${TIPO}) enviado.` } })
      } catch (e) {
        console.error(`⚠⚠ ENVIADO MAS NÃO GRAVADO: ${l.name} (touch ${touch.id}). Não reenviar. ${e}`)
      }
      enviados++
      log(`[${enviados}/${restante}] ${l.name}: ${TIPO} → enviado ✔`)
    } catch (e) {
      const motivo = e instanceof Error ? e.message : String(e)
      await prisma.touch.update({ where: { id: touch.id }, data: { status: 'FALHOU', errorMessage: motivo } })
      log(`[${enviados + 1}/${restante}] ${l.name}: FALHOU — ${motivo}`)
    }

    if (enviados < restante) {
      const g = gap()
      log(`  aguardando ${Math.round(g / 1000)}s...`)
      await sleep(g)
    }
  }
  log(`\n===== RESUMO =====\n${enviados} enviados, ${pulados} pulados (auditoria ou resposta recente).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
