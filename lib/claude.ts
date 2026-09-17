import { Anthropic } from '@anthropic-ai/sdk'

interface LeadInfo {
  name: string
  email?: string | null
  company: string
  seniority: string
  daiseeScore: number
  profileText?: string | null
  companyContext?: string | null
  // Quem indicou este lead e o que escreveu (lib/indicacao.ts).
  indicacao?: { indicador: string; empresaIndicador: string; trecho: string } | null
}

interface GeneratedTouch {
  sequence: number
  type: 'LINKEDIN_250' | 'LINKEDIN_500' | 'EMAIL_T3' | 'EMAIL_T4' | 'EMAIL_T5'
  channel: 'LINKEDIN' | 'EMAIL'
  content: string
  subject?: string
}

// Touch que o lead já recebeu. Entra no prompt só como contexto, para a
// regeneração não repetir o que ele já leu nem reapresentar a empresa.
export interface TouchJaEnviado {
  sequence: number
  type: string
  subject?: string | null
  content: string
}

export async function generateCadencia(
  lead: LeadInfo,
  tone: 'CONSULTIVO' | 'DIRETO' | 'CRIATIVO' = 'CONSULTIVO',
  jaEnviados: TouchJaEnviado[] = []
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

  const enviadosSection = jaEnviados.length
    ? `**JÁ ENVIADO A ESTE LEAD — contexto apenas (estes touches não serão reescritos):**
${jaEnviados
  .map((t) => `T${t.sequence} (${t.type})${t.subject ? ` — assunto: ${t.subject}` : ''}: ${t.content}`)
  .join('\n')}

Os touches acima já foram lidos pelo lead. Não os repita, não reapresente a empresa como se fosse o primeiro contato e mantenha a mesma voz. Se algum deles contiver afirmação que hoje seria proibida pelas REGRAS DE HONESTIDADE abaixo, NÃO a reforce nem a retome — siga adiante sem mencioná-la.

`
    : ''

  // A indicação é o melhor gancho que a cadência pode ter, e o mais fácil de
  // estragar: o indicador apontou quem cuida do tema, não recomendou a DAISEE.
  const indicacaoSection = lead.indicacao
    ? `**INDICAÇÃO — este é o eixo da cadência:**
${lead.indicacao.indicador} (${lead.indicacao.empresaIndicador}) indicou ${lead.name} como a pessoa certa para esta conversa. O que ${lead.indicacao.indicador} escreveu ao Marcelo, palavra por palavra: "${lead.indicacao.trecho}"
- Abra o T1 pela indicação, curto e natural, por exemplo: "${lead.name.split(' ')[0]}, ${lead.indicacao.indicador.split(' ')[0]}, da ${lead.indicacao.empresaIndicador}, comentou que você cuida de ... Posso te adicionar?". Não use artigo antes do nome de quem indicou.
- Cite SÓ o que está no trecho acima. Não invente o que foi dito, nem proximidade entre quem indicou e o Marcelo.
- Quem indicou apontou quem cuida do tema — NÃO endossou a DAISEE nem a MasterVendas. Nunca escreva que ele recomendou a solução.
- A indicação pode voltar uma vez nos touches seguintes, sem virar bordão.

`
    : ''

  const prompt = `Você assessora Marcelo Mafra, fundador da MasterVendas, na prospecção B2B. Gere uma cadência de vendas com 5 touches TOTALMENTE EM PORTUGUÊS BRASILEIRO para o prospect abaixo. Quem escreve e assina todas as mensagens é o Marcelo — homem. Faça toda concordância de gênero da PRIMEIRA PESSOA no masculino ("prefiro ser honesto", "fico à disposição"), independentemente do gênero do prospect. As mensagens devem ser naturais, ALTAMENTE PERSONALIZADAS com base no perfil real do LinkedIn, e adequadas ao mercado brasileiro.

**Dados do Prospect:**
- Nome: ${lead.name}
- Empresa: ${lead.company}
- Cargo: ${lead.seniority}
${lead.email ? `- E-mail: ${lead.email}\n` : ''}- Score DAISEE: ${lead.daiseeScore}/100

${indicacaoSection}${profileSection}${companyContextSection}${enviadosSection}**Tom:** ${toneDescriptions[tone]}

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
- Quem fala é o Marcelo (masculino). Nunca flexione a primeira pessoa no feminino para acompanhar o gênero do prospect — "avaliarmos juntos", nunca "juntas"

REGRAS DE HONESTIDADE (inegociáveis — mensagem que violar qualquer uma é descartada):
- NUNCA alegue experiência, case ou cliente em um setor. Nada de "temos ajudado empresas/líderes/áreas do setor X", "outros clientes do mesmo segmento", "os bancos estrangeiros que atendemos", "nossos clientes de seguros". Vale para qualquer forma de dizer a mesma coisa, inclusive em oração subordinada. Se falta case no setor do lead, DIGA que falta e peça o contexto dele — vale mais que case inventado.
- NUNCA apresente repertório que a MasterVendas não tem: nada de "o que costuma funcionar nesses casos", "vejo com frequência", "na maioria das vezes", "o padrão que a gente observa". Esses casos não foram acumulados. Em vez de receita pronta, faça pergunta.
- NUNCA invente número de resultado ("reduz 40% do tempo", "economia de 60%"). O único dado público é o depoimento de um cliente (Dinamica Merchandising) sobre 70% do tempo de busca de documentos — e ele só pode ser citado como depoimento daquele cliente, nunca como promessa ao lead.
- NUNCA descreva a DAISEE como automação. Ela NÃO automatiza workflow, NÃO faz due diligence de terceiros e NÃO monitora risco.
- A MasterVendas NÃO desenvolveu a DAISEE: somos PARCEIROS da DAISEE. Nunca escreva "desenvolvemos a DAISEE", "criamos a DAISEE", "nossa IA", "IA que desenvolvo" nem qualquer forma de reivindicar a autoria do produto. Diga "somos parceiros da DAISEE" ou "trabalho com a DAISEE". O lead checa o fornecedor em um clique: autoria falsa derruba a credibilidade da mensagem inteira.
- A DAISEE é uma IA privada de gestão documental: repositório criptografado em data center próprio (aderente a LGPD e GDPR), ingestão com OCR inclusive de PDF escaneado, indexação e classificação automáticas, chat em linguagem natural sobre o acervo citando o documento de origem, comparação de versões e insights. Módulos: CHAT, DOCS e INSIGHTS.
- NUNCA declare a própria intenção para negá-la: nada de "sem segunda intenção", "não quero te vender nada", "sem compromisso", "isso não é um pitch". É afirmação falsa — há segunda intenção sim, e o lead sabe disso intuitivamente. O que torna o contato legítimo é a pergunta agregar valor, não a promessa de que não há venda no fim. Isso vale para qualquer variação da fórmula, inclusive "sem compromisso de tempo" — para falar de duração, diga a duração ("leva 15 minutos").
- Ancore sempre em fato verificável sobre a empresa ou a trajetória do lead, nunca em suposição sobre a dor dele apresentada como certeza.

POSICIONAMENTO (o eixo da mensagem, não uma lista de recursos):
- A DAISEE resolve RECUPERAÇÃO, não armazenamento. Todo lead já guarda os documentos em algum lugar — banco de dados, GED, SharePoint, rede. O que dói é ACHAR. Escreva sobre localizar a norma, o parecer, a evidência de auditoria, a versão que estava vigente numa data — não sobre onde o arquivo mora.
- Lembre do acervo que os sistemas atuais guardam mas não leem: PDF escaneado, imagem, áudio e vídeo estão armazenados e o CONTEÚDO deles não é indexado. É o ponto onde a busca em linguagem natural muda o jogo, e vale mais que qualquer recurso técnico citado por nome.
- CALIBRE A PERGUNTA PELA SENIORIDADE. Com diretor, superintendente, head, sócio ou C-level, não peça que ele mate a sua curiosidade ("fiquei curioso", "queria entender", "uma curiosidade genuína"): é pedir favor a quem não tem tempo. Faça uma pergunta fechada, do terreno técnico dele, que se responda em uma linha — de preferência pedindo um número ou uma escolha entre duas alternativas. A fórmula da curiosidade continua boa com analista, coordenador e gerente.

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
- Nunca alegue case, cliente ou experiência em um setor. Isso vale para qualquer forma de dizer a mesma coisa: "temos ajudado empresas do setor X", "os bancos estrangeiros que atendemos", "nossos clientes de seguros", "empresas como a sua que já atendemos". Faltando case, diga que falta e peça o contexto do lead.
- Nunca apresente repertório que a MasterVendas não tem: nada de "o que costuma funcionar nesses casos", "vejo com frequência", "na maioria das vezes", "o padrão que a gente observa". Você não acumulou esses casos. Em vez de receita pronta, faça pergunta.
- Nunca descreva a DAISEE como automação: ela é IA privada de gestão documental (repositório criptografado em data center próprio, OCR, indexação automática, chat sobre o acervo citando a fonte, comparação de versões). Não automatiza workflow nem monitora risco.
- A MasterVendas é PARCEIRA da DAISEE, não a desenvolvedora. Nunca escreva "desenvolvemos", "criamos" nem "nossa IA" ao falar dela: use "somos parceiros da DAISEE" ou "trabalho com a DAISEE".
- Nunca declare a intenção para negá-la: nada de "sem segunda intenção", "não quero te vender nada", "sem compromisso", "não é um pitch". É afirmação falsa — a segunda intenção existe e o lead sabe. A legitimidade vem de a pergunta agregar valor a ele, não de negar o interesse comercial. Isso vale para qualquer variação da fórmula, inclusive "sem compromisso de tempo" — para falar de duração, diga a duração ("leva 15 minutos").
- Ortografia impecável em português, COM todos os acentos e a pontuação correta.
- Atenção às datas: use a data de hoje informada acima para dizer "hoje", "amanhã" ou "semana que vem". Se o histórico interno indica que uma reunião JÁ aconteceu, jamais fale dela como se fosse acontecer.
- Se o histórico interno mostra combinados em aberto (material a enviar, retorno prometido), a réplica deve respeitar e dar sequência a eles.
- OBJEÇÃO "ISSO JÁ ESTÁ RESOLVIDO AQUI" (banco de dados, GED, SharePoint, rede, "já é tudo digital"): não confronte — CONCEDA e DESLOQUE. Dê razão ao lead sobre o armazenamento e mova a conversa para a recuperação: quando alguém da equipe precisa localizar uma norma, um parecer ou uma evidência para auditoria, como é essa busca no dia a dia? A DAISEE atua na camada de recuperação e consulta, não na de armazenamento — e essa distinção é o que reabre a conversa depois de um "já temos".
- Quando couber, some o acervo que o sistema do lead guarda mas não lê: PDF escaneado, imagem, áudio e vídeo estão armazenados e o CONTEÚDO deles não é indexado. É onde a busca em linguagem natural muda o jogo.
- CALIBRE A PERGUNTA PELA SENIORIDADE. Com diretor, superintendente, head, sócio ou C-level, não peça que ele mate a sua curiosidade ("fiquei curioso", "queria entender", "uma curiosidade genuína"): é pedir favor a quem não tem tempo. Faça uma pergunta fechada, do terreno técnico dele, que se responda em uma linha — de preferência pedindo um número ou uma escolha entre duas alternativas. A fórmula da curiosidade continua boa com analista, coordenador e gerente.
- Dar ao lead a saída honesta ("se não fizer sentido, sem problema") é permitido e recomendado: é conceder a recusa, não negar a intenção comercial. O que segue proibido é declarar a própria intenção para negá-la, conforme a regra acima.

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
