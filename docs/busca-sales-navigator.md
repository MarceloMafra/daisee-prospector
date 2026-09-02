# Buscas booleanas para o Sales Navigator — DAISEE

Critério definido pelo Marcelo em 02/09: **quanto mais sênior melhor, quanto mais
elevado o cargo melhor, e quanto mais técnico em compliance e gestão documental
melhor.**

O Sales Navigator aceita `AND`, `OR`, `NOT`, parênteses e aspas — mas **só nos
campos de texto** (Cargo e Palavras-chave). Senioridade, setor, geografia e porte
são filtros nativos, e o filtro nativo é sempre mais confiável que a palavra
solta no título. Por isso as buscas abaixo cuidam da *função*, e os filtros
laterais cuidam do resto.

---

## Busca 1 — Núcleo de compliance (a principal)

Cole no campo **Cargo (Job Title)**:

```
("Compliance" OR "PLD" OR "PLDFT" OR "PLD/FT" OR "Lavagem de Dinheiro" OR "AML" OR "KYC" OR "Controles Internos" OR "Auditoria Interna" OR "Auditoria" OR "Risco Operacional" OR "Riscos" OR "Governança" OR "GRC" OR "Integridade" OR "LGPD" OR "DPO" OR "Privacidade" OR "Proteção de Dados" OR "Regulatório" OR "Regulatory" OR "Ouvidoria") NOT ("Júnior" OR "Junior" OR "Jr" OR "Estagiário" OR "Estágio" OR "Trainee" OR "Assistente" OR "Auxiliar" OR "Aprendiz" OR "Comercial" OR "Vendas" OR "Recrutamento")
```

O `NOT` no fim é o que mais economiza tempo: tira início de carreira e tira quem
tem "compliance" no título por ser **vendedor de solução de compliance** — o
falso positivo mais comum, porque casa com todos os termos e não compra nada.

**Filtros laterais que acompanham:**

| Filtro | Valor |
|---|---|
| Geografia | Brasil |
| Setor | Bancos · Serviços financeiros · Seguros · Mercado de capitais · Serviços de investimento |
| Nível hierárquico | Diretor · VP · CXO · Proprietário/Sócio · Gerente |
| Tamanho da empresa | 201+ funcionários |

O corte de porte importa: acervo documental que dói só existe com volume. Abaixo
de 200 pessoas a dor costuma não justificar a compra.

---

## Busca 2 — Gestão documental (a menos concorrida)

É o eixo específico da DAISEE, e quase ninguém prospecta por ele. Cole no campo
**Palavras-chave**, que varre a headline e o "Sobre" — não só o título formal:

```
("gestão documental" OR "gestão de documentos" OR "GED" OR "acervo documental" OR "normativos internos" OR "documentação regulatória" OR "guarda de documentos" OR "arquivo digital" OR "records management" OR "document management") AND ("banco" OR "financeira" OR "seguradora" OR "fintech" OR "BACEN" OR "SUSEP" OR "CVM" OR "compliance" OR "auditoria")
```

Quem se descreve assim já nomeou o problema sozinho. É uma lista menor, mas com
a conversa meio caminho andada.

---

## Busca 3 — Relacionamento com regulador

Perfis que existem por causa do BACEN. Volume documental garantido por ofício.
Campo **Cargo**:

```
("Relacionamento com o Regulador" OR "Relações Institucionais" OR "Reporte Regulatório" OR "Regulatory Reporting" OR "Regulatório" OR "Conformidade Regulatória" OR "Normativo" OR "Normativos") AND ("BACEN" OR "Banco Central" OR "CVM" OR "SUSEP" OR "COAF" OR "PREVIC" OR "B3" OR "Compliance" OR "Riscos")
```

---

## Sobre o trade-off de senioridade

Cruzando o cargo com quem de fato respondeu na base atual (34 respostas em 184
leads), o resultado contraria a intuição:

| Termo no cargo | Taxa de resposta |
|---|---|
| Sênior | 67% (8/12) |
| Analista | 56% (10/18) |
| Riscos | 25% (6/24) |
| Director | 25% (1/4) |

**Quanto mais alto o cargo, menos a pessoa responde no LinkedIn.** Poder de
decisão e taxa de resposta puxam para lados opostos: um Analista Sênior de PLD/FT
responde três vezes mais que um diretor, mas não assina contrato.

A amostra é pequena e o dado não desmente o critério — ele diz que os dois perfis
servem a propósitos diferentes. O caminho que respeita os dois é buscar **os
dois**, com mensagens diferentes: ao decisor, a conversa de risco e custo; ao
especialista sênior, a conversa de rotina e ferramenta — e ele indica o decisor
por dentro.

Se for para escolher um só, o critério do Marcelo (mais alto) continua valendo:
menos respostas, mas cada uma vale mais.

---

## Depois da busca

Salve o resultado como lista no Sales Navigator e passe a triagem antes de
importar — ela lê a lista sem enriquecer perfil nenhum:

```
./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/triar-lista.ts \
  --lista "<URL da lista>" --faixa ALVO --contato NOVO --csv triagem.csv
```

A triagem devolve pontuação, nível do cargo, os termos que casaram e o estado de
contato (quem já é conexão, quem já tem convite pendente) — sem gastar chamada de
enriquecimento em quem vai ser descartado.
