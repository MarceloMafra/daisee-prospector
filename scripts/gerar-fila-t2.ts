// Gera a página da fila de T2 a partir do banco, para ela deixar de ser uma
// foto tirada à mão. O HTML fica em templates/fila-t2.html com um marcador no
// lugar dos dados; aqui só a apuração muda.
//
//   ./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/gerar-fila-t2.ts
//
// Depois é só republicar saidas/fila-t2.html como Artifact.
import { prisma } from '../lib/prisma'
import { violacoesEmTexto } from '../lib/auditoriaClaims'
import { validateMessage } from '../lib/compliance'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO'] as const

async function main() {
  const agora = new Date()

  const leads = await prisma.lead.findMany({
    where: {
      excludedFromAutomation: false,
      linkedinConnectedAt: { not: null },
      touches: { some: { sequence: 2, status: 'AGENDADO' } },
      AND: [{ touches: { some: { sequence: 1, status: { in: [...JA_SAIU] } } } }],
    },
    include: { touches: { orderBy: { sequence: 'asc' } }, auditLog: true, interacoes: true },
    orderBy: { daiseeScore: 'desc' },
  })

  // Quem já respondeu está em conversa humana e a cadência fica pausada de
  // propósito — mandar o T2 agora atropelaria o diálogo. O painel conta esses
  // junto e por isso mostra um número maior do que o trabalho real.
  const emConversa = leads.filter(
    (l) => l.interacoes.length > 0 || l.auditLog.some((a) => a.action === 'LEAD_RESPONDEU')
  )
  const pendentes = leads.filter((l) => !emConversa.includes(l))

  const linhas = pendentes.map((l) => {
    const t1 = l.touches.find((t) => t.sequence === 1)!
    const t2 = l.touches.find((t) => t.sequence === 2)!
    const aceite = l.auditLog.filter((a) => a.action === 'CONEXAO_ACEITA').pop()?.createdAt
    const v = violacoesEmTexto([t2.subject, t2.content].filter(Boolean).join('\n'))
    const c = validateMessage(t2.content, t2.type)
    return {
      nome: l.name,
      empresa: l.company,
      cargo: l.seniority,
      score: l.daiseeScore,
      dias: aceite ? Math.floor((agora.getTime() - aceite.getTime()) / 86400_000) : null,
      url:
        l.linkedinUrl ??
        (l.linkedinProviderId ? `https://www.linkedin.com/sales/lead/${l.linkedinProviderId}` : null),
      t1: t1.content,
      t1Em: t1.sentAt?.toISOString().slice(0, 10) ?? null,
      t2: t2.content,
      chars: t2.content.length,
      problemas: [...v.map((x) => x.regra), ...(c.isValid ? [] : ['COMPLIANCE'])],
    }
  })

  linhas.sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0) || b.score - a.score)

  const template = readFileSync('templates/fila-t2.html', 'utf8')
  const apurado = agora.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

  const html = template
    .replace('/*__DADOS__*/[]', JSON.stringify(linhas))
    .replace('__APURADO__', apurado)

  mkdirSync('saidas', { recursive: true })
  writeFileSync('saidas/fila-t2.html', html, 'utf8')

  // O mesmo conteudo em markdown. O artifact depende do link chegar ao Joao; o
  // .md e a saida que sempre funciona -- da pra colar no WhatsApp. Era montado
  // a mao e por isso envelhecia sozinho enquanto o HTML era regerado.
  const md = [
    `# Fila de T2 — ${linhas.length} pendentes (apurado ${apurado})`,
    '',
    ...linhas.flatMap((l, i) => [
      `## ${i + 1}. ${l.nome} — ${l.empresa}`,
      `**Score ${l.score}** · espera: ${l.dias === null ? '?' : l.dias === 0 ? 'aceitou hoje' : `${l.dias} dia${l.dias > 1 ? 's' : ''}`} · T1 em ${l.t1Em ?? '?'} · ${l.chars} chars${l.problemas.length ? `  ⚠️ ${l.problemas.join(', ')}` : ''}`,
      l.cargo ?? '',
      l.url ?? '',
      '',
      `> ${l.t2.replace(/\n+/g, ' ')}`,
      '',
    ]),
  ].join('\n')
  writeFileSync('saidas/fila-t2.md', md, 'utf8')

  console.log(`Aceitaram com T2 agendado ... ${leads.length}`)
  console.log(`  já em conversa (pausados) . ${emConversa.length}`)
  console.log(`  ESPERANDO O T2 ............ ${pendentes.length}`)
  const comProblema = linhas.filter((l) => l.problemas.length)
  if (comProblema.length) {
    console.log(`\n⚠️  ${comProblema.length} com problema de copy — revisar antes de enviar:`)
    for (const l of comProblema) console.log(`   ${l.nome}: ${l.problemas.join(', ')}`)
  }
  console.log(`\nsaidas/fila-t2.html gerado (apurado em ${apurado}).`)
  if (pendentes.length === 0) {
    console.log('Fila vazia — a página vai mostrar que está tudo em dia.')
  }
}

main()
  .catch((e) => {
    console.error(`❌ ${e.message}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
