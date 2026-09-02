// Importação de leads a partir de listas salvas do Sales Navigator.
// Extraído da rota /api/leads/import-sales-nav para que o script de linha de
// comando use exatamente a mesma regra — inclusive o cálculo do score.
import { prisma } from '@/lib/prisma'
import { calculateDAISEEScore } from '@/lib/daisee-score'
import { fetchAllSalesNavLeadListMembers, getSalesNavFullName } from '@/lib/unipile'
import type { SalesNavLeadListItem } from '@/lib/unipile'
import { fichaDeItemSalesNav, triar, type Faixa } from '@/lib/triagemLista'

export interface LeadImportavel {
  linkedinProviderId: string
  name: string
  company: string
  seniority: string
  linkedinUrl: string | null
  headline: string | null
  location: string | null
  recemContratado: boolean
  score: number
  faixa?: Faixa
  pontosTriagem?: number
  termosTriagem?: string[]
}

export interface ResultadoImportacao {
  total: number
  novos: LeadImportavel[]
  duplicados: number
  pulados: number
  importados: number
  reprovadosNaTriagem: number
  erros: Array<{ name: string; error: string }>
}

// Converte o registro cru da Unipile no lead que o sistema entende.
function normalizar(item: SalesNavLeadListItem): LeadImportavel | null {
  const linkedinProviderId = item.id
  const name = getSalesNavFullName(item)
  if (!linkedinProviderId || !name) return null

  const currentPosition = item.current_positions?.[0]
  const company = currentPosition?.company?.trim() || 'Não informado'
  const seniority = currentPosition?.role?.trim() || item.headline?.trim() || 'Não informado'

  const { score } = calculateDAISEEScore({ seniority, companySize: 'MEDIA', segmentMatch: 50 })

  return {
    linkedinProviderId,
    name,
    company,
    seniority,
    linkedinUrl: item.public_profile_url || null,
    headline: item.headline?.trim() || null,
    location: item.location?.trim() || null,
    recemContratado: Boolean(item.recently_hired),
    score,
  }
}

function notas(lead: LeadImportavel, listName?: string) {
  return [
    `Importado do Sales Navigator${listName ? ` (lista "${listName}")` : ''}.`,
    lead.headline ? `Headline: ${lead.headline}` : null,
    lead.location ? `Localização: ${lead.location}` : null,
    lead.recemContratado ? 'Sinalizado como recém-contratado(a) pelo filtro do Sales Navigator.' : null,
    lead.faixa
      ? `Triagem: ${lead.faixa} (${lead.pontosTriagem} pts)${lead.termosTriagem?.length ? ` — ${lead.termosTriagem.join(', ')}` : ''}`
      : null,
  ]
    .filter(Boolean)
    .join('\n')
}

// A busca do Sales Navigator devolve o perfil com um URN próprio (ACwAAA…),
// enquanto a base guarda o provider_id clássico (ACoAAA…). É o mesmo membro:
// muda o terceiro caractere e o sufixo. Comparar só o id deixaria entrar de
// novo gente que já está em campanha — inclusive lead com reunião marcada.
function urlChave(url?: string | null): string | null {
  if (!url) return null
  try {
    const limpa = decodeURIComponent(url.split('?')[0].trim().toLowerCase())
    const m = limpa.match(/linkedin\.com\/in\/([^/]+)/)
    return m ? m[1].replace(/\/$/, '') : null
  } catch {
    return null
  }
}

// Os 12 primeiros caracteres do URN identificam o membro; o 3º varia por origem.
function urnChave(id?: string | null): string | null {
  if (!id || id.length < 12) return null
  return (id.slice(0, 2) + '_' + id.slice(3, 12)).toLowerCase()
}

// listId "ALL" varre todas as listas salvas da conta.
// Com dryRun, nada é gravado: serve para conferir quem entraria antes de decidir.
export async function importarListaSalesNav(
  listId: string,
  opts: { listName?: string; dryRun?: boolean; faixas?: Faixa[]; max?: number } = {}
): Promise<ResultadoImportacao> {
  const membros = await fetchAllSalesNavLeadListMembers(listId, opts.max ?? 500)

  // Índices da base, para reconhecer quem já está em campanha.
  const base = await prisma.lead.findMany({
    select: { linkedinProviderId: true, linkedinUrl: true },
  })
  const porId = new Set(base.map((l) => l.linkedinProviderId).filter(Boolean) as string[])
  const porUrl = new Set(base.map((l) => urlChave(l.linkedinUrl)).filter(Boolean) as string[])
  const porUrn = new Set(base.map((l) => urnChave(l.linkedinProviderId)).filter(Boolean) as string[])

  const jaNaBase = (lead: LeadImportavel) => {
    if (porId.has(lead.linkedinProviderId)) return true
    const u = urlChave(lead.linkedinUrl)
    if (u && porUrl.has(u)) return true
    const n = urnChave(lead.linkedinProviderId)
    return Boolean(n && porUrn.has(n))
  }

  // A própria lista do Sales Navigator repete gente — Raíssa Modesto (banco BV)
  // aparecia duas vezes no lote de 02/09. Com a deduplicação olhando só a base,
  // as duas cópias passavam juntas e viravam dois leads, cada um com sua
  // cadência. Registrar quem já entrou neste lote fecha esse caminho.
  const noLote = { id: new Set<string>(), url: new Set<string>(), urn: new Set<string>() }
  const jaNoLote = (lead: LeadImportavel) => {
    const u = urlChave(lead.linkedinUrl)
    const n = urnChave(lead.linkedinProviderId)
    if (noLote.id.has(lead.linkedinProviderId)) return true
    if (u && noLote.url.has(u)) return true
    if (n && noLote.urn.has(n)) return true
    noLote.id.add(lead.linkedinProviderId)
    if (u) noLote.url.add(u)
    if (n) noLote.urn.add(n)
    return false
  }

  const res: ResultadoImportacao = {
    total: membros.length,
    novos: [],
    duplicados: 0,
    pulados: 0,
    importados: 0,
    reprovadosNaTriagem: 0,
    erros: [],
  }

  for (const item of membros) {
    const lead = normalizar(item)
    if (!lead) {
      res.pulados++
      res.erros.push({
        name: getSalesNavFullName(item) || 'N/A',
        error: 'Registro sem id ou nome — não foi possível importar.',
      })
      continue
    }

    if (jaNaBase(lead) || jaNoLote(lead)) {
      res.duplicados++
      continue
    }

    // Com faixas informadas, só entra quem a triagem aprova — o mesmo julgamento
    // do relatório de scripts/triar-lista.ts, para o que foi revisado ser
    // exatamente o que é gravado.
    if (opts.faixas?.length) {
      const v = triar({ nome: lead.name, ...fichaDeItemSalesNav(item) })
      if (!opts.faixas.includes(v.faixa)) {
        res.reprovadosNaTriagem++
        continue
      }
      lead.faixa = v.faixa
      lead.pontosTriagem = v.pontos
      lead.termosTriagem = v.termos
    }

    res.novos.push(lead)
    if (opts.dryRun) continue

    try {
      await prisma.lead.create({
        data: {
          name: lead.name,
          company: lead.company,
          seniority: lead.seniority,
          email: null,
          linkedinUrl: lead.linkedinUrl,
          linkedinProviderId: lead.linkedinProviderId,
          notes: notas(lead, opts.listName),
          daiseeScore: lead.score,
          decisionPower: calculateDAISEEScore({
            seniority: lead.seniority,
            companySize: 'MEDIA',
            segmentMatch: 50,
          }).decisionPower,
          companySize: 'MEDIA',
          segmentMatch: calculateDAISEEScore({
            seniority: lead.seniority,
            companySize: 'MEDIA',
            segmentMatch: 50,
          }).segmentMatch,
          status: 'PROSPECTANDO',
          priority: lead.score >= 80 ? 'ALTA' : lead.score >= 50 ? 'MEDIA' : 'BAIXA',
        },
      })
      res.importados++
    } catch (err) {
      res.erros.push({
        name: lead.name,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      })
    }
  }

  return res
}
