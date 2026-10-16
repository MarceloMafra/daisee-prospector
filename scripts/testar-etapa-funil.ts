// Casos tirados da base real de 15/10 (739 leads: 621 convites, 340 aceites,
// 116 respostas). Roda sem banco: `npx tsx scripts/testar-etapa-funil.ts`.
import { etapaDoLead, motivoEncerramento, type EntradaEtapa } from '../lib/etapaFunil'

const T1_ENVIADO = { type: 'LINKEDIN_250', status: 'ENVIADO', sentAt: new Date('2026-10-14') }
const T1_AGENDADO = { type: 'LINKEDIN_250', status: 'AGENDADO', sentAt: null }
const T2_AGENDADO = { type: 'LINKEDIN_500', status: 'AGENDADO', sentAt: null }
const T1_RESPONDIDO = { type: 'LINKEDIN_250', status: 'RESPONDIDO', sentAt: new Date('2026-10-02') }

const base = (o: Partial<EntradaEtapa>): EntradaEtapa => ({
  status: 'PROSPECTANDO',
  linkedinConnectedAt: null,
  interacoes: 0,
  touches: [],
  ...o,
})

const casos: [string, EntradaEtapa, string][] = [
  ['importado, sem cadência (103 na base)', base({}), 'BASE'],
  ['cadência pronta, convite na fila', base({ touches: [T1_AGENDADO, T2_AGENDADO] }), 'BASE'],
  ['convite enviado, sem aceite (281)', base({ touches: [T1_ENVIADO, T2_AGENDADO] }), 'CONVIDADO'],
  [
    'aceitou, T2 ainda não saiu',
    base({ linkedinConnectedAt: new Date('2026-10-15'), touches: [T1_ENVIADO, T2_AGENDADO] }),
    'CONECTADO',
  ],
  [
    'respondeu ao T1: touch RESPONDIDO',
    base({ linkedinConnectedAt: new Date('2026-10-03'), touches: [T1_RESPONDIDO, T2_AGENDADO] }),
    'EM_CONVERSA',
  ],
  [
    'respondeu por DM: só há Interacao, nenhum touch marcado',
    base({ linkedinConnectedAt: new Date('2026-10-03'), interacoes: 2, touches: [T1_ENVIADO] }),
    'EM_CONVERSA',
  ],
  [
    'respondeu mas o aceite não foi gravado',
    base({ interacoes: 1, touches: [T1_ENVIADO] }),
    'EM_CONVERSA',
  ],
  ['qualificado à mão, mesmo conversando', base({ status: 'QUALIFICADO', interacoes: 3 }), 'QUALIFICADO'],
  ['em progresso entra em Qualificado', base({ status: 'EM_PROGRESSO', interacoes: 5 }), 'QUALIFICADO'],
  ['descartado à mão, mesmo com resposta', base({ status: 'DESCARTADO', interacoes: 1 }), 'ENCERRADO'],
  ['perdido à mão', base({ status: 'PERDIDO' }), 'ENCERRADO'],
]

let falhas = 0
for (const [nome, entrada, esperado] of casos) {
  const obtido = etapaDoLead(entrada)
  const ok = obtido === esperado
  if (!ok) falhas++
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome} → ${obtido}${ok ? '' : ` (esperado ${esperado})`}`)
}

const motivos: [string, string | null][] = [
  ['DESCARTADO', 'Descartado (sem fit)'],
  ['PERDIDO', 'Perdido (sem interesse)'],
  ['PROSPECTANDO', null],
]
for (const [status, esperado] of motivos) {
  const obtido = motivoEncerramento(status)
  const ok = obtido === esperado
  if (!ok) falhas++
  console.log(`${ok ? 'ok  ' : 'FALHA'} motivo de ${status} → ${obtido}`)
}

console.log(falhas ? `\n${falhas} falha(s).` : `\nTodos os ${casos.length + motivos.length} casos passaram.`)
process.exit(falhas ? 1 : 0)
