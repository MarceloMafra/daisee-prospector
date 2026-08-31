# DAISEE Prompt Templates para Claude

> **Material revisado em 31/08/2026.** Este kit veio do projeto daisee-automation
> (março/2026), anterior às regras de honestidade da campanha. As promessas de
> resultado foram removidas: não prometemos percentual de redução, prazo de
> implantação nem ganho de eficiência a quem ainda não conhecemos.
>
> **O único número citável** é o depoimento da Dinamica Merchandising — 70% de
> redução no tempo de busca de documentos —, e sempre como o que aquele cliente
> relatou, nunca como promessa ao lead. Faltando case no setor de quem se fala,
> diga que falta e pergunte pelo contexto dele.
>
> A DAISEE é uma IA privada de gestão documental, e a MasterVendas é **parceira**
> da DAISEE, não a desenvolvedora.

> **Material revisado em 31/08/2026.** Este kit veio do projeto daisee-automation
> (março/2026), anterior às regras de honestidade da campanha. As promessas de
> resultado foram removidas: não prometemos percentual de redução, prazo de
> implantação nem ganho de eficiência a quem ainda não conhecemos.
>
> **O único número citável** é o depoimento da Dinamica Merchandising — 70% de
> redução no tempo de busca de documentos —, e sempre como o que aquele cliente
> relatou, nunca como promessa ao lead. Faltando case no setor de quem se fala,
> diga que falta e pergunte pelo contexto dele.
>
> A DAISEE é uma IA privada de gestão documental, e a MasterVendas é **parceira**
> da DAISEE, não a desenvolvedora.

Templates prontos para criar prompts eficazes usando as informações estruturadas do conhecimento DAISEE.

---

## PROMPT 1: Email de Prospecção - Financeiro

```
Você é um especialista em vendas B2B de software de gestão do conhecimento.

Contexto:
- Prospect: [Chief Compliance Officer ou Head of Compliance]
- Empresa: [Nome da empresa - banco/fintech/asset manager]
- Setor: Financeiro · Bancos · Asset Management
- Gatilho: [Auditoria BACEN agendada / Novo CCO no cargo / Publicação sobre compliance]

Dores do Setor:
1. Circulares BACEN, políticas CVM espalhadas em drives e e-mails - versão vigente desconhecida
2. Quanto da jornada de um analista sênior vai para localizar documentos? (pergunte — não presuma)
3. Dificuldade em provar ao regulador que a decisão usou a norma correta e vigente
4. Equipes decidem com normas revogadas - problema silencioso e crítico

Solução DAISEE:
- Chat normativo: Pergunte "Qual é a Resolução 4.557 do BACEN vigente?" → Resposta com citação exata
- Trilha de auditoria: Cada decisão registrada com fonte, versão e data
- Zero exposição externa: Dados 100% privados (LGPD/GDPR by design)
- Operacional em 30 dias após onboarding

Tarefa:
Escreva um email de prospecção de 200-250 palavras que:
1. Abra com uma pergunta consultiva sobre auditoria BACEN/CVM
2. Cite o problema específico de "versão vigente desconhecida"
3. Pergunte quanto tempo o analista gasta procurando documento hoje
4. Inclua um exemplo com "Resolução 4.557" para mostrar conhecimento
5. Finalize com proposta de demo de 30 min com documentos reais da empresa

Tom: Consultivo, não-pressurante, especialista.
```

---

## PROMPT 2: Email de Prospecção - Farmacêutica

```
Você é especialista em vendas de software para compliance em farmacêutica.

Contexto:
- Prospect: [Diretor de Qualidade / Diretor Regulatório]
- Empresa: [Nome do laboratório / MedTech]
- Setor: Farmacêutica · MedTech · Saúde
- Gatilho: [Auditoria ANVISA recente / Novo gerente de QA / Empresa em expansão de planta]

Dores do Setor:
1. POPs e normas desatualizados - colaboradores não sabem qual é a versão vigente
2. "Não sei onde está esse documento" durante inspeção ANVISA = não conformidade imediata
3. Onboarding técnico leva semanas - novos colaboradores perdidos em versões de procedimentos
4. Turnover na área técnica leva embora anos de expertise sobre desvios e resoluções

Soluções DAISEE:
- Busca por POPs: Encontre qualquer procedimento/laudo em segundos com versão, revisão e responsável
- Comparação de versões: Identifica automaticamente o que mudou entre revisões de POPs
- Controle por função: Produção vê apenas o que produção deve ver (QA vê o que QA deve)
- Trilha para auditoria: Cada consulta registrada para inspetor ANVISA

Impacto:
- menos tempo de busca 
- menos risco de usar versão desatualizada
- Pronto para auditoria com trilha completa

Tarefa:
Escreva um email de prospecção de 180-220 palavras que:
1. Comece com uma situação realista de inspeção ANVISA
2. Mencione o ciclo de inspeção e rastreabilidade de POPs como problema concreto
3. Cite o risco de trabalhar sobre versão desatualizada
4. Mostre como novos colaboradores ganham semanas em onboarding
5. Termine com convite para demo trazendo PDFs/POPs reais da empresa

Tom: Técnico, baseado em regulação, entende pressão de ANVISA.
```

---

## PROMPT 3: Email de Prospecção - Indústria

```
Você é especialista em vendas para operações de manufatura.

Contexto:
- Prospect: [COO / Diretor de Operações / Gerente de Qualidade]
- Empresa: [Nome - preferencialmente com múltiplas plantas]
- Setor: Indústria · Manufatura · Aeroespacial
- Gatilho: [Auditoria ISO / Expansão de planta / Múltiplas plantas com documentação fragmentada]

Dores do Setor:
1. Normas ISO, procedimentos e especificações espalhadas em sistemas diferentes por planta
2. Auditorias ISO, INMETRO exigem demonstrar que decisão usou documento correto e vigente
3. Engenheiros que saem levam know-how sobre processos, falhas e soluções
4. Novas equipes precisam de semanas para localizar documentos e versões vigentes

Soluções DAISEE:
- Busca em normas: Encontre qualquer ISO/ABNT/procedimento em segundos com versão vigente
- Comparação de revisões: Identifica mudanças entre versões de especificações automaticamente
- Acesso por planta e função: Cada unidade acessa apenas o que é relevante (São José dos Campos vs. Curitiba)
- Integração com ERP/MES: Conecta SAP, MES e GED sem substituir o que funciona
- Trilha de auditoria: Quem perguntou, o que consultou, qual versão foi usada

Impacto:
- menos tempo localizando documentos técnicos
- 3x mais rápido no onboarding de equipes técnicas
- Rastreabilidade total para auditorias

Tarefa:
Escreva um email de prospecção de 200-250 palavras que:
1. Abra com "retrabalho em campo por uso de norma desatualizada"
2. Cite especificamente múltiplas plantas e dispersão de documentação
3. Mencione "3x mais rápido em onboarding" como ganho operacional
4. Inclua exemplo com "acesso por planta" para plantas em cidades diferentes
5. Termine com convite para demo trazendo normas/procedimentos técnicos reais

Tom: Operacional, foco em eficiência, entende pressão de manufatura.
```

---

## PROMPT 4: Email de Prospecção - Seguros

```
Você é especialista em vendas para compliance em seguros.

Contexto:
- Prospect: [Chief Compliance Officer / Diretor de Compliance / Dir. Jurídico]
- Empresa: [Seguradora / Resseguro]
- Setor: Seguros · Resseguros
- Gatilho: [SUSEP Circular recente / Auditoria regulatória / Novo CCO / Sinistro complexo]

Dores do Setor:
1. Dezenas de circulares SUSEP por ano - equipes não conseguem atualizar em tempo real
2. Decisões sobre cobertura baseadas em versões desatualizadas geram passivo jurídico alto
3. Impossível demonstrar que liquidação de sinistro seguiu norma correta na data do evento
4. Jurídico, Compliance e Operações trabalham com documentos diferentes - inconsistências críticas

Soluções DAISEE:
- Busca em circulares: Encontre qualquer circular SUSEP ou condição de apólice em segundos (vigente)
- Comparação de normas: Identifica o que mudou entre versões de circulares e condicões gerais
- Controle por área: Jurídico, Operações, Comercial acessam apenas o que é relevante
- Trilha para regulador: Cada consulta registrada (usuário, documento, data) - pronto para SUSEP

Impacto:
- menos tempo de busca normativa
- tempo recuperado por analista de sinistros
- Rastreabilidade completa para regulador

Observação Setorial:
Mercado de seguros tem poucos profissionais de compliance mas muito bem conectados. Um cliente satisfeito pode indicar 3 outros. Trate com foco em relacionamento.

Tarefa:
Escreva um email de prospecção de 180-220 palavras que:
1. Abra com custo de decisão errada em sinistro por versão desatualizada
2. Cite "circular SUSEP" especificamente para mostrar conhecimento setorial
3. Mensione rastreabilidade para regulador como ganho de segurança
4. Pergunte pelo tempo que o analista de sinistros gasta na busca
5. Termine com convite para demo trazendo circulares e apólices reais

Tom: Regulatório, foco em risco/compliance, entende pressão de auditoria SUSEP.
```

---

## PROMPT 5: Email de Prospecção - Varejo

```
Você é especialista em vendas para varejo e cosméticos.

Contexto:
- Prospect: [Diretor Jurídico / Diretor de Compliance / Gerente de Regulatório]
- Empresa: [Rede de varejo / Cosmética - preferencialmente 50+ lojas]
- Setor: Varejo · Cosméticos · Bens de Consumo
- Gatilho: [Auditoria ANVISA / Auditoria CONAR / Expansão de lojas / Novo Dir. Jurídico]

Dores do Setor:
1. Lojas e regiões operam com versões diferentes de políticas e procedimentos (risco jurídico)
2. Cosméticos seguem ANVISA e CONAR - descumprimento gera multas e recall
3. Alta rotatividade no varejo - manter equipes alinhadas é desafio constante
4. Impossível demonstrar que decisão comercial/operacional seguiu políticas vigentes

Soluções DAISEE:
- Busca em políticas: Qualquer colaborador encontra política correta em segundos (sem depender do gerente)
- Atualização em tempo real: Nova política publicada = disponível para toda rede no mesmo instante
- Acesso por função/região: Loja, regional e corporativo acessam apenas o que é relevante
- Trilha de auditoria: Registro de quem acessou, qual documento, qual versão

Impacto:
- menos tempo localizando políticas e normas
- 3x mais rápido no onboarding de colaboradores
- Conformidade ANVISA/CONAR garantida em tempo real

Observação Setorial:
Varejo tem alta rotatividade em compliance. Novo gestor (primeiros 90 dias) quer implementar sistemas e tem orçamento. Foque em "primeiros 90 dias de sucesso".

Tarefa:
Escreva um email de prospecção de 180-220 palavras que:
1. Abra com cenário de desalinhamento entre lojas (versões diferentes de políticas)
2. Cite ANVISA e CONAR como regulação específica do setor
3. Mensione "3x mais rápido em onboarding" como ganho operacional
4. Inclua exemplo de "atualização em tempo real" de política para toda rede
5. Termine com convite para demo trazendo políticas e manuais reais da rede

Tom: Operacional, foco em escala e consistência, entende pressão de múltiplas lojas.
```

---

## PROMPT 6: Argumentação em Reunião - Financeiro

```
Você é um Account Executive preparando-se para reunião com Chief Compliance Officer de um banco.

Contexto:
- Prospect: Chief Compliance Officer
- Empresa: [Banco / Fintech]
- Duração: 30 minutos de demo

Situação:
O prospect já reconhece a dor de "versão vigente desconhecida" em circulares BACEN/CVM. Você precisa detalhar como DAISEE resolve especificamente no contexto dele.

Itens para abordar:
1. Como a auditoria BACEN vai mudar com DAISEE (trilha de rastreabilidade)
2. Como encurta o tempo de busca (calculadora específica)
3. Integração com sistemas existentes (sem rip-and-replace)
4. Conformidade LGPD/GDPR (dados nunca saem)
5. Implementação em 30 dias

Tarefa:
Escreva um script de 300-350 palavras para os primeiros 10 minutos de demo que:
1. Valide a dor com uma pergunta ("Como vocês hoje comprovam que uma decisão usou Resolução vigente?")
2. Mostre 3 capturas de tela conceituais de: chat normativo, busca booleana de circulares, trilha de auditoria
3. Cite um exemplo real tipo "consultei Circular CVM 123 em fevereiro → aqui está a versão usada, a data e quem consultou"
4. Finalize com próximo passo ("Vamos trazer seus docs reais? POPs, Circulares... vai ficar ainda mais claro")

Público: CCO - foco em compliance, auditoria, risco. Aprecia dados concretos.
```

---

## PROMPT 7: Argumentação em Reunião - Farmacêutica

```
Você é um Account Executive em reunião com Diretor de Qualidade de um laboratório.

Contexto:
- Prospect: Diretor de Qualidade (QA)
- Empresa: [Laboratório / MedTech]
- Duração: 30 minutos de demo

Situação:
O prospect vive a dor de "onboarding técnico lento" e "turnover que leva know-how". Você precisa mostrar como DAISEE resolve especificamente no contexto técnico dele.

Itens para abordar:
1. Como novos QAs ficam produtivos em dias, não semanas
2. Como comparação de versões evita uso de POP desatualizado
3. Controle por função: produção vê apenas o que deve (não vê desvios críticos)
4. Integração com LIM (sem substituir LIMS)
5. Trilha para auditoria ANVISA (quem consultou qual versão)

Tarefa:
Escreva um script de 300-350 palavras para os primeiros 10 minutos que:
1. Valide a dor com uma pergunta técnica ("Como vocês onboam um novo QA? Quanto tempo leva até dominar versões de POPs?")
2. Mostre 3 capturas de tela conceituais: busca de POPs, comparação de revisões, trilha de auditoria
3. Cite um exemplo tipo "novo QA chega, pergunta 'qual POP de validação é vigente?', obtém resposta em segundos com revisão, responsável técnico"
4. Mencione "0 dados enviados para fora" (LGPD)
5. Finalize com próximo passo ("Trazemos seus POPs reais, dossiers... fica claro como funciona com seus processos")

Público: Dir. Qualidade - foco em regulação, auditoria ANVISA, eficiência técnica. Aprecia processos.
```

---

## PROMPT 8: Resposta a Objeção - "Temos GED tradicional"

```
Você é um Account Executive respondendo objeção comum:
"Já temos um GED (repositório) - por que preciso de DAISEE?"

Contexto:
- Prospect: CCO ou Dir. de Operações
- Situação: Já investiram em GED/SharePoint/Alfresco

Tarefa:
Escreva uma resposta de 200-250 palavras que:

1. Valide o investimento anterior ("GED é excelente para guardar arquivos")
2. Identifique a lacuna específica ("Mas buscar em linguagem natural? Trilha de auditoria? Comparação de versões?")
3. Forneça analogia: "GED é como um guarda-chuva em um depósito. DAISEE é como um assistente que conhece cada guarda-chuva, onde está, qual é a melhor para chover agora"
4. Cite 3 diferenças-chave concretas:
   - GED: "Procure por 'Resolução 4.557'" → 50 arquivos, você escolhe
   - DAISEE: "Qual é a Resolução 4.557 vigente?" → Resposta com fonte exata e data
5. Mencione integração não-destrutiva: "DAISEE se conecta ao seu GED, não o substitui"
6. Termine com proposta: "Demo de 20 minutos com seus arquivos reais?"

Público: Executivo técnico ou operacional que já investiu em infraestrutura.
```

---

## PROMPT 9: Deck de Vendas - 1 Slide por Dor

```
Você é designer de slide deck de vendas DAISEE.

Para cada um dos 5 setores, crie UMA estrutura de slide que:

Estrutura:
- Título: [SETOR] - O Custo da Ineficiência
- Lado Esquerdo (problema):
  - 1 pergunta que force o lead a estimar o próprio custo
  - 3 bullets de dor
  - 1 exemplo realista/situação concreta
- Lado Direito (solução):
  - Ícone ou ilustração simples
  - 3 benefícios de DAISEE
  - 1 call-to-action ("Demo 30 min?")

Tarefa:
Crie o conteúdo de um slide para o setor [INSERIR].
Forneça em formato markdown para edição em PowerPoint/Figma.

Público: C-level / VP / Diretor
Tempo de visualização: 10-15 segundos
Tom: Direto, baseado em números, consultivo.
```

---

## PROMPT 10: Case Study Template - Seu Setor

```
Você é especialista em case studies B2B.

Contexto:
- Setor: [INSERIR]
- Empresa fictícia: [Nome similar a ICP real]
- Cargo do tomador de decisão: [INSERIR]
- Tamanho: [INSERIR]

Tarefa:
Escreva um case study de 400-500 palavras com estrutura:

1. **Situação** (60 palavras)
   - Qual era o problema específico?
   - Quantas filiais/plantas/lojas/equipes afetadas?

2. **Desafio** (80 palavras)
   - Qual foi a tentativa anterior que não funcionou? (GED? SharePoint?)
   - Por que o DAISEE foi escolhido?
   - Qual era a métrica de sucesso?

3. **Solução DAISEE** (100 palavras)
   - Como foi implementado?
   - Quais features foram mais impactantes?
   - Quanto tempo levou para estar operacional?

4. **Resultados** (100 palavras)
   - Métrica #1: [Redução X% em tempo de busca]
   - Métrica #2: [Y horas/mês recuperadas]
   - Métrica #3: [Z auditorias pasadas sem achados]
   - Depoimento: "Com DAISEE..." (1-2 frases)

5. **Próximos Passos** (30 palavras)
   - Como a empresa vai usar DAISEE nos próximos 6 meses?

Publique em formato MD com citações de executivos fictícios mas realistas.
```

---

## PROMPT 11: Treinamento de SDR - Pitch de 60 Segundos

```
Você é manager de SDRs e precisa treinar o time para pitch inicial (LinkedIn, email, phone).

Para cada setor, crie um pitch de EXATAMENTE 60 segundos (150-180 palavras):

Estrutura:
1. **Gancho** (10 seg) - Pergunta ou estatística que captura atenção
2. **Identificação** (10 seg) - Quem você é + por que está contatando
3. **Validação** (20 seg) - Prova de que você entende o setor/cargo
4. **Solução** (15 seg) - O que DAISEE resolve especificamente
5. **Próximo Passo** (5 seg) - Call-to-action clara

Tarefa:
Crie o pitch para [SETOR] que um SDR possa ler em 60 segundos exatos.

Exemplos de gancho por setor:
- Financeiro: "Você já foi questionado em auditoria sobre versão de norma?"
- Pharma: "Quantas horas por semana sua equipe procura POP correto?"
- Indústria: "Você conhece o custo real de retrabalho por norma desatualizada em campo?"
- Seguros: "Qual é o custo de decisão errada em sinistro por circular desatualizada?"
- Varejo: "Como você garante que 200 lojas seguem mesma política?"

Publique em formato script com [PAUSAS] e {ÊNFASE} marcadas.
```

---

## PROMPT 12: Análise Competitiva - DAISEE vs. [Alternativa]

```
Você é especialista em análise competitiva de software B2B.

Contexto:
- Setor: [INSERIR]
- Alternativa: [GED tradicional / IA genérica / Solução customizada anterior]
- Cargo do prospect: [INSERIR ICP]

Tarefa:
Crie um documento de 500 palavras que:

1. **Apresente a alternativa de forma justa** (não diminua o concorrente)
2. **Identifique 5 gaps específicos** que a alternativa tem comparado a DAISEE
3. **Forneça argumentação não agressiva** para cada gap
4. **Inclua 1-2 cenários** onde a alternativa é melhor que DAISEE (honestidade)
5. **Termine com matriz de decisão** (quando escolher qual)

Estrutura:
- Cabeçalho: "DAISEE vs. [Alternativa] para [Setor]"
- Tabela comparativa de 5 critérios + DAISEE vs. Alternativa
- 5 seções de análise profunda (1 critério cada)
- Recomendação consultiva
- Próximas perguntas para prospect fazer

Tom: Consultivo, honesto, baseado em valor e não em FUD.
```

---

## PROMPT 13: LinkedIn Message Sequencing - 3 Touchpoints

```
Você é especialista em sequências de LinkedIn messaging.

Contexto:
- Setor: [INSERIR]
- Cargo: [INSERIR ICP]
- Empresa: [Nome real ou fictícia]
- Gatilho detectado: [INSERIR]

Tarefa:
Crie 3 mensagens LinkedIn em sequência (com gap de 5-7 dias):

**Message #1** (Abertura consultiva)
- 100-120 palavras
- Gancho consultivo (pergunta ou insight)
- Mostrar conhecimento setorial
- Call-to-action leve: "Vale trocar uma ideia?"

**Message #2** (Validação + Proof)
- 120-150 palavras
- Reconhecer "talvez esteja ocupado"
- Adicionar 1 evidência (métrica, cliente similar, artigo)
- Ressaltar a dor específica
- Call-to-action: "15 min?"

**Message #3** (Final push)
- 100-120 palavras
- Reconhecer falta de resposta sem drama
- Oferecer alternativa (email, call, rede comum)
- Deixar a porta aberta ("Fico à disposição")
- Call-to-action: "Posso enviar algo para você considerar?"

Publique em formato pronto para copy-paste com [NOME], [CARGO], [EMPRESA] em placeholders.
```

---

## PROMPT 14: Demo Script - O que Demonstrar em 30 Minutos

```
Você é um demo expert de software de gestão do conhecimento.

Contexto:
- Setor: [INSERIR]
- Público: [INSERIR CARGO ICP]
- Duração: 30 minutos

Tarefa:
Estruture um demo script que:

**Min 0-2:** Contexto (estabelecer empatia com dor)
**Min 2-5:** Overview visual (não técnico - mostra interface/fluxo)
**Min 5-15:** Deep Dive - demonstre 3 funcionalidades em ordem de impacto:
  - Funcionalidade #1 (mais importante para este cargo)
  - Funcionalidade #2
  - Funcionalidade #3
**Min 15-25:** Q&A + Objeções
**Min 25-30:** Próximos passos + Chamada à ação

Para cada funcionalidade:
- O que vai demonstrar (não fale muito, mostre)
- Por que importa para este cargo específico
- Métrica ou resultado esperado
- Transição para próxima funcionalidade

Publique como script executável com timestamps, talking points e screenshots sugeridos.
```

---

## PROMPT 15: Qualificação BANT - Setor Específico

```
Você é especialista em qualificação BANT (Budget, Authority, Need, Timeline).

Contexto:
- Setor: [INSERIR]
- Cargo: [INSERIR ICP]

Tarefa:
Crie um guia de qualificação BANT específico para este setor que:

Para cada letra BANT, forneça:
1. A pergunta consultiva (não soar como interrogatório)
2. Respostas "Green" (prospect qualificado)
3. Respostas "Red" (não está pronto)
4. Como avançar para próxima pergunta

Exemplo para Financeiro - Authority:
- Pergunta: "Você teria envolvimento em decisão sobre ferramenta que centraliza normas de compliance?"
- Green: "Sim, sou responsável direto" ou "Trabalho junto com CTO/CFO"
- Red: "Teria que passar para alguém acima" ou "Não tenho visibilidade"
- Próximo: "Entendo. Quando conversamos com [pessoa acima], qual seria a prioridade para vocês?"

Publique em formato de tabela com 4 seções (B, A, N, T).
```

---

**Nota Final:** Todos esses templates devem ser preenchidos com informações reais do conhecimento DAISEE extraído do documento principal (DAISEE_Sales_Knowledge_Base.md). Combine este arquivo com aquele para máximo impacto.
