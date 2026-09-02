// Tria uma lista do Sales Navigator sem enriquecer perfil e sem ler o summary —
// só com o que a própria lista devolve. Custo: 1 chamada à Unipile, zero de IA.
//
//   npx tsx scripts/triar-lista.ts --lista <id|url|ALL> [--max 2000]
//                                  [--faixa ALVO] [--contato NOVO] [--top 40]
//                                  [--csv saida.csv]
//
// A revisão é por GRUPO, não lead a lead: cada um sai com a pontuação, o nível
// do cargo, os termos que casaram e o estado de contato.
import { fetchAllSalesNavLeadListMembers, getSalesNavFullName } from '../lib/unipile'
import { triar, type FichaTriagem, type Veredito } from '../lib/triagemLista'
import { prisma } from '../lib/prisma'
import { writeFileSync } from 'fs'

const arg = (n: string) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null)
const extrairId = (e: string) => (e.match(/\/lists\/people\/(\d+)/) || e.match(/(\d{6,})/))?.[1] ?? e

async function main() {
  const bruto = arg('--lista') ?? 'ALL'
  const listId = bruto === 'ALL' ? 'ALL' : extrairId(bruto)
  const max = Number(arg('--max') ?? 2000)
  const faixaFiltro = arg('--faixa')
  const contatoFiltro = arg('--contato')
  const top = arg('--top') ? Number(arg('--top')) : null
  const csv = arg('--csv')

  console.log(`Lista: ${listId} (teto ${max})\n`)
  const itens: any[] = await fetchAllSalesNavLeadListMembers(listId, max)

  const base = await prisma.lead.findMany({ select: { linkedinProviderId: true, name: true } })
  const idsNaBase = new Set(base.map((b) => b.linkedinProviderId).filter(Boolean))
  const nomesNaBase = new Set(base.map((b) => b.name.toLowerCase()))

  const vereditos: Veredito[] = []
  let jaNaBase = 0

  for (const i of itens) {
    const nome = getSalesNavFullName(i)
    if (!nome || !i.id) continue
    if (idsNaBase.has(i.id) || nomesNaBase.has(nome.toLowerCase())) {
      jaNaBase++
      continue
    }
    const p = i.current_positions?.[0] ?? {}
    vereditos.push(
      triar({
        nome,
        headline: i.headline ?? '',
        cargo: p.role ?? '',
        empresa: p.company ?? '',
        setor: p.industry?.[0] ?? '',
        uf: i.location?.split(',').slice(-2)[0]?.trim() ?? '',
        providerId: i.id,
        convitePendente: Boolean(i.pending_invitation),
        grau: i.network_distance ?? '',
      } satisfies FichaTriagem)
    )
  }

  vereditos.sort((a, b) => b.pontos - a.pontos)

  const conta = (f: (v: Veredito) => boolean) => vereditos.filter(f).length
  console.log('='.repeat(80))
  console.log(`Na lista ............ ${itens.length}`)
  console.log(`Já na base .......... ${jaNaBase}  (não entram na triagem)`)
  console.log(`Triados ............. ${vereditos.length}`)
  console.log('')
  console.log(`  ALVO   (>= 70) .... ${conta((v) => v.faixa === 'ALVO')}`)
  console.log(`  TALVEZ (40-69) .... ${conta((v) => v.faixa === 'TALVEZ')}`)
  console.log(`  FORA   (< 40) ..... ${conta((v) => v.faixa === 'FORA')}`)
  console.log('')
  console.log(`  já CONECTADO ...... ${conta((v) => v.contato === 'CONECTADO')}  (aceitaram — não precisa de convite)`)
  console.log(`  convite PENDENTE .. ${conta((v) => v.contato === 'CONVITE_PENDENTE')}`)
  console.log(`  NOVO .............. ${conta((v) => v.contato === 'NOVO')}`)
  console.log('='.repeat(80))

  let grupo = vereditos
  if (faixaFiltro) grupo = grupo.filter((v) => v.faixa === faixaFiltro)
  if (contatoFiltro) grupo = grupo.filter((v) => v.contato === contatoFiltro)

  const mostrar = top ? grupo.slice(0, top) : grupo
  const rotuloContato: Record<string, string> = {
    CONECTADO: '🤝',
    CONVITE_PENDENTE: '⏳',
    NOVO: '  ',
  }

  console.log('')
  for (const v of mostrar) {
    console.log(
      `${String(v.pontos).padStart(4)} ${rotuloContato[v.contato]} ${v.ficha.nome.slice(0, 26).padEnd(27)} ${v.ficha.empresa.slice(0, 26).padEnd(27)} ${v.ficha.cargo.slice(0, 40)}`
    )
    console.log(`        ${v.nivel} · ${v.termos.join(', ') || 'sem termo'}`)
  }
  if (mostrar.length < grupo.length) {
    console.log(`\n… e mais ${grupo.length - mostrar.length}. Use --csv para a lista inteira.`)
  }

  if (csv) {
    const linhas = [
      'pontos,faixa,contato,nivel,nome,empresa,cargo,setor,uf,termos,headline,perfil',
      ...vereditos.map((v) =>
        [
          v.pontos,
          v.faixa,
          v.contato,
          v.nivel,
          v.ficha.nome,
          v.ficha.empresa,
          v.ficha.cargo,
          v.ficha.setor,
          v.ficha.uf,
          v.termos.join(' | '),
          v.ficha.headline,
          `https://www.linkedin.com/sales/lead/${v.ficha.providerId}`,
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ]
    writeFileSync(csv, '﻿' + linhas.join('\n'), 'utf8')
    console.log(`\nCSV: ${csv}`)
  }
}

main()
  .catch((e) => {
    console.error(`❌ ${e.message}`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
