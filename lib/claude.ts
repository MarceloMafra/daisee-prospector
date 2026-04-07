import { Anthropic } from '@anthropic-ai/sdk'

interface LeadInfo {
  name: string
  email: string
  company: string
  seniority: string
  daiseeScore: number
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

  const prompt = `Você é um especialista em vendas B2B no mercado brasileiro. Gere uma cadência de vendas com 5 touches TOTALMENTE EM PORTUGUÊS BRASILEIRO para o prospect abaixo. As mensagens devem ser naturais, personalizadas e adequadas ao mercado brasileiro.

**Dados do Prospect:**
- Nome: ${lead.name}
- Empresa: ${lead.company}
- Cargo: ${lead.seniority}
- E-mail: ${lead.email}
- Score DAISEE: ${lead.daiseeScore}/100

**Tom:** ${toneDescriptions[tone]}

Gere exatamente 5 touches na ordem e formato abaixo:

**T1: Mensagem LinkedIn (máx. 250 caracteres)**
Type: LINKEDIN_250
Channel: LINKEDIN
Content: [Mensagem curta no LinkedIn para iniciar uma conversa. Máx. 250 caracteres.]

**T2: Mensagem LinkedIn (máx. 500 caracteres)**
Type: LINKEDIN_500
Channel: LINKEDIN
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

    // Extract subject for emails
    let subject: string | undefined
    const subjectMatch = section.match(/Subject:\s*\[?([^\]]*)\]?/i)
    if (subjectMatch && channel === 'EMAIL') {
      subject = subjectMatch[1].trim().replace(/^["']|["']$/g, '')
    }

    // Extract content
    const contentMatch = section.match(
      /Content:\s*\[?([^[]*?)(?:\]|\n\*\*|$)/is
    )
    let content = contentMatch ? contentMatch[1].trim() : section.trim()

    // Clean up content - remove quotes and extra markers
    content = content
      .replace(/^["']|["']$/g, '')
      .replace(/\[|\]/g, '')
      .trim()

    // Only keep content up to 300 chars to be safe
    const MAX_CONTENT = 300
    if (content.length > MAX_CONTENT) {
      content = content.substring(0, MAX_CONTENT).trim()
    }

    // Truncate at last sentence to avoid incomplete sentences
    const lastPeriod = content.lastIndexOf('.')
    if (lastPeriod > 100) {
      content = content.substring(0, lastPeriod + 1)
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
        content: content.substring(0, 300), // Double-check truncation
        subject: subject || undefined,
      })
    }
  }

  // Ensure we have exactly 5 touches
  return touches.slice(0, 5)
}
