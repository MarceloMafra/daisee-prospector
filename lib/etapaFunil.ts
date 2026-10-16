// Etapa do lead no funil do MV-Prospector.
//
// O campo `status` do banco é uma decisão humana e quase ninguém mexia nele:
// em 15/10, 713 de 739 leads estavam em PROSPECTANDO, misturando quem nem foi
// convidado com quem já estava em conversa. As quatro primeiras etapas abaixo
// não precisam de ninguém para mudar — saem dos eventos que o sistema já grava
// (convite enviado, aceite, resposta). Só Qualificado e Encerrado continuam
// sendo decisão do operador, e continuam vivendo em `status`.

export type Etapa =
  | 'BASE'
  | 'CONVIDADO'
  | 'CONECTADO'
  | 'EM_CONVERSA'
  | 'QUALIFICADO'
  | 'ENCERRADO'

export const ETAPAS: { etapa: Etapa; rotulo: string }[] = [
  { etapa: 'BASE', rotulo: 'Base' },
  { etapa: 'CONVIDADO', rotulo: 'Convidado' },
  { etapa: 'CONECTADO', rotulo: 'Conectado' },
  { etapa: 'EM_CONVERSA', rotulo: 'Em conversa' },
  { etapa: 'QUALIFICADO', rotulo: 'Qualificado' },
  { etapa: 'ENCERRADO', rotulo: 'Encerrado' },
]

export interface EntradaEtapa {
  status: string
  linkedinConnectedAt: Date | string | null
  /** Quantas mensagens o lead já escreveu (Interacao). */
  interacoes: number
  touches: { type: string; status: string; sentAt: Date | string | null }[]
}

export function etapaDoLead(l: EntradaEtapa): Etapa {
  // Decisão humana tem prioridade sobre o que o sistema deduziria.
  if (l.status === 'QUALIFICADO' || l.status === 'EM_PROGRESSO') return 'QUALIFICADO'
  if (l.status === 'DESCARTADO' || l.status === 'PERDIDO') return 'ENCERRADO'

  const respondeu = l.interacoes > 0 || l.touches.some((t) => t.status === 'RESPONDIDO')
  if (respondeu) return 'EM_CONVERSA'
  if (l.linkedinConnectedAt) return 'CONECTADO'

  const convidou = l.touches.some((t) => t.type === 'LINKEDIN_250' && t.sentAt)
  if (convidou) return 'CONVIDADO'

  return 'BASE'
}

/** Rótulo do motivo quando o lead está em Encerrado (por ora, só o que o status guarda). */
export function motivoEncerramento(status: string): string | null {
  if (status === 'DESCARTADO') return 'Descartado (sem fit)'
  if (status === 'PERDIDO') return 'Perdido (sem interesse)'
  return null
}
