// Nova tentativa para falhas de conexão com o Neon.
//
// Por que existe: o Neon dorme (scale-to-zero) e o pool do Prisma aqui é de UMA
// conexão. Na prática, qualquer consulta pode falhar de forma transitória — e,
// num lote de 40 envios, isso aconteceu três vezes entre 10 e 14/10 (Daniel V.,
// Jânio Heron, Melise Tauhyl).
//
// O risco não é a falha em si: nas três vezes ela caiu na consulta de ENTRADA do
// sendTouchNow, antes de tocar o LinkedIn, e o lead ficou intacto. O risco é a
// simétrica — cair DEPOIS de o convite sair e antes de gravar. Aí o convite
// chegou ao lead, o touch continua AGENDADO e no dia seguinte ele recebe o mesmo
// convite de novo. Foi o incidente de 10/09, com 11 leads.
//
// Havia um withDbRetry local dentro do scripts/bulk-prepare.ts, mas o filtro
// dele só reconhecia "Can't reach database server", "Connection terminated",
// ECONNRESET e ETIMEDOUT — deixava passar justamente o esgotamento de pool e o
// "Server has closed the connection", que foram os mais frequentes.

const PADROES_DE_CONEXAO = [
  /Can't reach database server/i,
  /Connection terminated/i,
  /Server has closed the connection/i,
  // Esgotamento do pool: com connection limit 1, duas consultas simultâneas
  // (um lote rodando e uma consulta manual, por exemplo) já bastam.
  /Timed out fetching a new connection from the connection pool/i,
  // No Windows o reset chega como código 10054 e a mensagem vem traduzida,
  // então procuramos o kind do Rust, não o texto.
  /ConnectionReset/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /ECONNREFUSED/i,
  /Error in PostgreSQL connection/i,
]

const ATRASOS_PADRAO_MS = [2000, 5000, 10000]

/**
 * Diz se o erro é de conexão com o banco — e, portanto, vale repetir.
 * Violação de unicidade, argumento inválido ou erro de regra de negócio NÃO
 * entram: repetir esses só esconde o defeito.
 */
export function ehErroDeConexao(erro: unknown): boolean {
  if (!(erro instanceof Error)) return false
  return PADROES_DE_CONEXAO.some((re) => re.test(erro.message))
}

const dormir = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Executa `fn` e, se falhar por conexão, espera e tenta de novo.
 * Esgotadas as tentativas, propaga o erro original — quem chamou precisa saber.
 *
 * ATENÇÃO: só envolva operações IDEMPOTENTES. Repetir uma leitura é seguro;
 * repetir algo que já disparou efeito externo (um convite no LinkedIn, por
 * exemplo) duplica esse efeito.
 */
export async function comRetentativaDeBanco<T>(
  rotulo: string,
  fn: () => Promise<T>,
  atrasosMs: number[] = ATRASOS_PADRAO_MS
): Promise<T> {
  let ultimoErro: unknown

  for (let tentativa = 0; tentativa <= atrasosMs.length; tentativa++) {
    try {
      return await fn()
    } catch (erro) {
      ultimoErro = erro
      if (!ehErroDeConexao(erro) || tentativa === atrasosMs.length) throw erro
      const espera = atrasosMs[tentativa]
      console.log(
        `${rotulo}: banco inacessível, aguardando ${espera / 1000}s pra tentar de novo (tentativa ${tentativa + 2}).`
      )
      await dormir(espera)
    }
  }

  throw ultimoErro
}
