import { Anthropic } from '@anthropic-ai/sdk'

interface LeadInfo {
  name: string
  email?: string | null
  company: string
  seniority: string
  daiseeScore: number
  profileText?: string | null
  companyContext?: string | null
}

interface GeneratedTouch {
  sequence: number
  type: 'LINKEDIN_250' | 'LINKEDIN_500' | 'EMAIL_T3' | 'EMAIL_T4' | 'EMAIL_T5'
  channel: 'LINKEDIN' | 'EMAIL'
  content: string
  subject?: string
}

export async function generateCadencia(
  lead: LeadInfo,
  tone: 'CONSULTIVO' | 'DIRETO' | 'CRIATIVO' = 'CONSULTIVO'
): Promise<GeneratedTouch[]> {
  const client = new Anthropic()

  const toneDescriptions = {
    CONSULTIVO:
      'Tom consultivo e educativo, fazendo perguntas para entender as necessidades do prospect, posicionando-se como um consultor de confiança',
    DIRETO:
      'Tom direto e objetivo, destacando a proposta de valor e os benefícios de forma clara e sem rodeios',
    CRIATIVO:
      'Tom criativo e envolvente, usando storytelling e ângulos únicos para capturar a atenção do prospect',
  }

  const profileSection = lead.profileText
    ? `**Perfil Completo do LinkedIn (use estas informações para personalizar ao máximo):**
${lead.profileText.substring(0, 3000)}

`
    : `**Atenção:** Perfil do LinkedIn não disponível. Use apenas os dados básicos abaixo para personalizar.

`

  const companyContextSection = lead.companyContext
    ? `**Contexto Estratégico da Empresa ${lead.company} (fonte: Sales Navigator — use para referenciar prioridades e desafios reais da empresa nas mensagens):**
${lead.companyContext.substring(0, 2000)}

`
    : ''

  const prompt = `Você é um especialista em vendas B2B no mercado brasileiro. Gere uma cadência de vendas com 5 touches TOTALMENTE EM PORTUGUÊS BRASILEIRO para o prospect abaixo. As mensagens devem ser naturais, ALTAMENTE PERSONALIZADAS com base no perfil real do LinkedIn, e adequadas ao mercado brasileiro.

**Dados do Prospect:**
- Nome: ${lead.name}
- Empresa: ${lead.company}
- Cargo: ${lead.seniority}
${lead.email ? `- E-mail: ${lead.email}\n` : ''}- Score DAISEE: ${lead.daiseeScore}/100

${profileSection}${companyContextSection}**Tom:** ${toneDescriptions[tone]}

Gere exatamente 5 touches na ordem e formato abaixo:

**T1: Mensagem LinkedIn (máx. 200 caracteres — limite atual do LinkedIn para convite de conexão)**
Type: LINKEDIN_250
Channel: LINKEDIN
Subject: [Título/assunto do InMail, máx. 40 caracteres]
Content: [Mensagem curta no LinkedIn para iniciar uma conversa. IMPORTANTE: máximo 200 caracteres — mire em ~180 para ter margem de segurança.]

**T2: Mensagem LinkedIn (máx. 500 caracteres)**
Type: LINKEDIN_500
Channel: LINKEDIN
Subject: [Título/assunto da mensagem LinkedIn, máx. 40 caracteres]
Content: [Mensagem de follow-up no LinkedIn com mais contexto sobre como você pode ajudar. Máx. 500 caracteres.]

**T3: E-mail com Assunto**
Type: EMAIL_T3
Channel: EMAIL
Subject: [Assunto do e-mail chamativo, máx. 60 caracteres]
Content: [Corpo do e-mail com proposta de valor clara e chamada para ação]

**T4: E-mail com Assunto**
Type: EMAIL_T4
Channel: EMAIL
Subject: [Assunto com ângulo diferente, máx. 60 caracteres]
Content: [Corpo do e-mail de uma perspectiva diferente, reconhecendo a falta de resposta]

**T5: E-mail com Assunto**
Type: EMAIL_T5
Channel: EMAIL
Subject: [Assunto do último touch, máx. 60 caracteres]
Content: [E-mail final com CTA claro e próximos passos]

Regras importantes:
- ESCREVA TUDO EM PORTUGUÊS BRASILEIRO
- Se o perfil do LinkedIn foi fornecido, use informações específicas: experiências anteriores, empresas onde trabalhou, formação, conquistas, interesses — para tornar as mensagens únicas e relevantes
- Evite mensagens genéricas — o prospect deve sentir que você realmente o conhece
- **Cargo recente:** Se o cargo atual do prospect foi iniciado há 9 meses ou menos (contando a partir da data de hoje), mencione isso como gancho de abertura no T1 ou T2 — ex: "Parabéns pelo novo cargo de X na Y!" Calcule a partir da data de início informada no perfil. Se a data de início tiver mais de 9 meses, NÃO use esse gancho.
- Todo conteúdo deve ser personalizado para o prospect
- Cada touch deve construir sobre os anteriores
- Tom deve ser ${tone === 'CONSULTIVO' ? 'consultivo' : tone === 'DIRETO' ? 'direto' : 'criativo'}
- Assuntos de e-mail devem ser variados e chamativos
- Conteúdo deve ser profissional mas envolvente
- Inclua chamadas para ação específicas em cada mensagem
- Use linguagem natural do mercado brasileiro, evite traduções literais

Retorne APENAS os 5 touches no formato especificado acima, com os marcadores claros para cada campo.`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Parse the response
  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : ''
  const touches = parseCadenciaResponse(responseText)

  return touches
}

export interface SugestaoContexto {
  lead: LeadInfo & { notes?: string | null }
  touchesEnviados: Array<{ sequence: number; type: string; content: string }>
  historicoConversa: Array<{ de: 'NOS' | 'LEAD'; texto: string }>
  mensagemNova: string
  recebidaEm?: Date | null // quando o lead escreveu — evita erro de "amanhã/hoje"
}

export interface SugestaoResposta {
  leitura: string // como a IA interpretou a resposta do lead
  temperatura: 'QUENTE' | 'MORNO' | 'FRIO' | 'NEGATIVO'
  sugestao: string // a réplica pronta para o SDR revisar e enviar
}

// Lê a resposta de um lead no contexto da cadência já enviada e sugere a réplica.
// Nunca envia nada — a saída é sempre revisada por uma pessoa antes de ir.
export async function sugerirRespostaParaLead(ctx: SugestaoContexto): Promise<SugestaoResposta> {
  const client = new Anthropic()

  const perfil = ctx.lead.profileText
    ? `PERFIL DO LEAD NO LINKEDIN:\n${ctx.lead.profileText.substring(0, 2500)}\n`
    : ''
  const empresa = ctx.lead.companyContext
    ? `CONTEXTO DA EMPRESA:\n${ctx.lead.companyContext.substring(0, 1500)}\n`
    : ''
  const cadencia = ctx.touchesEnviados
    .map((t) => `[T${t.sequence} — ${t.type}] ${t.content}`)
    .join('\n\n')
  const historico = ctx.historicoConversa
    .map((m) => `${m.de === 'NOS' ? 'MARCELO' : ctx.lead.name.toUpperCase()}: ${m.texto}`)
    .join('\n')

  const fmt = (d: Date) =>
    d.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
  const agora = `HOJE É ${fmt(new Date())} (horário de Brasília).`
  const quando = ctx.recebidaEm ? ` A mensagem do lead chegou em ${fmt(ctx.recebidaEm)}.` : ''

  // Histórico de negociação registrado manualmente (briefing de reunião etc).
  const notas = ctx.lead.notes?.trim()
    ? `HISTÓRICO INTERNO DESTE LEAD (registrado pela equipe — pode conter reuniões já realizadas e combinados em aberto):\n${ctx.lead.notes.substring(0, 2500)}\n`
    : ''

  const prompt = `Você assessora Marcelo Mafra, fundador da MasterVendas, na prospecção B2B pelo LinkedIn.
Ele vende duas soluções: a DAISEE (IA privada de gestão documental — indexa normas, POPs, contratos e evidências, permite "conversar" com esses documentos e compara versões, tudo em ambiente fechado do cliente) e o MASTERBOT (plataforma de gestão de atendimento em WhatsApp, com painel, indicadores, histórico e supervisão).

Um lead respondeu a uma mensagem da cadência. Sua tarefa é ler a resposta e sugerir a réplica que o Marcelo deve enviar.

${agora}${quando}

${perfil}${empresa}${notas}
CARGO: ${ctx.lead.seniority}
EMPRESA: ${ctx.lead.company}

MENSAGENS QUE JÁ ENVIAMOS NA CADÊNCIA:
${cadencia || '(nenhuma registrada)'}

HISTÓRICO DA CONVERSA:
${historico}

ÚLTIMA MENSAGEM DO LEAD (é a esta que devemos responder):
"${ctx.mensagemNova}"

REGRAS PARA A RÉPLICA:
- Português do Brasil, tom consultivo e humano, primeira pessoa (é o Marcelo falando).
- Continue a conversa de onde ela parou. NUNCA repita o que já foi dito na cadência nem reapresente a empresa se ela já foi apresentada.
- Se o lead só respondeu por cortesia ao convite (ex.: "claro, pode me adicionar"), o objetivo é abrir assunto de negócio com naturalidade — uma pergunta sobre a rotina/desafio dele, ancorada no cargo e na empresa. NÃO faça pitch ainda.
- Se o lead demonstrou interesse concreto, o objetivo é propor uma conversa de 15 a 20 minutos, oferecendo escolha de horário.
- Se o lead levantou objeção ou desinteresse, responda com respeito, sem insistir, deixando a porta aberta.
- Se o lead puxou assunto pessoal ou fora do tema (política, mercado, carreira), acompanhe o assunto com genuinidade e só então faça a ponte para o trabalho dele — sem forçar.
- Máximo de 600 caracteres. Sem emoji. Sem "espero que esteja bem". Sem jargão de vendas.
- Não invente fatos sobre a empresa do lead nem prometa números.
- Ortografia impecável em português, COM todos os acentos e a pontuação correta.
- Atenção às datas: use a data de hoje informada acima para dizer "hoje", "amanhã" ou "semana que vem". Se o histórico interno indica que uma reunião JÁ aconteceu, jamais fale dela como se fosse acontecer.
- Se o histórico interno mostra combinados em aberto (material a enviar, retorno prometido), a réplica deve respeitar e dar sequência a eles.

Responda EXATAMENTE neste formato, sem nenhum texto extra:

LEITURA: <uma frase sobre o que o lead quis dizer e o que ele espera agora>
TEMPERATURA: <QUENTE, MORNO, FRIO ou NEGATIVO>
SUGESTAO: <a mensagem pronta para enviar>`

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const leitura = text.match(/LEITURA:\s*([\s\S]*?)(?=\nTEMPERATURA:|$)/i)?.[1]?.trim() || ''
  const temperaturaRaw = text.match(/TEMPERATURA:\s*(\w+)/i)?.[1]?.toUpperCase() || 'MORNO'
  const sugestao = text.match(/SUGESTAO:\s*([\s\S]*)$/i)?.[1]?.trim() || text.trim()

  const temperatura = (['QUENTE', 'MORNO', 'FRIO', 'NEGATIVO'].includes(temperaturaRaw)
    ? temperaturaRaw
    : 'MORNO') as SugestaoResposta['temperatura']

  return { leitura, temperatura, sugestao }
}

function parseCadenciaResponse(text: string): GeneratedTouch[] {
  const touches: GeneratedTouch[] = []

  // Split by T1, T2, T3, T4, T5 markers
  const sections = text.split(/\*\*T[1-5]:/i)

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i]
    const sequence = i

    // Extract type from the beginning of section
    const typeMatch = section.match(
      /(?:LINKEDIN_250|LINKEDIN_500|EMAIL_T[345])/i
    )
    const type = typeMatch ? typeMatch[0].toUpperCase() : `EMAIL_T${i}`

    // Determine channel
    const channel = type.includes('LINKEDIN') ? 'LINKEDIN' : 'EMAIL'

    // Extract subject (emails and LinkedIn T2)
    let subject: string | undefined
    const subjectMatch = section.match(/Subject:\s*\[?([^\]\n\r]*?)(?:\s*Content:|\]|$)/i)
    if (subjectMatch) {
      subject = subjectMatch[1].trim().replace(/^["']|["']$/g, '')
    }

    // Extract content — capture everything after Content: until the next **T marker or end
    const contentMatch = section.match(/Content:\s*\[?([\s\S]*?)(?=\n\*\*T[2-5]:|$)/i)
    let content = contentMatch ? contentMatch[1].trim() : section.trim()

    // Clean up content - remove wrapping quotes and brackets
    content = content
      .replace(/^["']|["']$/g, '')
      .replace(/^\[|\]$/g, '')
      .trim()

    // Per-type content limits
    const maxByType: Record<string, number> = {
      LINKEDIN_250: 200, // limite atual do LinkedIn para nota de convite
      LINKEDIN_500: 600,
    }
    const maxContent = maxByType[type] ?? 2000

    if (content.length > maxContent) {
      content = content.substring(0, maxContent).trim()
      // Truncate at last complete sentence
      const lastPeriod = content.lastIndexOf('.')
      if (lastPeriod > 50) {
        content = content.substring(0, lastPeriod + 1)
      }
    }

    if (content.length > 0) {
      // Ensure subject is within limits
      if (subject && subject.length > 100) {
        subject = subject.substring(0, 100)
      }

      touches.push({
        sequence,
        type: type as GeneratedTouch['type'],
        channel,
        content,
        subject: subject || undefined,
      })
    }
  }

  // Ensure we have exactly 5 touches
  return touches.slice(0, 5)
}
