/** Formato devolvido por GET /api/relatorio — usado pelo Dashboard e pelo Relatório. */
export interface Relatorio {
  geradoEm: string
  funil: {
    base: number
    convites: number
    aceites: number
    taxaAceite: number
    dms: number
    emails: number
    respostas: number
    taxaResposta: number
    qualificados: number
    filaT1: number
    semCadencia: number
    falhas: number
  }
  ritmo: { dia: string; enviados: number; aceites: number }[]
  quota: {
    enviadosHoje: number
    limite: number
    ultimoEnvio: string | null
    diasSemEnvio: number | null
  }
  aguardandoAceite: { total: number; faixas: Record<string, number> }
  score: { base: number; aceitos: number; responderam: number }
  pendencias: {
    aguardandoResposta: {
      nome: string
      empresa: string
      score: number
      horas: number
      mensagem: string
    }[]
    t2Prontos: { nome: string; empresa: string; score: number }[]
    emConversaSemT2: number
  }
  conversas: {
    nome: string
    empresa: string
    score: number
    diasUltimoContato: number | null
    situacao: string
  }[]
}

export const horaBR = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export const decimal = (n: number) => n.toFixed(1).replace('.', ',')
