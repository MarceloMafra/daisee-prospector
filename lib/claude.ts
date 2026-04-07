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
      'Consultative and educational tone, asking questions to understand their needs, positioning as a trusted advisor',
    DIRETO:
      'Direct and straight-to-the-point, highlighting specific value proposition and benefits',
    CRIATIVO:
      'Creative and engaging tone, using storytelling and unique angles to capture attention',
  }

  const prompt = `Generate a 5-touch sales cadence for this prospect. Keep each message SHORT (max 200 chars for LinkedIn, max 300 chars for email body):

**Prospect Details:**
- Name: ${lead.name}
- Company: ${lead.company}
- Position: ${lead.seniority}
- Email: ${lead.email}
- DAISEE Score: ${lead.daiseeScore}/100

**Tone:** ${toneDescriptions[tone]}

Generate exactly 5 touches in this specific order and format:

**T1: LinkedIn Message (250 chars max)**
Type: LINKEDIN_250
Channel: LINKEDIN
Content: [Write a compelling LinkedIn message that starts a conversation. Max 250 characters.]

**T2: LinkedIn Message (500 chars max)**
Type: LINKEDIN_500
Channel: LINKEDIN
Content: [Follow-up LinkedIn message with more context about how you can help. Max 500 characters.]

**T3: Email with Subject**
Type: EMAIL_T3
Channel: EMAIL
Subject: [Compelling email subject line, max 60 chars]
Content: [Email body with clear value proposition and CTA]

**T4: Email with Subject**
Type: EMAIL_T4
Channel: EMAIL
Subject: [Different angle subject line, max 60 chars]
Content: [Email body from a different perspective, acknowledging lack of response]

**T5: Email with Subject**
Type: EMAIL_T5
Channel: EMAIL
Subject: [Final touch subject line, max 60 chars]
Content: [Final email with clear CTA and next steps]

Important:
- All content should be personalized to the prospect
- Each touch should build on previous ones
- Tone should be ${tone.toLowerCase()}
- Subject lines should be compelling and varied
- Content should be professional but engaging
- Include specific CTAs in each message

Return ONLY the 5 touches in the format specified above, with clear markers for each field.`

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
