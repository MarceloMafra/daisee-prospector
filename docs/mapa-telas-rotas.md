# Mapa de telas × rotas de API

Contrato entre a interface e o back-end do Daisee Prospector. Existe para que
uma reorganização de telas não quebre a ligação com as rotas sem que ninguém
perceba — o sintoma típico não é tela quebrada, é tela bonita cujo botão não faz
nada, ou faz a coisa errada.

**Quem for redesenhar:** leia a seção "Invariantes" antes de mexer. Ela lista
mecanismos que parecem código supérfluo e são cicatriz de incidente real.

Levantado em 15/10/2026, sobre `main` em `d8cd198`.

---

## 1. Navegação atual

> Desde a fase 2 do redesenho os rótulos mudaram (rotas iguais): Leads → Base de
> Leads, Pipeline → Funil de Vendas, Respostas → Respostas & DM, Prospecções →
> Cadências, Compliance → Compliance de Copy. A tabela abaixo usa os nomes antigos.

A barra lateral (`components/layout/sidebar.tsx`) tem oito entradas:

| Rótulo | Rota | O que a tela faz |
|---|---|---|
| Dashboard | `/dashboard` | Resumo da campanha em números |
| Relatório | `/dashboard/relatorio` | Funil, pendências e conversas |
| Leads | `/dashboard/leads` | Listagem, enriquecimento e disparo individual |
| Respostas | `/dashboard/interacoes` | Caixa de entrada: responder, indicar, arquivar |
| Pipeline | `/dashboard/pipeline` | Quadro por fase do lead |
| Prospecções | `/dashboard/prospecting` | Monitoramento dos touches agendados |
| Compliance | `/dashboard/compliance` | Validação de texto contra as regras |
| Configurações | `/dashboard/settings` | Tela estática, **não chama nenhuma API** |

Fora da barra: `/dashboard/leads/[id]` (ficha e cadência do lead),
`/dashboard/leads/import` (importação), `/login` e `/` (redirecionamento).

---

## 2. Quem chama o quê

### `/dashboard` — resumo
- `GET /api/dashboard/stats`

### `/dashboard/relatorio` — relatório da campanha
- `GET /api/relatorio`

> O rótulo "aceites sem T2" desta tela **soma** `t2Prontos` e `emConversaSemT2`
> (`app/dashboard/relatorio/page.tsx`, linha do rótulo de DMs T2). A rota separa
> os dois de propósito — quem já respondeu está com a cadência pausada, não é
> follow-up esquecido. A soma faz o número parecer pendência e ele só cresce.
> Se a tela for refeita, **mostre os dois separados**.

### `/dashboard/leads` — listagem
- `GET /api/leads?limit={n}&page={n}&search={termo}` — a busca só entra na
  query quando há termo aplicado; a tela espera `{ leads: [...] }` na resposta
- `PUT|DELETE /api/leads/{id}`
- `POST /api/leads/{id}/enrich` — ⚠️ consome Unipile
- `POST /api/leads/recalculate`
- `GET /api/cadencias?leadId={id}&limit=1`
- `POST /api/cadencias` · `POST /api/cadencias/{id}/generate` — ⚠️ consome IA
- `POST /api/touches/{id}/send` — 🔴 **ENVIA MENSAGEM REAL**

### `/dashboard/leads/[id]` — ficha e cadência
- `GET|PUT /api/leads/{id}` (e `?sync=` para forçar releitura)
- `POST /api/leads/{id}/enrich` — ⚠️ Unipile
- `POST|DELETE /api/leads/{id}/profile`
- `GET|POST /api/cadencias` · `POST /api/cadencias/{id}/generate` — ⚠️ IA
- `GET|PUT|DELETE /api/touches/{id}`
- `POST /api/touches/{id}/send` — 🔴 **ENVIA MENSAGEM REAL**
- `POST /api/compliance/validate`
- `PUT /api/interacoes/{id}`

### `/dashboard/interacoes` — caixa de respostas
- `GET /api/interacoes?status=...`
- `PUT /api/interacoes/{id}`
- `POST /api/interacoes/varrer` — ⚠️ Unipile + IA, demora minutos

Pelo componente `interacao-item.tsx`:
- `GET /api/agenda/horarios`
- `POST /api/interacoes/{id}/responder` — 🔴 **ENVIA MENSAGEM REAL**
- `POST /api/interacoes/{id}/refazer` — ⚠️ IA, não envia
- `PUT /api/leads/{id}` (mover de fase)

Pelo componente `indicacao-painel.tsx`:
- `GET|POST /api/interacoes/{id}/indicacao` — ⚠️ busca no LinkedIn
- `POST /api/interacoes/{id}/indicacao/cadencia` — ⚠️ IA

### `/dashboard/pipeline` — Funil de Vendas (antes "Pipeline")
- `GET /api/leads?limit=1000&etapa=1` — `etapa=1` faz a rota devolver `etapa` e
  `motivoEncerramento` calculados por `lib/etapaFunil.ts`
- `PUT /api/leads/{id}` com `status` (só Qualificado, Em progresso, Descartado,
  Perdido ou Prospectando = voltar ao automático)

> Seis etapas: Base, Convidado, Conectado, Em conversa (calculadas dos eventos),
> Qualificado e Encerrado (decisão do operador, gravada em `status`). A regra tem
> teste: `npx tsx scripts/testar-etapa-funil.ts`. O Dashboard e `/api/relatorio`
> (campo `etapas`) usam a mesma função.

### `/dashboard/prospecting` — monitoramento
- `GET /api/prospecting`
- `GET|PUT|DELETE /api/touches/{id}`
- `POST /api/touches/{id}/send` — 🔴 **ENVIA MENSAGEM REAL**

### `/dashboard/compliance` — validação de texto
- `POST /api/compliance/validate`

### `/dashboard/leads/import` — importação
- `POST /api/leads/import`

---

## 3. Rotas com efeito irreversível

Toda alteração de tela que encoste nestas rotas precisa de atenção redobrada.
Não há "desfazer" do outro lado.

| Rota | Efeito |
|---|---|
| `POST /api/touches/{id}/send` | Envia convite ou DM no LinkedIn |
| `POST /api/interacoes/{id}/responder` | Envia a resposta no LinkedIn |
| `POST /api/prospecting/scheduler/run` | Dispara o lote agendado |
| `DELETE /api/leads/{id}` | Apaga lead e, em cascata, cadência e touches |
| `DELETE /api/cadencias/{id}` · `DELETE /api/touches/{id}` | Apaga histórico |

Rotas que gastam dinheiro ou tempo, sem serem destrutivas: `enrich`,
`cadencias/{id}/generate`, `interacoes/varrer`, `indicacao`, `refazer`.

---

## 4. Rotas que nenhuma tela chama

Não são código morto. Apagar qualquer uma quebra operação que roda fora da
interface.

| Rota | Quem chama |
|---|---|
| `GET /api/cron/process-touches` | Vercel Cron, 13h UTC (`vercel.json`) |
| `GET /api/cron/monitorar-interacoes` | Vercel Cron |
| `POST /api/webhooks/unipile` | Unipile, quando chega mensagem |
| `POST /api/leads/import-sales-nav` | `scripts/importar-sales-nav.ts` |
| `POST /api/prospecting/scheduler/run` | Operação manual |
| `/api/auth/[...nextauth]` | NextAuth; `middleware.ts` depende dela |
| `GET|POST /api/touches`, `GET /api/cadencias/{id}` | Coleções, uso pontual |

---

## 5. Invariantes — o que não pode sumir num redesenho

Cada item abaixo é resposta a um incidente que já aconteceu. Nenhum deles
apareceria como erro num teste: apareceria como mensagem errada chegando a um
cliente potencial.

| Invariante | Onde | Se sumir |
|---|---|---|
| `confirm()` antes de enviar, mostrando destinatário e prévia | `interacao-item.tsx`, em `enviarResposta` | Em 12/09 uma mensagem de teste foi para um lead real |
| `ignorarAuditoria` **não exposto na interface** | `api/interacoes/[id]/responder` | É o atalho que burla a auditoria de copy |
| Auditoria antes de enviar, com HTTP 422 e nada enviado | mesma rota | Claim falso chega ao lead |
| Envio não recarrega a lista na hora | `enviarResposta` | A aba padrão é NOVA: recarregar tira o card e a pergunta de fase junto |
| "Arquivar" disponível **depois** de responder | fim de `interacao-item.tsx` | Quem envia o encerramento perde o seletor de fase |
| Aviso de idade do espelho da agenda | `abrirResposta` + `api/agenda/horarios` | Sugere horário já ocupado |
| Limite de 200 caracteres no convite | `reescrever-touch.ts`, validação do canal | LinkedIn rejeita |

Fora da interface, mas quebráveis por mudança de rota: a espera de 30 a 90
segundos entre envios (`scripts/send-batch.ts`), a auditoria no lote (mesmo
arquivo), o limite de 30s da transação de cadência (`lib/cadenciaGeneration.ts`)
e a rede de retentativas do banco (`lib/dbRetry.ts`).

---

## 6. Antes de abrir o pull request

```bash
npx tsc --noEmit
npm run build
npx tsx scripts/testar-auditoria.ts
npx tsx scripts/testar-dbretry.ts
./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/testar-triagem.ts
./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/testar-qualificacao.ts
```

E a conferência que nenhum teste faz: percorrer a seção 2 e confirmar que cada
tela ainda chama as mesmas rotas, com os mesmos métodos.

**Nunca** clique em "Enviar agora" num deploy de preview para testar layout. O
preview aponta para o banco de produção e para a mesma conta do LinkedIn: a
mensagem sai de verdade.

**Nunca** altere `prisma/schema.prisma` numa branch de design. O `buildCommand`
em `vercel.json` roda `npx prisma db push`, então toda build — inclusive a de
preview — escreve no banco de produção.
