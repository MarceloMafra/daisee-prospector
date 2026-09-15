// Qualificação antes do preparo (enriquecer + gerar cadência).
//
// Preparar custa uma análise de empresa e uma cadência no Opus por lead, e a
// quota de convites é o recurso escasso. Até 15/09 o bulk-prepare e o
// autoPipeline preparavam todo lead sem cadência, na ordem de um score que,
// antes do enriquecimento, é praticamente o mesmo para a base inteira (35,8 a
// 41,8 nos 95 que sobravam) — os pontos da triagem, que separam 40 de 84, não
// entravam na conta.
//
// Duas travas:
// 1. ANTES de enriquecer: faixa e pontos da triagem gravados na importação, e
//    empregador identificável.
// 2. DEPOIS de enriquecer e ANTES da cadência: o perfil real confirma que a
//    pessoa segue na empresa da lista e tem cargo atual. Foi o que faltou com
//    Elba Cerqueira e Gabriela Ferreira, que receberam cadência com o cargo
//    já encerrado.
import type { Lead } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { SEM_EMPREGADOR, type Faixa } from '@/lib/triagemLista'

export interface Triagem {
  faixa: Faixa
  pontos: number
}

// Formato gravado por lib/importSalesNav.ts: "Triagem: TALVEZ (64 pts) — termos".
export function lerTriagem(notes?: string | null): Triagem | null {
  const m = notes?.match(/Triagem:\s*(ALVO|TALVEZ|FORA)\s*\((-?\d+)\s*pts?\)/i)
  return m ? { faixa: m[1].toUpperCase() as Faixa, pontos: Number(m[2]) } : null
}

function headlineDe(lead: Pick<Lead, 'notes' | 'seniority'>) {
  return lead.notes?.match(/Headline:\s*([^\n]*)/)?.[1] ?? lead.seniority ?? ''
}

// "Não informado" como empresa, "autônomo", "open to work": a campanha fala do
// acervo regulatório de uma instituição, e essa pessoa não tem uma para mostrar.
export function semEmpregador(lead: Pick<Lead, 'company' | 'notes' | 'seniority'>): boolean {
  return SEM_EMPREGADOR.test(`${lead.company} ${headlineDe(lead)}`)
}

// A lista do Sales Navigator e o perfil escrevem a mesma empresa de jeitos
// diferentes ("C6Bank" e "C6 Bank", "Banco Bmg" e "Bmg", "Cooperativa Central
// Ailos" e "Ailos"). Na dúvida, é a mesma: bloquear quem não trocou de emprego
// custa um lead bom, e o bloqueio não se desfaz sozinho.
const PALAVRAS_GENERICAS = new Set(['banco', 'bank', 'sa', 's', 'a', 'ltda', 'brasil', 'brazil', 'grupo', 'cooperativa', 'de', 'do', 'da', 'the'])

const nucleoDaEmpresa = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !PALAVRAS_GENERICAS.has(t))
    .join('')

export function mesmaEmpresa(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return true // sem dado para comparar não é evidência de troca
  const x = nucleoDaEmpresa(a)
  const y = nucleoDaEmpresa(b)
  if (!x || !y) return true
  return x === y || x.includes(y) || y.includes(x)
}

// Lê a seção "Experiência:" do profileText montado por buildProfileText
// (lib/unipile.ts), onde cada cargo sai como "- Cargo — Empresa (início — fim)"
// e o cargo em aberto termina em "— atual)". Só acusa quando há datas e nenhuma
// delas está em aberto: perfil sem datas não prova nada.
export function semCargoAtual(profileText?: string | null): boolean {
  const secao = profileText?.split(/\nExperiência:\n/)[1]?.split(/\n\n/)[0]
  if (!secao) return false
  const datados = secao
    .split('\n')
    .filter((linha) => linha.startsWith('- '))
    .filter((linha) => /\([^()]*—[^()]*\)\s*$/.test(linha))
  if (datados.length === 0) return false
  return !datados.some((linha) => /—\s*atual\)\s*$/.test(linha))
}

export function motivoBloqueioPosEnriquecimento(p: {
  empresaNaLista: string
  empresaNoPerfil?: string | null
  profileText?: string | null
}): string | null {
  if (!mesmaEmpresa(p.empresaNaLista, p.empresaNoPerfil)) {
    return `empresa mudou: "${p.empresaNaLista}" na lista, "${p.empresaNoPerfil}" no perfil`
  }
  if (semCargoAtual(p.profileText)) {
    return 'nenhuma experiência em aberto no perfil (cargo encerrado)'
  }
  return null
}

// Tira da automação em vez de só pular: o próximo preparo já encontraria o
// perfil enriquecido e a empresa sobrescrita, e geraria a cadência sem ver o
// problema. Para liberar depois de conferir, basta reativar na ficha do lead.
export async function bloquearPreparo(leadId: string, motivo: string) {
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { excludedFromAutomation: true } }),
    prisma.auditLog.create({
      data: {
        leadId,
        action: 'PREPARO_BLOQUEADO',
        details: `Cadência não gerada: ${motivo}. Lead tirado da automação para revisão — depois de conferir o perfil, reative em "Ativo" na ficha do lead.`,
      },
    }),
  ])
}

export interface FiltroPreparo {
  faixas?: Faixa[]
  minPontos?: number
  // Sem filtro, quem não passou pela triagem entra (lead manual, lista antiga).
  // Com filtro, só entra se pedir.
  incluirSemTriagem?: boolean
}

type LeadQualificavel = Pick<Lead, 'company' | 'notes' | 'seniority' | 'daiseeScore' | 'createdAt'>

export function selecionarParaPreparo<T extends LeadQualificavel>(leads: T[], filtro: FiltroPreparo = {}) {
  const temFiltro = Boolean(filtro.faixas?.length) || filtro.minPontos !== undefined
  const incluirSemTriagem = filtro.incluirSemTriagem ?? !temFiltro

  const elegiveis: T[] = []
  const fora: { lead: T; motivo: string }[] = []

  for (const lead of leads) {
    const t = lerTriagem(lead.notes)
    if (semEmpregador(lead)) {
      fora.push({ lead, motivo: 'sem empregador identificável' })
    } else if (!t) {
      if (incluirSemTriagem) elegiveis.push(lead)
      else fora.push({ lead, motivo: 'sem triagem' })
    } else if (t.faixa === 'FORA') {
      fora.push({ lead, motivo: `triagem FORA (${t.pontos} pts)` })
    } else if (filtro.faixas?.length && !filtro.faixas.includes(t.faixa)) {
      fora.push({ lead, motivo: `faixa ${t.faixa} fora do filtro` })
    } else if (filtro.minPontos !== undefined && t.pontos < filtro.minPontos) {
      fora.push({ lead, motivo: `${t.pontos} pts, abaixo de ${filtro.minPontos}` })
    } else {
      elegiveis.push(lead)
    }
  }

  // Pontos da triagem primeiro; quem não tem triagem vai para o fim, pelo score.
  elegiveis.sort((a, b) => {
    const ta = lerTriagem(a.notes)
    const tb = lerTriagem(b.notes)
    if (ta && !tb) return -1
    if (!ta && tb) return 1
    return (
      (tb?.pontos ?? 0) - (ta?.pontos ?? 0) ||
      b.daiseeScore - a.daiseeScore ||
      a.createdAt.getTime() - b.createdAt.getTime()
    )
  })

  return { elegiveis, fora }
}
