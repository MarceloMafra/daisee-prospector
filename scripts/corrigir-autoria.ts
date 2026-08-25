/**
 * Troca o claim de autoria da DAISEE pela formulação correta nos touches ainda
 * AGENDADOS. A MasterVendas é PARCEIRA da DAISEE, não a desenvolvedora.
 *
 * Correção cirúrgica de propósito: regenerar a cadência inteira reescreveria
 * ~144 touches para consertar 47, incluindo textos já auditados e aprovados.
 * Aqui só a oração do claim muda; o resto do texto fica intacto.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/corrigir-autoria.ts            (dry-run)
 *   npx dotenv -e .env.local -- npx tsx scripts/corrigir-autoria.ts --apply
 *
 * Backup antes: scripts/backup-touches.ts. Restauro: scripts/restaurar-touches.ts.
 */
import { prisma } from '../lib/prisma'
import { violacoesEmTexto, textoDoTouch } from '../lib/auditoriaClaims'

const apply = process.argv.includes('--apply')

// Ordem importa: a primeira que casar vence, então as formas mais específicas
// (com aposto, com travessão) vêm antes das genéricas.
const TROCAS: { de: RegExp; para: string; nota: string }[] = [
  // "...que desenvolvo com a MasterVendas" — remover só o verbo deixaria
  // "gestão documental com a MasterVendas", que não quer dizer nada.
  {
    de: /\s+que (?:desenvolvo|desenvolvemos|criei|criamos) com a MasterVendas\b/gi,
    para: ', de que a MasterVendas é parceira,',
    nota: 'que desenvolvo com a MasterVendas → de que a MasterVendas é parceira',
  },
  // "Sou fundador da MasterVendas e desenvolvemos uma IA privada ... chamada DAISEE"
  {
    de: /\b(d[ao] MasterVendas) e (?:desenvolvemos|criamos) (uma IA privada[^,.]*?) chamada DAISEE/gi,
    para: '$1, parceira da DAISEE, $2',
    nota: 'MasterVendas e desenvolvemos uma IA chamada DAISEE → parceira da DAISEE',
  },
  // "...mas desenvolvemos uma IA privada chamada DAISEE, focada em ..."
  {
    de: /\b(?:desenvolvemos|criamos) (uma IA privada[^,.]*?) chamada DAISEE/gi,
    para: 'somos parceiros da DAISEE, $1',
    nota: 'desenvolvemos uma IA chamada DAISEE → somos parceiros da DAISEE',
  },
  // "Pergunto porque desenvolvemos uma IA de gestão documental (DAISEE) que ..."
  {
    de: /\b(?:desenvolvemos|criamos) (uma IA[^(]*?)\(DAISEE\)/gi,
    para: 'somos parceiros da DAISEE, $1',
    nota: 'desenvolvemos uma IA (DAISEE) → somos parceiros da DAISEE',
  },
  // "Desenvolvi a DAISEE" / "criei a DAISEE" — duas entradas para preservar a caixa.
  {
    de: /\b(?:Desenvolvi|Criei)\s+a\s+DAISEE\b/g,
    para: 'Trabalho com a DAISEE',
    nota: 'Desenvolvi a DAISEE → Trabalho com a DAISEE',
  },
  {
    de: /\b(?:desenvolvi|criei)\s+a\s+DAISEE\b/g,
    para: 'trabalho com a DAISEE',
    nota: 'desenvolvi a DAISEE → trabalho com a DAISEE',
  },
  // "Sou fundador da MasterVendas e desenvolvemos a DAISEE, uma IA privada..."
  {
    de: /\b(d[ao] MasterVendas) e (?:desenvolvemos|criamos) a DAISEE\b/gi,
    para: '$1, parceira da DAISEE',
    nota: 'fundador da MasterVendas e desenvolvemos → MasterVendas, parceira da DAISEE',
  },
  // "...a DAISEE, uma IA privada de gestão documental que desenvolvemos."
  // O claim está na oração relativa: basta removê-la.
  {
    de: /,?\s+que (?:desenvolvemos|desenvolvi|criamos|criei|constru[íi]mos)\b/gi,
    para: '',
    nota: 'remove a oração relativa "que desenvolvemos"',
  },
  // "DAISEE — IA privada que desenvolvo" (mesma coisa, verbo no singular)
  {
    de: /\bque (?:desenvolvo|crio)\b/gi,
    para: '',
    nota: 'remove "que desenvolvo"',
  },
  // "Desenvolvi uma IA privada de gestão documental, a DAISEE."
  {
    de: /\b(?:Desenvolvi|Desenvolvemos|Criei|Criamos)\s+(uma IA privada)/g,
    para: 'Trabalho com $1',
    nota: 'Desenvolvi uma IA privada → Trabalho com uma IA privada',
  },
  // "Criamos a DAISEE" / "Desenvolvemos a DAISEE" soltos, início de frase.
  {
    de: /\b(?:Desenvolvemos|Criamos)\s+a\s+DAISEE\b/g,
    para: 'Somos parceiros da DAISEE',
    nota: 'Desenvolvemos a DAISEE → Somos parceiros da DAISEE',
  },
  {
    de: /\b(?:desenvolvemos|criamos)\s+a\s+DAISEE\b/gi,
    para: 'somos parceiros da DAISEE',
    nota: 'desenvolvemos a DAISEE → somos parceiros da DAISEE',
  },
  // "a DAISEE (nossa IA de gestão documental)"
  {
    de: /\bnossa (IA|solução|ferramenta|plataforma) de gestão documental\b/gi,
    para: 'a DAISEE, IA de gestão documental de que somos parceiros',
    nota: 'nossa IA de gestão documental → DAISEE, de que somos parceiros',
  },
]

function corrigir(texto: string): { novo: string; aplicadas: string[] } {
  let novo = texto
  const aplicadas: string[] = []
  for (const t of TROCAS) {
    t.de.lastIndex = 0
    if (!t.de.test(novo)) continue
    t.de.lastIndex = 0
    novo = novo.replace(t.de, t.para)
    aplicadas.push(t.nota)
  }
  // Espaço duplo ou vírgula órfã deixados pela remoção da oração relativa.
  novo = novo.replace(/ {2,}/g, ' ').replace(/\s+([,.])/g, '$1')
  return { novo, aplicadas }
}

async function main() {
  const touches = await prisma.touch.findMany({
    where: { status: 'AGENDADO' },
    include: { lead: { select: { name: true, company: true } } },
    orderBy: [{ leadId: 'asc' }, { sequence: 'asc' }],
  })

  const sujos = touches.filter(t =>
    violacoesEmTexto(textoDoTouch(t)).some(v => v.regra === 'AUTORIA')
  )

  console.log('═'.repeat(72))
  console.log(`CORREÇÃO DE AUTORIA — ${apply ? 'APLICANDO' : 'DRY-RUN'}`)
  console.log('═'.repeat(72))
  console.log(`Touches com claim de autoria: ${sujos.length}\n`)

  let corrigidos = 0
  const resistentes: string[] = []

  for (const t of sujos) {
    const antes = t.content
    const { novo, aplicadas } = corrigir(antes)
    const subjNovo = t.subject ? corrigir(t.subject).novo : t.subject
    // O texto tambem vive em `message` (o corpo que sai de fato). Corrigir so
    // content deixava o claim de pe no campo que o lead le.
    const msgNovo = t.message ? corrigir(t.message).novo : t.message

    const limpou =
      violacoesEmTexto([subjNovo, novo, msgNovo].filter(Boolean).join('\n')).every(
        v => v.regra !== 'AUTORIA'
      )

    if (!limpou) {
      resistentes.push(`${t.lead.name} T${t.sequence}`)
      console.log(`✗ ${t.lead.name} (${t.lead.company}) T${t.sequence} — NÃO resolvido pelas regras`)
      for (const [campo, val] of [['subject', subjNovo], ['content', novo], ['message', msgNovo]] as const) {
        if (!val) continue
        const vv = violacoesEmTexto(val).filter(x => x.regra === 'AUTORIA')
        vv.forEach(x => console.log('   [' + campo + '] ' + x.trecho))
      }
      console.log('   regras aplicadas: ' + (aplicadas.join('; ') || 'NENHUMA'))
      const m = novo.match(/[^.!?]{0,80}(desenvolv|criam|criei|constru)[^.!?]{0,60}/i)
      console.log(`   trecho: "${(m?.[0] ?? '').trim()}"`)
      continue
    }

    corrigidos++
    console.log(`✓ ${t.lead.name} (${t.lead.company}) T${t.sequence} — ${aplicadas.join('; ')}`)
    if (!apply) {
      const idx = antes.search(/(desenvolv|criam|criei|constru|nossa (IA|solução))/i)
      const ini = Math.max(0, idx - 70)
      console.log(`   antes:  …${antes.slice(ini, idx + 90).replace(/\s+/g, ' ')}…`)
      const idxN = novo.search(/(parceir|Trabalho com|DAISEE)/i)
      console.log(`   depois: …${novo.slice(Math.max(0, idxN - 70), idxN + 90).replace(/\s+/g, ' ')}…`)
    } else {
      await prisma.touch.update({
        where: { id: t.id },
        data: { content: novo, subject: subjNovo, message: msgNovo },
      })
    }
  }

  console.log('\n' + '─'.repeat(72))
  console.log(`${corrigidos} touch(es) ${apply ? 'gravados' : 'corrigíveis'}`)
  if (resistentes.length) {
    console.log(`${resistentes.length} resistente(s) — precisam de regeneração: ${resistentes.join(', ')}`)
  }
  if (!apply) console.log('\nNada gravado. Repita com --apply para gravar.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
