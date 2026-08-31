# Kit de vendas DAISEE

Material herdado do projeto **daisee-automation** (março/2026), que foi descartado.
Trazido para cá em 31/08/2026 depois de passar pelo expurgo de promessas.

## O que tem aqui

| Arquivo | Serve para |
|---|---|
| `README_SALES_KIT.md` | Comece por aqui: mapa dos outros documentos |
| `DAISEE_Quick_Reference.md` | Cheat sheet — pitch de 30s, ICP e objeções por setor |
| `DAISEE_Sales_Knowledge_Base.md` | O documento de fundo: mercado, ICP, dores, concorrência |
| `DAISEE_Sector_Cheat_Sheet.md` | Um resumo por setor, para consulta rápida na conversa |
| `DAISEE_Sector_Comparison_Matrix.md` | Comparação entre os cinco setores e onde está o pipeline |
| `DAISEE_Prompt_Templates.md` | 15 templates de mensagem por cenário |
| `DAISEE_SalesNavigator_Guide.html` | Filtros de busca prontos para o Sales Navigator |
| `INDEX.md` | Índice detalhado do kit original |
| `RESUMO_EXECUTIVO.txt` | Resumo de uma página |

O valor real está no **ICP por setor, nas dores mapeadas, nos filtros do Sales
Navigator e no banco de objeções** — nada disso existe em outro lugar do projeto.

## O que foi retirado, e por quê

O kit é anterior às regras de honestidade da campanha. Foram removidas **56
promessas de resultado**: percentual de redução ("70% no tempo de busca"),
número de risco ("90% menos risco de versão errada"), ganho em horas
("20h/mês recuperadas") e prazo de implantação ("30 dias até 100% operacional").

Ficaram de pé, porque não são promessa:

- **característica do produto** — "100% privada", "zero dados externos" descrevem
  a arquitetura, não prometem ganho ao lead;
- **meta interna de pipeline** — "FIN: 40 → 60 leads" é planejamento nosso e nunca
  vai numa mensagem.

**O único número citável** é o depoimento da Dinamica Merchandising (70% de
redução no tempo de busca), sempre como o que aquele cliente relatou — nunca como
promessa a quem está lendo.

## Antes de usar em qualquer mensagem

Rode a auditoria no texto final. Ela pega case inventado, número de resultado,
DAISEE descrita como automação e a MasterVendas como autora do produto:

```
npx tsx scripts/testar-auditoria.ts          # 34 casos, não toca no banco
npx dotenv -e .env.local -- npx tsx scripts/auditar-claims.ts
```

O expurgo em si está em `scripts/expurgar-vendas.ts`, com cada substituição
comentada — serve de referência se aparecer material antigo de outra fonte.
