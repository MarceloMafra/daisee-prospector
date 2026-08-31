/**
 * Verifica se a conta do LinkedIn ainda está conectada na Unipile e avisa por
 * WhatsApp quando cai.
 *
 * A sessão do LinkedIn expira sozinha de tempos em tempos — mais ainda saindo
 * por proxy. Quando isso aconteceu em 27/08, nada avisou: a campanha ficou três
 * dias sem disparar e cinco sem aceite novo, e o sintoma só apareceu escondido
 * num log de enriquecimento ("401 Disconnected account"). Do lado de fora, era
 * indistinguível de um dia fraco.
 *
 * A conta viva devolve sources[].status === 'OK'. 'CREDENTIALS' significa que a
 * Unipile está no ar e a assinatura válida, mas o provedor pediu reautenticação.
 */
import { enviarWhatsApp } from '@/lib/notifySdr'

export type EstadoConexao = 'OK' | 'PRECISA_RECONECTAR' | 'INDISPONIVEL'

export interface ResultadoConexao {
  estado: EstadoConexao
  detalhe: string
  avisou: boolean
}

export async function checarConexaoUnipile(): Promise<ResultadoConexao> {
  const base = process.env.UNIPILE_BASE_URL || ''
  const key = process.env.UNIPILE_API_KEY || ''
  const accountId = process.env.UNIPILE_ACCOUNT_ID || ''

  if (!base || !key || !accountId) {
    return { estado: 'INDISPONIVEL', detalhe: 'Credenciais da Unipile ausentes no ambiente.', avisou: false }
  }

  let estado: EstadoConexao
  let detalhe: string

  try {
    const r = await fetch(`${base}/accounts/${accountId}`, {
      headers: { 'X-API-KEY': key, accept: 'application/json' },
    })

    if (!r.ok) {
      estado = 'INDISPONIVEL'
      detalhe = `A API da Unipile respondeu ${r.status} ao consultar a conta.`
    } else {
      const conta = (await r.json()) as { sources?: { id: string; status: string }[] }
      const fontes = conta.sources ?? []
      const ruins = fontes.filter((s) => s.status !== 'OK')

      if (!fontes.length) {
        estado = 'INDISPONIVEL'
        detalhe = 'A conta não devolveu nenhuma fonte de dados.'
      } else if (ruins.length) {
        estado = 'PRECISA_RECONECTAR'
        detalhe = `Sessão do LinkedIn caiu (status ${ruins.map((s) => s.status).join(', ')}). Nada é enviado até reconectar.`
      } else {
        estado = 'OK'
        detalhe = 'Conta conectada.'
      }
    }
  } catch (e) {
    estado = 'INDISPONIVEL'
    detalhe = `Não foi possível falar com a Unipile: ${e instanceof Error ? e.message : String(e)}`
  }

  if (estado === 'OK') return { estado, detalhe, avisou: false }

  // Sem dedupe de propósito: o cron roda 2x ao dia, então a conta caída rende
  // dois lembretes diários até alguém reconectar — e o AuditLog exige leadId,
  // que um aviso de sistema não tem.
  const texto = [
    '🔌 LINKEDIN DESCONECTADO',
    detalhe,
    '',
    '👉 Reconectar a conta em app.unipile.com (login do LinkedIn, às vezes com código).',
    'Enquanto isso: convites, DMs e monitoramento de respostas ficam parados.',
  ].join('\n')

  const envio = await enviarWhatsApp(texto)
  return { estado, detalhe, avisou: envio.ok }
}
