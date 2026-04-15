# Handoff — Daisee Prospector (2026-04-15)

## Resumo da Sessão

**Data:** 15 de abril de 2026  
**Branch:** main  
**Commit Final:** 8eccd82

### O que foi feito

1. **Paginação de Leads** ✅
   - Adicionado seletor de tamanho de página (10/25/50)
   - Implementado contador "Mostrando X de Y leads"
   - Botões de navegação (Anterior/Próxima)
   - Integração com `/api/leads?limit=&page=` existente

2. **Headers da Importação** ✅
   - Atualizado títulos da página de import para PT: Nome, E-mail, Empresa, Cargo, LinkedIn
   - Mantém compatibilidade com mappers do backend

3. **Cadência com Anthropic** ✅
   - Resolvido problema de créditos na Anthropic
   - Revertido de OpenAI GPT-4o para Claude Opus 4.6 (qualidade superior)
   - Adicionado Subject/título para LinkedIn T2 (segundo touch)
   - Corrigido parser de subject para não capturar "Content:" junto

4. **Documentação** ✅
   - Salvo prompt original em `/docs/prompt-cadencia.md` para referência futura

### Estado Atual

- **Leads:** Importação funcionando, paginação implementada
- **Cadência:** Gerando com alta qualidade, personalizadas com dados do LinkedIn PDF
- **Deploy:** Vercel production em `8eccd82`, todos os testes positivos
- **Credenciais:** ANTHROPIC_API_KEY configurada em production

## Plano para Próxima Sessão

### 1. Auto-aplicar suggestPipelineStage() na Qualificação

**Objetivo:** Quando um lead é importado ou recalculado, aplicar automaticamente o status correto do funil baseado em critérios.

**Critérios (já definidos em `lib/daisee-score.ts`):**
- QUALIFICADO: Score ≥ 50 + cargo executivo sênior ao CEO + empresa 500+
- EM_PROGRESSO: ≥ 1 touch enviado
- DESCARTADO: fora do ICP (score < 40 ou cargo abaixo de Sênior)
- PERDIDO: era qualificado mas não converteu

**Implementação:**
- [ ] Chamar `suggestPipelineStage()` em `POST /api/leads/import/route.ts` (ao criar lead)
- [ ] Chamar em `POST /api/leads/recalculate/route.ts` (ao recalcular scores)
- [ ] Atualizar campo `status` no Prisma com o resultado sugerido
- [ ] Testar com leads de diferentes scores/senioridades

**Arquivo:** `app/api/leads/import/route.ts`, `app/api/leads/recalculate/route.ts`

---

### 2. Rastreamento de Touches Enviados (ENVIADO)

**Objetivo:** Marcar touch como ENVIADO quando o usuário clica no botão Gmail ou quando manualmente marca como enviado.

**Schema já existe em Prisma:**
```prisma
status     TouchStatus @default(AGENDADO)
sentAt     DateTime?
```

**Enum TouchStatus:** AGENDADO, ENVIADO, ENTREGUE, RESPONDIDO

**Implementação:**
- [ ] Criar endpoint `PATCH /api/touches/:id/send` que:
  - [ ] Seta `touch.status = 'ENVIADO'`
  - [ ] Seta `touch.sentAt = now()`
  - [ ] Retorna touch atualizado
- [ ] Adicionar botão "Marcar como Enviado" na UI (next to Gmail button)
- [ ] Botão chama `PATCH /api/touches/:id/send` antes de abrir Gmail
- [ ] Atualizar lead status para EM_PROGRESSO quando tiver ≥1 touch enviado (verificar com suggestPipelineStage)
- [ ] Exibir visual "ENVIADO" no card do touch (ícone ou badge)

**Arquivos:**
- Criar: `app/api/touches/[id]/send/route.ts`
- Editar: `app/dashboard/leads/[id]/page.tsx` (UI do botão)
- Editar: `lib/daisee-score.ts` (considerar touches enviados no suggestPipelineStage)

---

### 3. Gmail OAuth Integration (Fase 1)

**Objetivo:** Autenticar com Google, enviar emails via Gmail API e rastrear aberturas/respostas.

**Escopo (grande — considerar dividir em sub-fases):**

#### 3a. Setup OAuth Google (pré-requisito)
- [ ] Criar Google Cloud Project (se não tiver)
- [ ] Registrar aplicação OAuth 2.0 (Web App)
  - Redirect URI: `https://daisee-prospector.vercel.app/api/auth/google/callback`
- [ ] Obter Client ID e Client Secret
- [ ] Adicionar variáveis em Vercel:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`

#### 3b. Autenticação (Shelf para Google)
- [ ] Usar `next-auth` ou biblioteca leve de OAuth
- [ ] Criar `/api/auth/[...nextauth].ts` com provider Google
- [ ] Exigir escopos: `gmail.send`, `gmail.readonly`, `gmail.modify`
- [ ] Armazenar token de refresh em banco (tabela `GoogleAccount` ou similar)

#### 3c. Envio via Gmail API
- [ ] Substituir link `mailto` pelo envio real via `googleapis/gmail`
- [ ] Após chamar `/api/touches/:id/send`, enviar email de fato
- [ ] Atualizar `touch.sentAt` com timestamp real do Gmail API
- [ ] Tratamento de erro se Gmail falhar

#### 3d. Rastreamento (Pixel/Webhook)
- [ ] Gerar tracking pixel único por touch enviado
- [ ] Inserir pixel no corpo do email (transparent 1x1)
- [ ] Webhook em `/api/webhooks/gmail/open` para registrar aberturas
- [ ] Atualizar `touch.status = 'ENTREGUE'` quando pixel carrega

#### 3e. Respostas (Polling)
- [ ] Background job (ou cron) que consulta thread do Gmail a cada 30min
- [ ] Detectar resposta (in_reply_to ou subject com "Re:")
- [ ] Atualizar `touch.status = 'RESPONDIDO'`
- [ ] Armazenar corpo da resposta em field novo (ex: `replyContent`)

**Roadmap para próximas sessões:**
- Sessão próxima: 3a + 3b (OAuth setup + autenticação)
- Sessão depois: 3c (envio via API)
- Sessão depois: 3d + 3e (tracking + respostas)

**Arquivos (mínimo):**
- Criar: `app/api/auth/[...nextauth].ts`
- Criar: `app/api/touches/[id]/send-gmail/route.ts`
- Criar: `app/api/webhooks/gmail/open/route.ts`
- Editar: `prisma/schema.prisma` (adicionar GoogleAccount, campos de tracking)
- Editar: Vercel env vars

---

## Estado do Banco de Dados

- **Schema atual:** Lead, Cadencia, Touch, ComplianceLog, AuditLog, ComplianceRule
- **Enums:** CompanySize (MICRO, PEQUENA, MEDIA, GRANDE, ENTERPRISE), TouchStatus, CadenciaStatus, ComplianceRuleType
- **Provider:** Neon PostgreSQL (production)

**Alterações necessárias para próxima sessão:**
```prisma
model GoogleAccount {
  id            String  @id @default(cuid())
  leadId        String  @unique
  lead          Lead    @relation(fields: [leadId], references: [id], onDelete: Cascade)
  accessToken   String
  refreshToken  String
  expiresAt     DateTime
  createdAt     DateTime @default(now())
}

// Adicionar a Lead:
googleAccount GoogleAccount?

// Adicionar a Touch:
trackingPixelId  String?  @unique
openedAt         DateTime?
replyContent     String?
```

---

## Checklist para Próxima Sessão

- [ ] **Task 1:** Auto-apply suggestPipelineStage
  - [ ] Import route
  - [ ] Recalculate route
  - [ ] Testes
  - [ ] Commit e deploy
  
- [ ] **Task 2:** Rastreamento de touches enviados
  - [ ] Criar endpoint PATCH /touches/:id/send
  - [ ] UI: botão "Marcar como Enviado"
  - [ ] Atualizar suggestPipelineStage para considerar touches enviados
  - [ ] Testes
  - [ ] Commit e deploy

- [ ] **Task 3:** Gmail OAuth (Fase 1)
  - [ ] Google Cloud setup
  - [ ] Variáveis em Vercel
  - [ ] next-auth integration
  - [ ] Testes de login
  - [ ] Commit e deploy

---

## Notas Importantes

1. **Qualidade vs Custo:** Claude Opus ($15/MTok) vs GPT-4o ($5/MTok) — Claude é 3x mais caro mas qualidade é notavelmente superior. Com volume atual (~50 cadências/mês), custo é ~$1/mês com Anthropic.

2. **Ambiente de Teste:** Sempre confirmar na Vercel que commit é `Current` antes de testar.

3. **Prisma:** Lembrar de fazer `npx prisma db push` ou `prisma migrate` quando adicionar novos campos/modelos.

4. **Backup de Prompts:** Prompt de cadência agora está documentado em `/docs/prompt-cadencia.md` — se mudar, atualizar arquivo.

5. **Webhook GitHub → Vercel:** Ocasionalmente falha. Se push não gerar deploy, fazer redeploy manual na aba Deployments.

---

## Commits Desta Sessão

| Commit | Mensagem |
|---|---|
| d044f43 | feat: add pagination to leads list and PT headers on import page |
| 33c9d78 | revert: restore Anthropic SDK with original prompt + T2 LinkedIn subject |
| 141c617 | feat: add subject/title field to LinkedIn T2 touch |
| 200d5ce | fix: add system message to GPT-4o for better personalization quality |
| 8eccd82 | fix: prevent subject parser from capturing Content field text |

---

**Próxima sessão:** Implementar Auto-qualify + Envio marcado + Gmail OAuth Fase 1
