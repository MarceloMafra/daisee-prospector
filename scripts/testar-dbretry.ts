// Casos colhidos da operação real, não inventados. Cada string abaixo derrubou
// um envio ou um preparo entre 03/10 e 14/10:
//
//   - Daniel V. (Banco Original), 10/10: pool esgotado no meio do lote.
//   - Jânio Heron e Melise Tauhyl, 14/10: o mesmo, duas vezes no lote de 40.
//   - bulk-prepare de 09/10: ConnectionReset do Windows (código 10054).
//   - status-campanha e espelhar-agenda, 05/10 e 13/10: Neon frio.
//
// O withDbRetry que existia dentro do bulk-prepare só reconhecia
// "Can't reach database server", "Connection terminated", ECONNRESET e ETIMEDOUT
// — ou seja, deixava passar o esgotamento de pool e o "Server has closed",
// justamente os que mais apareceram.
import { ehErroDeConexao, comRetentativaDeBanco } from '../lib/dbRetry'

const DEVE_REPETIR: [string, string][] = [
  [
    'Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 10, connection limit: 1)',
    'pool esgotado — Daniel V. 10/10, Jânio e Melise 14/10',
  ],
  [
    "Can't reach database server at `ep-misty-surf-ack851ps-pooler.sa-east-1.aws.neon.tech:5432`",
    'Neon frio na primeira conexão',
  ],
  ['Server has closed the connection.', 'conexão fechada pelo servidor'],
  [
    'Error in PostgreSQL connection: Error { kind: Io, cause: Some(Os { code: 10054, kind: ConnectionReset, message: "Foi forçado o cancelamento de uma conexão existente pelo host remoto." }) }',
    'ConnectionReset do Windows (10054), mensagem em português',
  ],
  ['Connection terminated unexpectedly', 'caso que o filtro antigo já pegava'],
  ['read ECONNRESET', 'caso que o filtro antigo já pegava'],
  ['connect ETIMEDOUT 10.0.0.1:5432', 'caso que o filtro antigo já pegava'],
]

// Erro de banco não é desculpa para repetir qualquer coisa: repetir uma violação
// de unicidade ou um argumento inválido só esconde o defeito e gasta tempo.
const NAO_DEVE_REPETIR: [string, string][] = [
  ['Unique constraint failed on the fields: (`email`)', 'violação de unicidade'],
  ['Invalid value for argument `status`', 'argumento inválido do Prisma'],
  ['fetch failed', 'falha da Unipile — não é banco, tem tratamento próprio'],
  ['Lead não encontrado', 'erro de regra de negócio'],
]

let falhas = 0

for (const [mensagem, rotulo] of DEVE_REPETIR) {
  const ok = ehErroDeConexao(new Error(mensagem))
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | esperado REPETIR · ${rotulo}`)
}

for (const [mensagem, rotulo] of NAO_DEVE_REPETIR) {
  const ok = !ehErroDeConexao(new Error(mensagem))
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | esperado NÃO repetir · ${rotulo}`)
}

async function comportamento() {
  // Sucesso na segunda tentativa: é o caso real do Neon frio.
  let chamadas = 0
  const valor = await comRetentativaDeBanco('teste', async () => {
    chamadas++
    if (chamadas === 1) throw new Error('Server has closed the connection.')
    return 'ok'
  }, [10])
  const recuperou = valor === 'ok' && chamadas === 2
  if (!recuperou) falhas++
  console.log(`${recuperou ? '  ok  ' : ' FALHA'} | recupera na segunda tentativa (${chamadas} chamadas)`)

  // Erro que não é de conexão sobe na hora, sem gastar tentativa.
  let chamadasB = 0
  let subiu = false
  try {
    await comRetentativaDeBanco('teste', async () => {
      chamadasB++
      throw new Error('Unique constraint failed on the fields: (`email`)')
    }, [10, 10])
  } catch {
    subiu = true
  }
  const certo = subiu && chamadasB === 1
  if (!certo) falhas++
  console.log(`${certo ? '  ok  ' : ' FALHA'} | erro de regra sobe sem repetir (${chamadasB} chamada)`)

  // Esgotou as tentativas: o erro original tem de chegar a quem chamou.
  let chamadasC = 0
  let mensagem = ''
  try {
    await comRetentativaDeBanco('teste', async () => {
      chamadasC++
      throw new Error('Server has closed the connection.')
    }, [10, 10])
  } catch (e) {
    mensagem = e instanceof Error ? e.message : ''
  }
  const esgotou = chamadasC === 3 && mensagem.includes('Server has closed')
  if (!esgotou) falhas++
  console.log(`${esgotou ? '  ok  ' : ' FALHA'} | esgota as tentativas e propaga o erro (${chamadasC} chamadas)`)

  console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} falha(s).`)
  process.exit(falhas === 0 ? 0 : 1)
}

comportamento()
