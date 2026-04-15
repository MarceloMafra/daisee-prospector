# Prompt de Geração de Cadência

Modelo: `claude-opus-4-6` (Anthropic)
Tokens máximos: 2000

## System / Role

Não há system message separada — todo o contexto está no user prompt.

## User Prompt

```
Você é um especialista em vendas B2B no mercado brasileiro. Gere uma cadência de vendas com 5 touches TOTALMENTE EM PORTUGUÊS BRASILEIRO para o prospect abaixo. As mensagens devem ser naturais, ALTAMENTE PERSONALIZADAS com base no perfil real do LinkedIn, e adequadas ao mercado brasileiro.

**Dados do Prospect:**
- Nome: {lead.name}
- Empresa: {lead.company}
- Cargo: {lead.seniority}
- E-mail: {lead.email}
- Score DAISEE: {lead.daiseeScore}/100

{profileSection}

**Tom:** {toneDescription}

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
- Se o perfil do LinkedIn foi fornecido, use informações específicas: experiências anteriores, empresas onde trabalhou, formação, conquistas, interesses — para tornar as mensagens únicas e relevantes
- Evite mensagens genéricas — o prospect deve sentir que você realmente o conhece
- **Cargo recente:** Se o cargo atual do prospect foi iniciado há 9 meses ou menos (contando a partir da data de hoje), mencione isso como gancho de abertura no T1 ou T2 — ex: "Parabéns pelo novo cargo de X na Y!" Calcule a partir da data de início informada no perfil. Se a data de início tiver mais de 9 meses, NÃO use esse gancho.
- Todo conteúdo deve ser personalizado para o prospect
- Cada touch deve construir sobre os anteriores
- Tom deve ser {tone}
- Assuntos de e-mail devem ser variados e chamativos
- Conteúdo deve ser profissional mas envolvente
- Inclua chamadas para ação específicas em cada mensagem
- Use linguagem natural do mercado brasileiro, evite traduções literais

Retorne APENAS os 5 touches no formato especificado acima, com os marcadores claros para cada campo.
```

## profileSection

Se perfil PDF disponível:
```
**Perfil Completo do LinkedIn (use estas informações para personalizar ao máximo):**
{profileText — primeiros 3000 caracteres}
```

Se perfil não disponível:
```
**Atenção:** Perfil do LinkedIn não disponível. Use apenas os dados básicos abaixo para personalizar.
```

## Tons disponíveis

| Código | Descrição |
|---|---|
| CONSULTIVO | Tom consultivo e educativo, fazendo perguntas para entender as necessidades do prospect, posicionando-se como um consultor de confiança |
| DIRETO | Tom direto e objetivo, destacando a proposta de valor e os benefícios de forma clara e sem rodeios |
| CRIATIVO | Tom criativo e envolvente, usando storytelling e ângulos únicos para capturar a atenção do prospect |
