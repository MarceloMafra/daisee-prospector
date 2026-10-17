// Regras de quem entra na onda de follow-up. Roda sem banco:
//   npx tsx scripts/testar-onda-followup.ts
import { elegivelDm, elegivelEmail, corpoDoEmail, type LeadParaOnda } from '../lib/ondaFollowup'

const AGORA = new Date('2026-10-17T15:00:00Z')
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * 86_400_000)

const base = (o: Partial<LeadParaOnda> = {}): LeadParaOnda => ({
  id: 'x',
  name: 'Fulano de Tal',
  company: 'Banco X',
  seniority: 'Gerente de Compliance',
  email: null,
  daiseeScore: 80,
  linkedinProviderId: 'ACoAAAxxxx',
  linkedinConnectedAt: diasAtras(20),
  excludedFromAutomation: false,
  interacoes: 0,
  touches: [
    { type: 'LINKEDIN_250', status: 'ENVIADO', sentAt: diasAtras(25) },
    { type: 'LINKEDIN_500', status: 'ENVIADO', sentAt: diasAtras(15) },
  ],
  ...o,
})

const dm = (status: string, d: number) => ({ type: 'LINKEDIN_FOLLOWUP', status, sentAt: d >= 0 ? diasAtras(d) : null })
const em = (status: string, d: number) => ({ type: 'EMAIL_FOLLOWUP', status, sentAt: d >= 0 ? diasAtras(d) : null })
const t2 = (d: number) => ({ type: 'LINKEDIN_500', status: 'ENVIADO', sentAt: diasAtras(d) })

const casos: [string, boolean, boolean][] = [
  ['conectado, T2 há 15 dias, mudo → entra', elegivelDm(base()).ok, true],
  ['T2 há 6 dias → ainda não', elegivelDm(base({ touches: [t2(6)] })).ok, false],
  ['T2 há exatamente 7 dias → entra', elegivelDm(base({ touches: [t2(7)] })).ok, true],
  ['T2 não saiu → não', elegivelDm(base({ touches: [{ type: 'LINKEDIN_500', status: 'AGENDADO', sentAt: null }] })).ok, false],
  ['não aceitou o convite → não', elegivelDm(base({ linkedinConnectedAt: null })).ok, false],
  ['respondeu por DM (Interacao) → não', elegivelDm(base({ interacoes: 1 })).ok, false],
  ['touch marcado RESPONDIDO → não', elegivelDm(base({ touches: [t2(15), { type: 'LINKEDIN_250', status: 'RESPONDIDO', sentAt: diasAtras(25) }] })).ok, false],
  ['fora da automação → não', elegivelDm(base({ excludedFromAutomation: true })).ok, false],
  ['sem linkedinProviderId → não', elegivelDm(base({ linkedinProviderId: null })).ok, false],
  ['follow-up já enviado → não repete', elegivelDm(base({ touches: [t2(15), dm('ENVIADO', 2)] })).ok, false],
  ['follow-up criado e não concluído → trava para conferência', elegivelDm(base({ touches: [t2(15), dm('AGENDADO', -1)] })).ok, false],
  ['follow-up que FALHOU → pode tentar de novo', elegivelDm(base({ touches: [t2(15), dm('FALHOU', -1)] })).ok, true],

  ['e-mail: DM há 3 dias, tem e-mail → entra', elegivelEmail(base({ email: 'a@banco.com.br', touches: [t2(15), dm('ENVIADO', 3)] })).ok, true],
  ['e-mail: DM há 2 dias → ainda não', elegivelEmail(base({ email: 'a@banco.com.br', touches: [t2(15), dm('ENVIADO', 2)] })).ok, false],
  ['e-mail: sem DM de follow-up → não (nunca no mesmo dia)', elegivelEmail(base({ email: 'a@banco.com.br' })).ok, false],
  ['e-mail: sem e-mail → não', elegivelEmail(base({ touches: [t2(15), dm('ENVIADO', 5)] })).ok, false],
  ['e-mail: endereço malformado → não', elegivelEmail(base({ email: 'sem-arroba', touches: [t2(15), dm('ENVIADO', 5)] })).ok, false],
  ['e-mail: respondeu depois da DM → não', elegivelEmail(base({ email: 'a@banco.com.br', interacoes: 1, touches: [t2(15), dm('ENVIADO', 5)] })).ok, false],
  ['e-mail: já enviado → não repete', elegivelEmail(base({ email: 'a@banco.com.br', touches: [t2(15), dm('ENVIADO', 6), em('ENVIADO', 1)] })).ok, false],
]

let falhas = 0
for (const [nome, obtido, esperado] of casos) {
  const ok = obtido === esperado
  if (!ok) falhas++
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome}`)
}

// O descadastro e a assinatura têm de estar no e-mail, venha o texto como vier.
const corpo = corpoDoEmail('Olá, Fulano.')
const rodape = corpo.includes('responder “sair”') && corpo.includes('Marcelo Mafra')
if (!rodape) falhas++
console.log(`${rodape ? 'ok  ' : 'FALHA'} e-mail sempre sai com assinatura e opção de descadastro`)

console.log(falhas ? `\n${falhas} falha(s).` : `\nTodos os ${casos.length + 1} casos passaram.`)
process.exit(falhas ? 1 : 0)
