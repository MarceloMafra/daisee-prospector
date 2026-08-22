import { violacoesEmTexto } from '../lib/auditoriaClaims'

const casos: [string, boolean, string][] = [
  ['Vi no seu perfil que você trabalha com a MasterTax para automação de fluxos de compliance tributário.', false, 'lead: presente'],
  ['Vi no seu perfil que você construiu o fluxo de ingestão automatizada de invoices na Clara.', false, 'lead: -iu'],
  ['lembrei do seu perfil por algo que você descreveu na Caju: automação de dossiês com pastas por CPF/CNPJ.', false, 'lead: -eu'],
  ['Vi que na FGV você coordena compliance e lida com padronização de minutas e due diligence de parceiros.', false, 'lead: due diligence dele'],
  ['a empresa tem investido pesado em IA no ecossistema (agentes autônomos, automação de chamados).', false, 'empresa do lead'],
  ['seu histórico mostra alguém que lida com dossiês de onboarding, matrizes de risco, respostas ao BACEN, due diligence.', false, 'histórico do lead'],
  ['A DAISEE não é automação de processos — é uma camada sobre documentos.', false, 'negação'],
  ['A DAISEE automatiza o seu fluxo de aprovação de contratos.', true, 'DAISEE como automação'],
  ['Nossa plataforma faz o monitoramento de risco dos seus fornecedores.', true, 'promessa de monitoramento'],
  ['A DAISEE executa a due diligence dos parceiros pra você.', true, 'promete executar due diligence'],
  ['Você vai poder montar um workflow inteiro com a DAISEE.', true, 'workflow prometido com DAISEE na frase'],
  ['Ela indexa relatórios de due diligence e cita a fonte.', false, 'due diligence como documento'],
]

let falhas = 0
for (const [texto, deveAcusar, rotulo] of casos) {
  const v = violacoesEmTexto(texto)
  const acusou = v.some(x => x.regra === 'AUTOMACAO')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | esperado ${deveAcusar ? 'ACUSAR' : 'passar'} · ${rotulo}`)
}
console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} falha(s).`)
