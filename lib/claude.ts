import OpenAI from 'openai'

interface LeadInfo {
  name: string
  email: string
  company: string
  seniority: string
  daiseeScore: number
  profileText?: string | null
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
  const client = new OpenAI()

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

  const prompt = `Você é um especialista em vendas B2B no mercado brasileiro. Gere uma cadência de vendas com 5 touches TOTALMENTE EM PORTUGUÊS BRASILEIRO para o prospect abaixo. As mensagens devem ser naturais, ALTAMENTE PERSONALIZADAS com base no perfil real do LinkedIn, e adequadas ao mercado brasileiro.

**Dados do Prospect:**
- Nome: ${lead.name}
- Empresa: ${lead.company}
- Cargo: ${lead.seniority}
- E-mail: ${lead.email}
- Score DAISEE: ${lead.daiseeScore}/100

${profileSection}

**Tom:** ${toneDescriptions[tone]}

Gere exatamente 5 touches na ordem e formato abaixo:

**T1: Mensagem LinkedIn (máx. 250 caracteres)**
Type: LINKEDIN_250
Channel: LINKEDIN
Content: [Mensagem curta no LinkedIn para iniciar uma conversa. Máx. 250 caracteres.]

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
- Se o perfil do LinkedIn foi fornecido, use informações MUITO ESPECÍFICAS: cite projetos reais, empresas anteriores pelo nome, resultados concretos mencionados no perfil, números, tecnologias, iniciativas específicas — o prospect deve sentir que você leu cada linha do perfil dele
- NUNCA escreva mensagens genéricas. Cada mensagem deve conter pelo menos 2 referências diretas a algo específico do perfil do prospect
- **Cargo recente:** Se o cargo atual do prospect foi iniciado há 9 meses ou menos (contando a partir da data de hoje), mencione isso como gancho de abertura no T1 ou T2 — ex: "Parabéns pelo novo cargo de X na Y!" Calcule a partir da data de início informada no perfil. Se a data de início tiver mais de 9 meses, NÃO use esse gancho.
- Cada touch deve construir sobre os anteriores e avançar a conversa
- Tom deve ser ${tone === 'CONSULTIVO' ? 'consultivo e educativo, fazendo perguntas abertas que demonstram conhecimento do contexto do prospect' : tone === 'DIRETO' ? 'direto e objetivo, destacando proposta de valor com clareza' : 'criativo, usando storytelling e ângulos inusitados'}
- Assuntos de e-mail devem ser específicos ao contexto do prospect, nunca genéricos
- E-mails devem terminar com: "Abraço,\\n[Seu nome]"
- Mensagens LinkedIn NÃO têm assinatura
- NÃO invente nomes, cargos ou empresas que não estejam no perfil
- Use linguagem natural do mercado brasileiro, evite traduções literais
- Inclua CTAs específicos: perguntas abertas no LinkedIn, links de agendamento nos e-mails

Retorne APENAS os 5 touches no formato especificado acima, com os marcadores claros para cada campo.`

  const message = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 3000,
    messages: [
      {
        role: 'system',
        content: `Você é um copywriter especialista em vendas B2B consultivas no mercado brasileiro. Sua principal habilidade é escrever mensagens ALTAMENTE PERSONALIZADAS que fazem o prospect sentir que você o estudou profundamente. NUNCA escreva mensagens genéricas. SEMPRE cite informações específicas do perfil: nomes de projetos, empresas anteriores, resultados com números, iniciativas específicas, tecnologias mencionadas. Se o perfil não tiver dados suficientes, use os dados básicos disponíveis mas seja criativo e relevante para o cargo/setor.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  // Parse the response
  const responseText = message.choices[0]?.message?.content || ''
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
    const subjectMatch = section.match(/Subject:\s*\[?([^\]\n\r]*)\]?/i)
    if (subjectMatch && channel === 'EMAIL') {
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
      LINKEDIN_250: 300,
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
