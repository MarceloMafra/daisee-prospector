# Buscas booleanas para o Sales Navigator — DAISEE

Critério do Marcelo (02/09): **quanto mais sênior melhor, quanto mais elevado o
cargo melhor, quanto mais técnico em compliance e gestão documental melhor.**

Todas as buscas abaixo foram **testadas contra os 422 leads reais** da lista
"compliance AND BACEN" antes de entrar aqui — a coluna "casa em" é medida, não
estimada.

---

## As duas regras que fazem a busca funcionar

**1. O campo Cargo busca o título formal, que é curto e pobre. A headline é rica.**

Na lista real, 115 leads (27%) têm "compliance" na *headline* mas **não** no
cargo. Buscar só por Cargo perde um quarto das pessoas certas:

| Onde busca | Casa em | Gerência ou acima |
|---|---|---|
| Campo Cargo | 151 / 422 | 24 |
| Palavras-chave (varre a headline) | **286 / 422** | **54** |

**2. `AND` entre dois grupos só funciona se os dois termos couberem no MESMO
texto.** "Head de Compliance" contém *Head* **e** *Compliance* — funciona. Já
exigir `"Regulatório" AND "BACEN"` **no título** casa em 4 leads de 422, porque
"BACEN" quase nunca está no título: está na headline. Foi esse o erro que zerou
as buscas 2 e 3 da primeira versão.

---

## Busca A — Volume (a principal)

Campo **Palavras-chave**. `OR` simples, sem `AND`, sem `NOT`:

```
Compliance OR PLD OR "Lavagem de Dinheiro" OR AML OR KYC OR "Controles Internos" OR "Auditoria Interna" OR Riscos OR Governança OR GRC OR LGPD OR DPO OR Privacidade OR "Proteção de Dados" OR Regulatório OR Ouvidoria
```

**Casa em 286 de 422 (68%).** É a de maior alcance. Traz muito analista — o que
não é defeito da busca, é o formato do mercado (ver mais abaixo). O corte de
nível se faz depois, na triagem local, que é melhor nisso que o Sales Navigator.

**Filtros laterais:**

| Filtro | Valor |
|---|---|
| Geografia | Brasil |
| Setor | Bancos · Serviços financeiros · Seguros · Mercado de capitais |
| Tamanho da empresa | 201+ funcionários |

**Não use o filtro "Nível hierárquico" aqui.** Ele infere do título e erra muito
— foi ele que estrangulou a primeira tentativa para 46 resultados.

---

## Busca B — Cargos altos (poucos e certeiros)

Quando quiser só decisor, sem passar pela triagem. Campo **Palavras-chave**:

```
(Compliance OR PLD OR Riscos OR "Controles Internos" OR Governança OR Auditoria OR LGPD OR Privacidade OR Regulatório OR Ouvidoria) AND (Head OR Diretor OR Diretora OR Superintendente OR Gerente OR Chief OR "Vice President" OR Sócio)
```

**Casa em 49 de 422, dos quais 34 são gerência ou acima** — 69% de precisão para
cargo alto. Aqui o `AND` funciona porque ambos os termos convivem na mesma
headline: *"Head de Compliance e Controles Internos"*, *"Gerente de Governança,
Riscos e Compliance"*, *"Superintendente de Compliance e PLD"*.

---

## Busca C — Gestão documental (a menos concorrida)

O eixo específico da DAISEE. Campo **Palavras-chave**, termos curtos e `OR`
simples — a versão anterior falhou por exigir frases raras combinadas com `AND`:

```
"gestão documental" OR "gestão de documentos" OR GED OR "acervo documental" OR "documentação regulatória" OR "normativos internos" OR "arquivo digital" OR "records management"
```

Lista pequena por natureza, mas quem se descreve assim **já nomeou o problema
sozinho**. Rode sem os filtros de setor na primeira vez, para ver o tamanho real
do universo antes de estreitar.

---

## Por que "só analistas" não é defeito da busca

Distribuição de cargo nos 422 leads da lista:

| Nível | Leads | % |
|---|---|---|
| Analista | 102 | 24% |
| Especialista sênior | 99 | 23% |
| Gerência | 52 | 12% |
| Coordenação | 35 | 8% |
| Diretoria | 27 | 6% |
| C-level/VP | 21 | 5% |

**Gerência ou acima é 23% do total.** A população de compliance no LinkedIn
brasileiro é majoritariamente analista e especialista — não há busca que invente
diretores que não existem. Qualquer filtro que traga "só cargos altos" vai
devolver pouca gente por natureza.

E há o contrapeso, medido na base (34 respostas em 184 leads):

| Termo no cargo | Taxa de resposta |
|---|---|
| Sênior | 67% (8/12) |
| Analista | 56% (10/18) |
| Riscos | 25% (6/24) |
| Director | 25% (1/4) |

**Quanto mais alto o cargo, menos a pessoa responde.** Decisão e resposta puxam
para lados opostos: o Analista Sênior de PLD/FT responde três vezes mais que o
diretor, mas não assina contrato. O caminho que respeita os dois é buscar os
dois, com mensagens diferentes — ao decisor, risco e custo; ao especialista, a
rotina e a ferramenta, e ele indica o decisor por dentro.

---

## O fluxo que funciona

Buscar **amplo** e cortar **local** — o Sales Navigator não sabe medir nível, a
triagem sabe:

```
# 1. Salve o resultado como lista no Sales Navigator, depois:
./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/triar-lista.ts \
  --lista "<URL da lista>" --max 2000 --csv saidas/triagem.csv

# 2. Revise o CSV por grupo (não lead a lead) e importe as faixas que aprovar:
./node_modules/.bin/dotenv -e .env.local -- npx tsx scripts/importar-sales-nav.ts \
  --lista "<URL da lista>" --nome "nome da lista" \
  --faixas ALVO,TALVEZ --max 2000 --apply
```

A triagem lê a lista **sem enriquecer perfil nenhum** — 1 chamada à Unipile, zero
de IA. Devolve pontuação, nível do cargo, os termos que casaram e o estado de
contato (quem já é conexão, quem já tem convite pendente), e a importação grava
exatamente o que foi aprovado, com a faixa registrada nas notas do lead.
