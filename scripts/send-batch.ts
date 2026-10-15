// Dispara o próximo touch (T1 — convite LinkedIn) pros primeiros N leads da lista
// processada hoje, na ordem de criação (mesma ordem exibida no lote), com intervalo
// aleatório de 30-90s entre envios — mesmo comportamento do botão em lote da UI.
// A quota diária (LINKEDIN_INVITES_PER_DAY) é validada pelo próprio sendTouchNow().
//
// Uso:
//   npx dotenv -e .env.local -- npx tsx scripts/send-batch.ts [quantidade] --dry-run
//   npx dotenv -e .env.local -- npx tsx scripts/send-batch.ts [quantidade] --apply
//
// Este script ENVIA de verdade. Sem --apply ele só lista quem seria convidado:
// argumento desconhecido aborta, em vez de ser ignorado e virar disparo real.
import { prisma } from '../lib/prisma'
import { sendTouchNow } from '../lib/scheduler'
import { violacoesEmTexto, textoDoTouch } from '../lib/auditoriaClaims'
import { comRetentativaDeBanco } from '../lib/dbRetry'

const FLAGS_CONHECIDAS = new Set(['--dry-run', '--apply', '--pular'])
const extras = process.argv.slice(2).filter((a) => a.startsWith('-'))
const desconhecidas = extras.filter((a) => !FLAGS_CONHECIDAS.has(a))

if (desconhecidas.length) {
  console.error(`Argumento não reconhecido: ${desconhecidas.join(', ')}`)
  console.error('Use --dry-run para simular ou --apply para enviar de verdade.')
  process.exit(1)
}

// Nomes fora desta rodada, sem mexer no banco. Nasceu de um lead cuja cadencia
// foi regenerada no painel: a regeneracao devolve o T1 para AGENDADO e ele
// reentra na fila como se nunca tivesse sido contactado -- prestes a receber a
// mesma mensagem duas vezes. Use --pular "Nome" ate o estado ser corrigido.
const PULAR = process.argv
  .map((a, i) => (a === '--pular' ? process.argv[i + 1] : null))
  .filter((v): v is string => !!v && !v.startsWith('-'))

const APPLY = process.argv.includes('--apply')
const TARGET = parseInt(process.argv.find((a) => /^\d+$/.test(a)) || '10', 10)
const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const randomGap = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))

async function main() {
  // Elegíveis pra automação, do maior score DAISEE para o menor. A quota diária
  // do LinkedIn é o recurso escasso: com a base grande, gastar os convites de
  // hoje em ordem de importação deixaria diretor de compliance esperando dias
  // atrás de analista. Empate cai na ordem de criação, que preserva a fila antiga.
  // Esta consulta ficava fora da rede de novas tentativas. Com o Neon dormindo,
  // ela falha na primeira conexão e derruba o lote INTEIRO antes de enviar nada
  // — num disparo agendado às 08h, isso perde o dia sem ninguém perceber.
  // Atrasos longos aqui de propósito. Esta é a consulta que abre o lote: se ela
  // falhar, NADA é enviado no dia. Os 2/5/10s padrão cobrem o Neon acordando,
  // mas não uma indisponibilidade de verdade — em 14/10 o banco ficou fora mais
  // de 30s e a janela padrão se esgotou. Aqui vale esperar ~2,5 minutos antes de
  // desistir do dia inteiro.
  const leads = await comRetentativaDeBanco('send-batch: fila', () =>
    prisma.lead.findMany({
      where: {
        excludedFromAutomation: false,
        cadencia: { isNot: null },
      },
      include: { cadencia: { include: { touches: { orderBy: { sequence: 'asc' } } } } },
      orderBy: [{ daiseeScore: 'desc' }, { createdAt: 'asc' }],
    })
  , [15_000, 45_000, 90_000])

  // Só leads "frescos": cadência completa (5 touches) e próximo touch é o T1
  // ainda AGENDADO — ou seja, ninguém foi contactado. Cadência parcial fica de fora.
  const candidates = leads.filter((l) => {
    if (PULAR.some((p) => l.name.toLowerCase().includes(p.toLowerCase()))) {
      console.log(`  (pulando ${l.name}: pedido por --pular)`)
      return false
    }
    if (l.cadencia!.touches.length < 5) {
      console.log(`  (pulando ${l.name}: cadência parcial com ${l.cadencia!.touches.length} touches)`)
      return false
    }
    const next = l.cadencia!.touches.find((t) => t.status === 'AGENDADO')
    return next?.sequence === 1
  })

  console.log(`Meta: ${TARGET} envios. Candidatos na fila (maior score primeiro): ${candidates.length}`)
  candidates.slice(0, TARGET + 5).forEach((l, i) =>
    console.log(`  ${i + 1}. ${l.name} (${l.company}) — score ${l.daiseeScore}`)
  )

  // A conferência de copy aparece no ensaio, não só no envio: quem roda o
  // --dry-run quer saber o que sairia, e "sairia menos do que você pediu
  // porque N textos reprovaram" é parte da resposta.
  const reprovados = candidates.slice(0, TARGET).flatMap((l) => {
    const t = l.cadencia!.touches.find((x) => x.status === 'AGENDADO')!
    const v = violacoesEmTexto(textoDoTouch(t))
    return v.length ? [{ nome: l.name, rotulos: v.map((x) => `${x.regra} (${x.rotulo})`).join('; ') }] : []
  })

  if (reprovados.length) {
    console.log(`\n⚠  ${reprovados.length} texto(s) reprovam na auditoria e serão PULADOS:`)
    for (const r of reprovados) console.log(`   - ${r.nome}: ${r.rotulos}`)
  } else {
    console.log(`\n✅ Os ${Math.min(TARGET, candidates.length)} textos passam na auditoria de copy.`)
  }

  if (!APPLY) {
    console.log(`\nDRY-RUN — nada foi enviado.`)
    console.log(`Seriam convidados os ${Math.min(TARGET, candidates.length) - reprovados.length} primeiros da lista acima.`)
    console.log(`Para enviar de verdade: repita o comando com --apply`)
    await prisma.$disconnect()
    return
  }

  let sent = 0
  const results: Array<{ name: string; outcome: string }> = []

  for (const lead of candidates) {
    if (sent >= TARGET) break
    const touch = lead.cadencia!.touches.find((t) => t.status === 'AGENDADO')!
    const label = `[${sent + 1}/${TARGET}] ${lead.name}`

    // A auditoria de copy rodava só na caixa de respostas: o lote saía sem crivo
    // nenhum. Em 06/10 o T1 do Douglas Schmeisck Ribeiro (BRB) afirmava "99% de
    // crescimento em AuC/AuM" — número sobre o negócio DELE, inventado pela IA —
    // e só não foi para o lead porque a fila foi conferida à mão. Com a rotina
    // diária não há ninguém conferindo, então o crivo tem de ser do código.
    // Reprovado é PULADO, nunca enviado: a correção é humana.
    const violacoes = violacoesEmTexto(textoDoTouch(touch))
    if (violacoes.length) {
      const rotulos = violacoes.map((v) => `${v.regra} (${v.rotulo})`).join('; ')
      console.log(`${label}: PULADO pela auditoria de copy — ${rotulos}`)
      results.push({ name: lead.name, outcome: `pulado pela auditoria: ${rotulos}` })
      await prisma.auditLog.create({
        data: {
          leadId: lead.id,
          action: 'COPY_REPROVADA',
          details: `T${touch.sequence} não enviado pelo send-batch: ${rotulos}`,
        },
      })
      continue
    }

    try {
      const result = await sendTouchNow(touch.id)
      // sendTouchNow devolve falha como outcome (não lança) — só conta envio real.
      if (result.outcome === 'enviado') {
        sent++
        console.log(`${label}: T${touch.sequence} (${touch.type}) → enviado ✔`)
        results.push({ name: lead.name, outcome: 'enviado' })
      } else {
        console.log(`${label}: T${touch.sequence} (${touch.type}) → ${result.outcome}${result.reason ? ` — ${result.reason}` : ''}`)
        results.push({ name: lead.name, outcome: `${result.outcome}${result.reason ? `: ${result.reason}` : ''}` })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`${label}: FALHOU — ${msg}`)
      results.push({ name: lead.name, outcome: `falhou: ${msg}` })
      if (/Limite de ritmo atingido/i.test(msg)) {
        console.log('Quota diária atingida — encerrando o lote de envio.')
        break
      }
    }

    if (sent < TARGET) {
      const gap = randomGap()
      console.log(`  aguardando ${Math.round(gap / 1000)}s antes do próximo...`)
      await sleep(gap)
    }
  }

  console.log(`\n===== RESUMO DO DISPARO =====`)
  console.log(`${sent}/${TARGET} convites enviados.`)
  for (const r of results) console.log(`  - ${r.name}: ${r.outcome}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
