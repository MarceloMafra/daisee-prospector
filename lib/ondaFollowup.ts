// Onda de follow-up (17/10/2026): quem aceitou o convite, recebeu o T2 e não
// respondeu. Em 17/10 eram 224 conectados sem resposta, 186 deles com o T2
// enviado há mais de 7 dias.
//
// Duas mensagens, nesta ordem:
//   1. DM no LinkedIn (LINKEDIN_FOLLOWUP) — 7 dias depois do T2;
//   2. e-mail (EMAIL_FOLLOWUP) — 3 dias depois da DM, só para quem tem e-mail.
// Nunca as duas no mesmo dia, e nenhuma para quem já respondeu.
//
// Este arquivo concentra as regras de quem entra e o texto. O envio e o ritmo
// ficam em scripts/onda-followup.ts, copiando as proteções do send-batch.
import { Anthropic } from '@anthropic-ai/sdk'
import { violacoesEmTexto, type Violacao } from './auditoriaClaims'
import { corrigirComCritica } from './refazerCopy'

export const DIAS_APOS_T2 = 7
export const DIAS_ENTRE_DM_E_EMAIL = 3
export const SEQUENCIA_DM = 6
export const SEQUENCIA_EMAIL = 7
export const LIMITE_DM = 500

const JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO']

export interface TouchDaOnda {
  type: string
  status: string
  sentAt: Date | null
  content?: string
  subject?: string | null
}

export interface LeadParaOnda {
  id: string
  name: string
  company: string
  seniority: string
  email: string | null
  daiseeScore: number
  linkedinProviderId: string | null
  linkedinConnectedAt: Date | null
  excludedFromAutomation: boolean
  profileText?: string | null
  interacoes: number
  touches: TouchDaOnda[]
}

export interface Veredito {
  ok: boolean
  motivo?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const dias = (de: Date, ate: Date) => (ate.getTime() - de.getTime()) / 86_400_000

function respondeu(l: LeadParaOnda) {
  return l.interacoes > 0 || l.touches.some((t) => t.status === 'RESPONDIDO')
}

function envio(l: LeadParaOnda, type: string) {
  return l.touches.find((t) => t.type === type && JA_SAIU.includes(t.status) && t.sentAt)
}

/** Alguma tentativa que deixou rastro: enviada, ou criada e nunca concluída. */
function pendenciaOuEnvio(l: LeadParaOnda, type: string) {
  return l.touches.find((t) => t.type === type && t.status !== 'FALHOU')
}

export function elegivelDm(l: LeadParaOnda, agora = new Date()): Veredito {
  if (l.excludedFromAutomation) return { ok: false, motivo: 'fora da automação' }
  if (respondeu(l)) return { ok: false, motivo: 'já respondeu' }
  if (!l.linkedinProviderId) return { ok: false, motivo: 'sem linkedinProviderId' }
  if (!l.linkedinConnectedAt) return { ok: false, motivo: 'não aceitou o convite' }
  const t2 = envio(l, 'LINKEDIN_500')
  if (!t2) return { ok: false, motivo: 'T2 ainda não saiu' }
  if (dias(t2.sentAt!, agora) < DIAS_APOS_T2) return { ok: false, motivo: `T2 há menos de ${DIAS_APOS_T2} dias` }
  const ja = pendenciaOuEnvio(l, 'LINKEDIN_FOLLOWUP')
  if (ja) return { ok: false, motivo: ja.status === 'AGENDADO' ? 'follow-up criado e não concluído (conferir à mão)' : 'follow-up já enviado' }
  return { ok: true }
}

export function elegivelEmail(l: LeadParaOnda, agora = new Date()): Veredito {
  if (l.excludedFromAutomation) return { ok: false, motivo: 'fora da automação' }
  if (respondeu(l)) return { ok: false, motivo: 'já respondeu' }
  if (!l.email || !EMAIL_RE.test(l.email)) return { ok: false, motivo: 'sem e-mail válido' }
  const dm = envio(l, 'LINKEDIN_FOLLOWUP')
  if (!dm) return { ok: false, motivo: 'a DM de follow-up ainda não saiu' }
  if (dias(dm.sentAt!, agora) < DIAS_ENTRE_DM_E_EMAIL) {
    return { ok: false, motivo: `DM há menos de ${DIAS_ENTRE_DM_E_EMAIL} dias` }
  }
  const ja = pendenciaOuEnvio(l, 'EMAIL_FOLLOWUP')
  if (ja) return { ok: false, motivo: ja.status === 'AGENDADO' ? 'e-mail criado e não concluído (conferir à mão)' : 'e-mail já enviado' }
  return { ok: true }
}

export const ASSINATURA_EMAIL = 'Marcelo Mafra\nMasterVendas'
export const RODAPE_DESCADASTRO =
  'Se preferir não receber mais mensagens minhas, basta responder “sair” que eu removo o seu contato.'

/** O descadastro é acrescentado pelo código, não pela IA: não pode depender de o modelo lembrar. */
export function corpoDoEmail(corpo: string) {
  return `${corpo.trim()}\n\n${ASSINATURA_EMAIL}\n\n${RODAPE_DESCADASTRO}`
}

const REGRAS = `REGRAS DE HONESTIDADE (inegociáveis — mensagem que violar qualquer uma é descartada):
- NUNCA alegue experiência, case ou cliente em um setor ("temos ajudado empresas do setor X", "outros clientes do segmento").
- NUNCA apresente repertório que a MasterVendas não tem: nada de "o que costuma funcionar", "vejo com frequência", "na maioria das vezes".
- NUNCA invente número de resultado, percentual de ganho, prazo ou economia.
- NUNCA descreva a DAISEE como automação. Ela é IA privada de gestão documental: o valor está em RECUPERAR (achar a norma, o parecer, o contrato), não em armazenar.
- A MasterVendas NÃO desenvolveu a DAISEE: somos PARCEIROS. Nunca "desenvolvemos", "criamos" ou "nossa IA".
- NUNCA declare a intenção para negá-la: nada de "sem compromisso", "não quero te vender nada", "sem segunda intenção".
- Ancore só em fato que está nas mensagens anteriores ou no perfil. Não invente nada sobre o lead nem sobre a empresa dele.
- NUNCA prometa nem afirme encaixe: nada de "é exatamente o cenário onde a DAISEE entrega mais valor", "é o perfil ideal", "vai resolver". Fale em PERGUNTA ou hipótese ("faz sentido avaliarmos juntos se...", "talvez valha uma conversa para ver se...").
- Cite no máximo UM detalhe do perfil, o mais ligado ao tema da abordagem inicial. Empilhar vários dados do perfil soa como leitura de currículo.`

export interface TextoGerado {
  conteudo: string
  assunto?: string
  violacoes: Violacao[]
  corrigido: boolean
}

function montarPrompt(l: LeadParaOnda, canal: 'LINKEDIN' | 'EMAIL') {
  const enviados = l.touches
    .filter((t) => JA_SAIU.includes(t.status) && t.content)
    .map((t) => `- ${t.type}${t.subject ? ` (assunto: ${t.subject})` : ''}: ${t.content}`)
    .join('\n')

  const formato =
    canal === 'LINKEDIN'
      ? `FORMATO: uma DM de LinkedIn, no máximo ${LIMITE_DM} caracteres, sem assunto, sem assinatura. Escreva só o texto da mensagem.`
      : `FORMATO: um e-mail curto (até 900 caracteres no corpo). Responda exatamente assim:
ASSUNTO: <assunto de até 60 caracteres, natural, sem "Re:" nem promessa>
---
<corpo do e-mail, sem assinatura e sem rodapé: eles são acrescentados depois>`

  return `Você escreve pelo Marcelo Mafra, fundador da MasterVendas, na prospecção B2B de compliance. Quem fala é o Marcelo (masculino): "avaliarmos juntos", nunca "juntas". Português brasileiro impecável, com todos os acentos.

SITUAÇÃO: ${l.name} aceitou o convite de conexão no LinkedIn e recebeu as mensagens abaixo, mas NÃO respondeu. ${
    canal === 'LINKEDIN'
      ? 'Esta é uma nova tentativa de retomar o diálogo, por DM. Ainda haverá um e-mail depois, então NUNCA escreva "última vez", "última tentativa" nem "por fim": use "mais uma vez" ou "uma vez mais".'
      : 'Esta é a ÚLTIMA mensagem da sequência: já houve uma DM no LinkedIn três dias antes. Pode dizer que é a última tentativa e citar a DM de passagem, sem repeti-la.'
  }

DADOS: ${l.name}, ${l.seniority}, ${l.company}.${l.profileText ? `\nPERFIL (resumo): ${l.profileText.substring(0, 1500)}` : ''}

MENSAGENS JÁ ENVIADAS A ${l.name.split(' ')[0].toUpperCase()}:
${enviados || '(nenhuma registrada)'}

ESTRUTURA (siga a ideia, com palavras suas, sem soar como modelo):
1. Abra reconhecendo, com leveza e sem culpar, que ele pode não ter conseguido ler as mensagens anteriores (rotina corrida, agenda cheia — escolha um motivo plausível e variado, nunca o mesmo para todos).
2. Reconheça que ele é um profissional qualificado e experiente NO TEMA que abriu a abordagem inicial (extraia o tema das mensagens já enviadas, em uma frase específica; não escreva "o tema" de forma genérica).
3. Diga que decidiu insistir uma vez mais, de forma educada e curta.
4. Feche com UM convite simples para retomar o diálogo (uma pergunta curta ou uma sugestão de conversa breve). A pergunta é calibrada pela senioridade: com diretor, head, superintendente ou C-level não peça que ele "mate a sua curiosidade".

${REGRAS}

${formato}
Não repita frases das mensagens anteriores. Não reapresente a empresa como se fosse o primeiro contato.
Responda só com o que foi pedido, sem comentário nem aspas em volta.`
}

function limpar(bruto: string) {
  return bruto.trim().replace(/^["'`]+|["'`]+$/g, '').trim()
}

/** Gera o texto, audita e tenta uma correção cirúrgica se a auditoria acusar algo. */
export async function gerarFollowup(l: LeadParaOnda, canal: 'LINKEDIN' | 'EMAIL'): Promise<TextoGerado> {
  const client = new Anthropic()
  const resp = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 900,
    messages: [{ role: 'user', content: montarPrompt(l, canal) }],
  })
  const bruto = resp.content[0].type === 'text' ? limpar(resp.content[0].text) : ''
  if (!bruto) return { conteudo: '', violacoes: [], corrigido: false }

  let assunto: string | undefined
  let conteudo = bruto
  if (canal === 'EMAIL') {
    const m = bruto.match(/^ASSUNTO:\s*(.+?)\s*\n-{3,}\s*\n([\s\S]+)$/i)
    if (m) {
      assunto = m[1].trim().slice(0, 60)
      conteudo = m[2].trim()
    }
  }

  let violacoes = violacoesEmTexto(`${assunto ?? ''}\n${conteudo}`)
  let corrigido = false
  if (violacoes.length) {
    const r = await corrigirComCritica(conteudo, violacoes)
    if (r.mudou) {
      conteudo = r.texto
      corrigido = true
      violacoes = violacoesEmTexto(`${assunto ?? ''}\n${conteudo}`)
    }
  }

  if (canal === 'LINKEDIN' && conteudo.length > LIMITE_DM) {
    violacoes = [...violacoes, { regra: 'TAMANHO', rotulo: `DM com ${conteudo.length} caracteres (limite ${LIMITE_DM})`, trecho: '' } as unknown as Violacao]
  }

  return { conteudo, assunto, violacoes, corrigido }
}
