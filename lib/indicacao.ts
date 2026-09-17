// Indicação: o lead responde "quem cuida disso é a Fulana" e o contato certo
// passa a ser outra pessoa. Antes, isso virava trabalho manual — achar o perfil,
// cadastrar, enriquecer, gerar a cadência e arquivar a conversa — e a indicação
// se perdia no meio (Victor Neves, da Clara, indicou a Mariana Lage em 15/09).
//
// O fluxo tem um passo humano no meio de propósito: a busca do LinkedIn é
// aproximada, e cadastrar o homônimo errado queima a indicação.
import { Anthropic } from '@anthropic-ai/sdk'
import type { Lead } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  extractLinkedInIdentifier,
  getCurrentPosition,
  getLinkedInProfile,
  searchLinkedInPeople,
  type LinkedInPersonResult,
} from '@/lib/unipile'
import { enrichLeadFromLinkedIn } from '@/lib/enrichment'
import { calculateDAISEEScore } from '@/lib/daisee-score'
import { bloquearPreparo, motivoBloqueioPosEnriquecimento } from '@/lib/qualificacaoPreparo'

// ── Nota gravada no lead indicado ──────────────────────────────────────────
// A cadência lê a indicação das notas (lib/cadenciaGeneration.ts), então uma
// regeneração futura continua sabendo quem indicou.

const MARCA = 'INDICAÇÃO:'

export interface IndicacaoRegistrada {
  indicador: string
  empresaIndicador: string
  trecho: string
}

export function notaDeIndicacao(p: IndicacaoRegistrada & { data: Date; assunto?: string | null }) {
  const data = p.data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return [
    `${MARCA} ${p.indicador} (${p.empresaIndicador}) em ${data}.`,
    `Mensagem de quem indicou: "${p.trecho.replace(/\s+/g, ' ').trim()}"`,
    p.assunto ? `Assunto: ${p.assunto}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function lerIndicacao(notes?: string | null): IndicacaoRegistrada | null {
  const m = notes?.match(/INDICAÇÃO:\s*(.+?)\s*\((.+?)\)\s*em [\d/]+\.\s*\nMensagem de quem indicou:\s*"(.+)"/)
  return m ? { indicador: m[1], empresaIndicador: m[2], trecho: m[3] } : null
}

// ── Extração: quem foi indicado ────────────────────────────────────────────

export interface IndicacaoExtraida {
  nome: string
  empresa: string
  cargo: string | null
  assunto: string | null
}

export async function extrairIndicacao(p: {
  mensagem: string
  indicador: Pick<Lead, 'name' | 'company'>
}): Promise<IndicacaoExtraida | null> {
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `${p.indicador.name}, da empresa ${p.indicador.company}, respondeu a uma mensagem de prospecção com o texto abaixo. Diga se ele indicou OUTRA pessoa como o contato certo e, se sim, extraia os dados dessa pessoa.

MENSAGEM:
"${p.mensagem}"

Responda APENAS com um JSON, sem texto em volta:
{"indicou": true|false, "nome": "nome da pessoa indicada, como escrito", "empresa": "empresa dela; se a mensagem não disser, a empresa de quem indicou", "cargo": "cargo ou área, se a mensagem disser; senão null", "assunto": "o tema que a pessoa cuida, nas palavras da mensagem; senão null"}

Não invente nada que não esteja na mensagem. Se não houver indicação de pessoa com nome, responda {"indicou": false}.`,
      },
    ],
  })

  const texto = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const json = texto.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  try {
    const r = JSON.parse(json)
    if (!r.indicou || !String(r.nome ?? '').trim()) return null
    return {
      nome: String(r.nome).trim(),
      empresa: String(r.empresa ?? '').trim() || p.indicador.company,
      cargo: r.cargo ? String(r.cargo).trim() : null,
      assunto: r.assunto ? String(r.assunto).trim() : null,
    }
  } catch {
    return null
  }
}

// ── Busca: quem pode ser a pessoa ──────────────────────────────────────────

export interface CandidatoIndicacao {
  providerId: string
  nome: string
  headline: string
  localizacao: string
  url: string | null
  grau: string | null
  conexoesEmComum: number | null
  nomeConfere: boolean
  nomeAbreviado: boolean
  citaEmpresa: boolean
  // Veio da busca filtrada pela empresa atual de quem indicou: o sinal mais forte.
  naEmpresaDoIndicador: boolean
  leadExistente: { id: string; name: string } | null
}

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
const tokens = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !PARTICULAS.has(t))

// Primeiro nome igual e o último sobrenome presente. "Mariana M." não confere
// com "Mariana Lage": a inicial é de outro sobrenome.
export function nomeConfere(procurado: string, candidato: string): boolean {
  const p = tokens(procurado)
  const c = tokens(candidato)
  if (p.length === 0 || c.length === 0 || p[0] !== c[0]) return false
  if (p.length === 1) return true
  const ultimo = p[p.length - 1]
  return c.slice(1).some((t) => t === ultimo || (t.length === 1 && ultimo.startsWith(t)))
}

// Fora da rede, o LinkedIn mostra "Mariana M.": o sobrenome some, e isso não
// prova que é outra pessoa. Primeiro nome igual e só iniciais depois dele.
export function nomeAbreviado(procurado: string, candidato: string): boolean {
  const p = tokens(procurado)
  const c = tokens(candidato)
  return p.length > 0 && c.length > 1 && p[0] === c[0] && c.slice(1).every((t) => t.length === 1)
}

// Empresa ATUAL de quem indicou, pelo id do LinkedIn. É o filtro que separa a
// pessoa certa das homônimas.
export async function empresaIdDoIndicador(indicador: Pick<Lead, 'linkedinProviderId'>): Promise<string | null> {
  if (!indicador.linkedinProviderId) return null
  try {
    const perfil = await getLinkedInProfile(indicador.linkedinProviderId)
    return getCurrentPosition(perfil)?.company_id ?? null
  } catch {
    return null // sem o id, a busca segue só por palavra-chave
  }
}

export async function buscarCandidatos(
  nome: string,
  empresa: string,
  companyId?: string | null
): Promise<CandidatoIndicacao[]> {
  const vistos = new Map<string, LinkedInPersonResult>()
  const naEmpresa = new Set<string>()

  if (companyId) {
    for (const p of await searchLinkedInPeople(nome, 10, { companyIds: [companyId] })) {
      if (!p.id) continue
      vistos.set(p.id, p)
      naEmpresa.add(p.id)
    }
  }
  for (const termo of [`${nome} ${empresa}`, nome]) {
    for (const p of await searchLinkedInPeople(termo, 10)) {
      if (p.id && !vistos.has(p.id)) vistos.set(p.id, p)
    }
  }

  // "LinkedIn Member" é perfil fora da rede, sem nome: não há como confirmar quem é.
  const pessoas = [...vistos.values()].filter((p) => p.name && p.name !== 'LinkedIn Member')

  const existentes = await prisma.lead.findMany({
    where: { linkedinProviderId: { in: pessoas.map((p) => p.id!) } },
    select: { id: true, name: true, linkedinProviderId: true },
  })
  const existentePorId = new Map(existentes.map((l) => [l.linkedinProviderId!, { id: l.id, name: l.name }]))

  return pessoas
    .map((p) => ({
      providerId: p.id!,
      nome: p.name!,
      headline: p.headline ?? '',
      localizacao: p.location ?? '',
      url: p.public_profile_url ?? p.profile_url ?? null,
      grau: p.network_distance ?? null,
      conexoesEmComum: p.shared_connections_count ?? null,
      nomeConfere: nomeConfere(nome, p.name!),
      nomeAbreviado: nomeAbreviado(nome, p.name!),
      citaEmpresa: Boolean(p.headline) && mesmaEmpresaNoTexto(empresa, p.headline!),
      naEmpresaDoIndicador: naEmpresa.has(p.id!),
      leadExistente: existentePorId.get(p.id!) ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.naEmpresaDoIndicador) - Number(a.naEmpresaDoIndicador) ||
        Number(b.nomeConfere) - Number(a.nomeConfere) ||
        Number(b.citaEmpresa) - Number(a.citaEmpresa) ||
        (b.conexoesEmComum ?? 0) - (a.conexoesEmComum ?? 0)
    )
    .slice(0, 8)
}

// A headline é texto livre ("Compliance | Regulatório na Clara"), não um nome de
// empresa: procura as palavras da empresa entre as dela. Headline vazia ("--")
// não cita nada — tratar ausência como coincidência marcou a "Marina Clara
// Menezes Lage" como se citasse a Clara.
function mesmaEmpresaNoTexto(empresa: string, texto: string) {
  const palavras = tokens(texto)
  if (palavras.length === 0) return false
  return tokens(empresa).some((t) => t.length >= 3 && palavras.includes(t))
}

// ── Cadastro ───────────────────────────────────────────────────────────────

export interface ResultadoCadastro {
  lead: { id: string; name: string }
  jaExistia: boolean
  enriquecido: boolean
  bloqueio: string | null
  aviso: string | null
}

export class IndicacaoError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'IndicacaoError'
    this.status = status
  }
}

// Cria o lead indicado, enriquece o perfil, confere se a pessoa está mesmo na
// empresa da indicação e arquiva a conversa de quem indicou. A cadência fica
// para uma segunda chamada: enriquecer e gerar juntos passa do tempo de uma
// função na Vercel.
export async function cadastrarIndicacao(p: {
  interacaoId: string
  providerId?: string | null
  url?: string | null
  nome: string
  empresa: string
  cargo?: string | null
  assunto?: string | null
}): Promise<ResultadoCadastro> {
  const interacao = await prisma.interacao.findUnique({
    where: { id: p.interacaoId },
    include: { lead: true },
  })
  if (!interacao) throw new IndicacaoError('Interação não encontrada.', 404)
  const indicador = interacao.lead

  // Sem candidato na busca, a URL colada resolve o id do perfil.
  let providerId = p.providerId?.trim() || null
  if (!providerId && p.url) {
    const identificador = extractLinkedInIdentifier(p.url)
    if (!identificador) throw new IndicacaoError('URL do LinkedIn não reconhecida.', 400)
    providerId = (await getLinkedInProfile(identificador)).provider_id ?? null
  }
  if (!providerId) throw new IndicacaoError('Escolha um perfil ou cole a URL do LinkedIn da pessoa indicada.', 400)
  if (providerId === indicador.linkedinProviderId) {
    throw new IndicacaoError('Esse perfil é de quem indicou, não da pessoa indicada.', 400)
  }

  const arquivarConversa = async (novo: { id: string; name: string }, jaExistia: boolean) => {
    await prisma.interacao.update({ where: { id: interacao.id }, data: { status: 'ARQUIVADA' } })
    await prisma.auditLog.create({
      data: {
        leadId: indicador.id,
        action: 'INDICOU_CONTATO',
        details: `Indicou ${novo.name} (${p.empresa})${jaExistia ? ', que já estava na base' : ''}. Conversa arquivada pelo painel.`,
      },
    })
  }

  const existente = await prisma.lead.findFirst({ where: { linkedinProviderId: providerId } })
  if (existente) {
    await arquivarConversa(existente, true)
    return {
      lead: { id: existente.id, name: existente.name },
      jaExistia: true,
      enriquecido: Boolean(existente.profileText),
      bloqueio: null,
      aviso: `${existente.name} já estava na base — nada foi criado. Confira a cadência dela antes de abordar.`,
    }
  }

  const cargo = p.cargo?.trim() || 'Indicação — cargo a confirmar'
  const score = calculateDAISEEScore({ seniority: cargo, companySize: 'MEDIA', segmentMatch: 50 })
  const linkedinUrl = p.url?.trim() || `https://www.linkedin.com/in/${providerId}`

  const novo = await prisma.lead.create({
    data: {
      name: p.nome.trim(),
      company: p.empresa.trim(),
      seniority: cargo,
      linkedinUrl,
      profileUrl: linkedinUrl,
      linkedinProviderId: providerId,
      notes: notaDeIndicacao({
        indicador: indicador.name,
        empresaIndicador: indicador.company,
        trecho: interacao.mensagem,
        data: interacao.recebidaEm,
        assunto: p.assunto,
      }),
      daiseeScore: score.score,
      decisionPower: score.decisionPower,
      companySize: 'MEDIA',
      segmentMatch: score.segmentMatch,
      status: 'PROSPECTANDO',
      // Indicação de quem está dentro da empresa vale mais que o score do cargo.
      priority: 'ALTA',
    },
  })

  await prisma.auditLog.create({
    data: {
      leadId: novo.id,
      action: 'LEAD_INDICADO',
      details: `Cadastrado a partir da indicação de ${indicador.name} (${indicador.company}).`,
    },
  })
  await arquivarConversa(novo, false)

  let enriquecido = false
  let bloqueio: string | null = null
  let aviso: string | null = null
  try {
    const e = await enrichLeadFromLinkedIn(novo, {})
    enriquecido = true
    bloqueio = motivoBloqueioPosEnriquecimento({
      empresaNaLista: p.empresa,
      empresaNoPerfil: (e.fieldsToUpdate.company as string | undefined) ?? p.empresa,
      profileText: e.profileText,
    })
    if (bloqueio) await bloquearPreparo(novo.id, bloqueio)
  } catch (err) {
    aviso = `O lead foi criado, mas o enriquecimento falhou (${err instanceof Error ? err.message.split('\n')[0] : err}). Enriqueça pela ficha antes de gerar a cadência.`
  }

  const atualizado = await prisma.lead.findUnique({ where: { id: novo.id }, select: { id: true, name: true } })
  return { lead: atualizado ?? { id: novo.id, name: novo.name }, jaExistia: false, enriquecido, bloqueio, aviso }
}
