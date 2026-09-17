// Casos das partes determinísticas da indicação (lib/indicacao.ts).
//
//   npx dotenv -e .env.local -- npx tsx scripts/testar-indicacao.ts
import { lerIndicacao, nomeAbreviado, nomeConfere, notaDeIndicacao } from '../lib/indicacao'

let falhas = 0
function confere(descricao: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(`${ok ? '✔' : '✘'} ${descricao}${ok ? '' : ` — esperado ${JSON.stringify(esperado)}, obtido ${JSON.stringify(obtido)}`}`)
}

console.log('— Nome do candidato na busca do LinkedIn')
confere('nome completo igual', nomeConfere('Mariana Lage', 'Mariana Lage'), true)
confere('com nome do meio', nomeConfere('Mariana Lage', 'Mariana Souza Lage'), true)
confere('sem acento', nomeConfere('Débora Sara', 'Debora Sara'), true)
confere('sobrenome abreviado que confere', nomeConfere('Mariana Lage', 'Mariana L.'), true)
confere('sobrenome abreviado de outra pessoa', nomeConfere('Mariana Lage', 'Mariana M.'), false)
confere('sobrenome parecido', nomeConfere('Mariana Lage', 'Mariana Lago'), false)
confere('primeiro nome diferente', nomeConfere('Mariana Lage', 'Marina Clara Menezes Lage'), false)
confere('só o primeiro nome informado', nomeConfere('Mariana', 'Mariana Cardarelli'), true)

console.log('\n— Sobrenome escondido pelo LinkedIn (fora da rede)')
confere('"Mariana M." pode ser a Mariana Lage', nomeAbreviado('Mariana Lage', 'Mariana M.'), true)
confere('nome completo não é abreviado', nomeAbreviado('Mariana Lage', 'Mariana Lage'), false)
confere('outro primeiro nome', nomeAbreviado('Mariana Lage', 'Marina M.'), false)
confere('só o primeiro nome não é abreviado', nomeAbreviado('Mariana Lage', 'Mariana'), false)

console.log('\n— Nota de indicação: grava e lê de volta')
const nota = notaDeIndicacao({
  indicador: 'Victor Neves',
  empresaIndicador: 'Clara',
  trecho: 'Blz, Marcelo.\nQuem cuida mais dessa parte de compliance documental com o Bacen na Clara é a Mariana Lage.',
  data: new Date('2026-09-15T21:14:31Z'),
  assunto: 'compliance documental com o Bacen',
})
confere('lida de volta', lerIndicacao(`Importado manualmente.\n\n${nota}\n\nOutra nota depois.`), {
  indicador: 'Victor Neves',
  empresaIndicador: 'Clara',
  trecho: 'Blz, Marcelo. Quem cuida mais dessa parte de compliance documental com o Bacen na Clara é a Mariana Lage.',
})
confere('empresa com parênteses no nome', lerIndicacao(notaDeIndicacao({
  indicador: 'Ana Souza',
  empresaIndicador: 'Banco X (Brasil)',
  trecho: 'Fale com o João.',
  data: new Date('2026-09-15T12:00:00Z'),
}))?.indicador, 'Ana Souza')
confere('notas sem indicação', lerIndicacao('Importado do Sales Navigator.\nTriagem: ALVO (80 pts)'), null)

if (falhas) {
  console.log(`\n${falhas} caso(s) falharam.`)
  process.exitCode = 1
} else {
  console.log('\nTodos os casos passaram.')
}
