// Cruza o banco com o histórico REAL de mensagens do LinkedIn.
//
// Por que existe: o banco só sabe o que passou pelo sistema. Quando alguém
// envia um T2 à mão pelo próprio LinkedIn — como aconteceu em 10/09 com 11
// leads — o touch continua AGENDADO e o lead volta para a fila de T2. Na
// prática, ele fica na iminência de receber a mesma mensagem duas vezes.
//
// scripts/verificar-cadencias.ts NÃO pega este caso: ele compara o banco com o
// audit log, e envio manual não gera audit log nenhum. A única fonte da verdade
// aqui é o inbox do LinkedIn.
//
// Uso:
//   ./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/conferir-envios-linkedin.ts
//   ... scripts/conferir-envios-linkedin.ts --apply   (reconcilia o banco)
//
// Sem --apply é só relatório. Com --apply, cada touch divergente recebe o texto
// realmente entregue, o status ENVIADO, a data de verdade e um TOUCH_RECONCILIADO
// no audit log.
//
// Rode antes de qualquer disparo de T2 em lote.
import { prisma } from '../lib/prisma'
import { listChats, listChatMessages, isUnipileConfigured } from '../lib/unipile'

const T1_JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] as const
const PAUSA_MS = 700 // respiro entre chamadas à Unipile
const TETO_CHATS = 200

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Divergencia {
  nome: string
  touchId: string
  leadId: string
  enviadoEm: Date
  textoReal: string
  textoNoBanco: string
  providerRef?: string
}

async function main() {
  const aplicar = process.argv.includes('--apply')

  if (!isUnipileConfigured()) {
    console.error('❌ Unipile não configurada — sem ela não há como saber o que saiu de verdade.')
    process.exitCode = 1
    return
  }

  // A mesma fila de scripts/gerar-fila-t2.ts: quem aceitou, já recebeu o T1 e
  // ainda tem o T2 agendado. Quem respondeu está em conversa humana e não entra.
  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      linkedinConnectedAt: { not: null },
      touches: { some: { sequence: 2, status: 'AGENDADO' } },
      AND: [{ touches: { some: { sequence: 1, status: { in: [...T1_JA_SAIU] } } } }],
    },
    include: { touches: { orderBy: { sequence: 'asc' } }, auditLog: true, interacoes: true },
    orderBy: { daiseeScore: 'desc' },
  })

  const fila = leads.filter(
    (l) => l.interacoes.length === 0 && !l.auditLog.some((a) => a.action === 'LEAD_RESPONDEU')
  )

  console.log(`Fila de T2 segundo o banco: ${fila.length} lead(s)`)

  const chats = await listChats(TETO_CHATS)
  console.log(`Conversas lidas do inbox: ${chats.length}${chats.length === TETO_CHATS ? ' (no teto — pode haver mais)' : ''}\n`)

  const chatPorProvider = new Map<string, string>()
  for (const c of chats) if (c.attendee_provider_id) chatPorProvider.set(c.attendee_provider_id, c.id)

  const divergentes: Divergencia[] = []
  const semConversa: string[] = []

  for (const lead of fila) {
    const t2 = lead.touches.find((t) => t.sequence === 2)
    if (!t2) continue

    const chatId = lead.linkedinProviderId ? chatPorProvider.get(lead.linkedinProviderId) : undefined
    if (!chatId) {
      semConversa.push(lead.name)
      continue
    }

    const mensagens = await listChatMessages(chatId, 30)
    const nossas = mensagens
      .filter((m) => m.is_sender === 1 && m.text)
      .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))

    // Uma mensagem nossa é só o T1. Duas ou mais significam que o T2 já saiu.
    if (nossas.length < 2) {
      console.log(`ok  ${lead.name} — só o T1 saiu`)
      continue
    }

    const real = nossas[nossas.length - 1]
    divergentes.push({
      nome: lead.name,
      touchId: t2.id,
      leadId: lead.id,
      enviadoEm: new Date(real.timestamp!),
      textoReal: real.text!,
      textoNoBanco: t2.content,
      providerRef: real.id,
    })

    console.log(`🔴 ${lead.name} — T2 JÁ SAIU em ${real.timestamp?.slice(0, 16).replace('T', ' ')}, mas o banco diz AGENDADO`)
    await sleep(PAUSA_MS)
  }

  if (semConversa.length) {
    console.log(`\n?  ${semConversa.length} sem conversa localizada no inbox (convite ainda não virou chat):`)
    for (const n of semConversa) console.log(`   ${n}`)
  }

  console.log(`\n${'═'.repeat(66)}`)
  if (!divergentes.length) {
    console.log('✅ Nenhuma divergência: a fila do banco bate com o LinkedIn.')
    return
  }

  console.log(`🔴 ${divergentes.length} lead(s) com T2 entregue mas AGENDADO no banco.`)
  console.log('   Sem correção, um disparo em lote manda a mesma mensagem de novo.\n')

  for (const d of divergentes) {
    const mudouTexto = d.textoNoBanco.trim() !== d.textoReal.trim()
    console.log(`• ${d.nome} — enviado em ${d.enviadoEm.toISOString().slice(0, 16).replace('T', ' ')}`)
    console.log(`    entregue: ${d.textoReal.replace(/\s+/g, ' ').slice(0, 96)}...`)
    if (mudouTexto) console.log(`    (o banco guardava outro texto — será substituído pelo que foi entregue)`)
  }

  if (!aplicar) {
    console.log('\n(relatório apenas — rode com --apply para reconciliar)')
    return
  }

  console.log('\nReconciliando...')
  for (const d of divergentes) {
    await prisma.touch.update({
      where: { id: d.touchId },
      data: {
        status: 'ENVIADO',
        sentAt: d.enviadoEm,
        content: d.textoReal,
        providerRef: d.providerRef,
      },
    })
    await prisma.auditLog.create({
      data: {
        leadId: d.leadId,
        action: 'TOUCH_RECONCILIADO',
        details: `T2 (LINKEDIN_500) enviado à mão em ${d.enviadoEm.toISOString()} e reconciliado com o histórico do LinkedIn. O envio não passou pelo sistema: o touch seguia AGENDADO e o lead voltaria para a fila de T2.`,
      },
    })
    console.log(`  ok ${d.nome}`)
  }
  console.log(`\n${divergentes.length} touch(es) reconciliado(s).`)
}

main()
  .catch((e) => {
    console.error(`❌ ${e instanceof Error ? e.message : String(e)}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
