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

// Casos de negacao vindos das cadencias geradas em 24/08 -- os dois textos
// estavam certos e a auditoria os acusava.
const NEGACAO: [string, RegExp | null, string][] = [
  ['Busca em linguagem natural, com resposta que aponta o documento de origem. Sem automação de workflow, sem promessas genéricas.', /AUTOMACAO/, 'nega com "Sem"'],
  ['Não tenho experiência acumulada no setor de seguros para te dizer "o que costuma funcionar" — e prefiro ser honesto sobre isso.', /REPERTORIO/, 'nega a 64 chars de distancia'],
  ['A DAISEE reduz sem esforço em 40% o tempo de busca.', null, '"sem" NAO pode liberar numero'],
  ['A ferramenta recupera 20h/mês por analista.', null, 'promessa em horas, nao em %'], 
  ['Você economiza 3 horas por semana com isso.', null, 'promessa em horas por semana'], 
  ['Fica operacional em 30 dias.', null, 'promessa de prazo de implantacao'], 
  ['A reunião leva 15 minutos.', /NUMERO/, 'duracao de reuniao NAO e promessa'], 
  ['Nossa plataforma faz o monitoramento de risco sem esforço algum.', null, 'promessa seguida de "sem": a negacao vem depois, nao desmente'],
  ['Me chamou atenção um ponto do seu escopo: a condução de due diligence de parceiros comerciais.', /AUTOMACAO/, 'AUTOMACAO: "seu escopo" e marcador do lead'], 
  ['O seu escopo na FGV — minutas, editais e due diligence — envolve volume documental.', /AUTOMACAO/, 'AUTOMACAO: escopo, forma longa'], 
  ['Na sua atuação com due diligence de fornecedores, como funciona a busca?', /AUTOMACAO/, 'AUTOMACAO: "sua atuacao"'], 
]

// Autoria: a MasterVendas e parceira da DAISEE, nao a desenvolvedora.
// As formulacoes abaixo sairam da propria base em 25/08.
const AUTORIA: [string, boolean, string][] = [
  ['Sou fundador da MasterVendas e desenvolvemos a DAISEE, uma IA privada de gestão documental.', true, 'desenvolvemos a DAISEE'], 
  ['Criamos a DAISEE para resolver esse problema.', true, 'criamos a DAISEE'], 
  ['Trabalho com a DAISEE — uma IA privada de gestão documental que desenvolvemos.', true, 'que desenvolvemos (posposto)'], 
  ['Desenvolvi uma IA privada de gestão documental, a DAISEE.', true, 'desenvolvi ... a DAISEE'], 
  ['Somos parceiros da DAISEE, uma IA privada de gestão documental.', false, 'FORMULACAO CORRETA: somos parceiros'], 
  ['Trabalho com a DAISEE, uma IA privada de gestão documental.', false, 'FORMULACAO CORRETA: trabalho com'], 
  ['Vi que você desenvolveu o fluxo de invoices na Clara.', false, 'desenvolveu = trabalho do lead'], 
  ['Vi que você desenvolveu um repositório interno antes de conhecer a DAISEE.', false, 'trabalho do lead com DAISEE na frase'], 
  ['A DAISEE é uma IA privada que cria exatamente isso — uma base documental pesquisável.', false, 'a DAISEE que cria, nao nos'], 
  ['Pergunto porque desenvolvemos uma IA de gestão documental (DAISEE).', true, 'desenvolvemos uma IA ... (DAISEE)'], 
  ['Desenvolvi a DAISEE, uma IA privada de gestão documental.', true, 'Desenvolvi a DAISEE'], 
]

let falhas = 0
for (const [texto, deveAcusar, rotulo] of casos) {
  const v = violacoesEmTexto(texto)
  const acusou = v.some(x => x.regra === 'AUTOMACAO')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | esperado ${deveAcusar ? 'ACUSAR' : 'passar'} · ${rotulo}`)
}
for (const [texto, regraProibida, rotulo] of NEGACAO) {
  const v = violacoesEmTexto(texto)
  // regraProibida = null significa "tem de continuar acusando alguma coisa"
  const ok = regraProibida ? !v.some(x => regraProibida.test(x.regra)) : v.length > 0
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${regraProibida ? 'esperado passar' : 'esperado ACUSAR'} · ${rotulo}`)
}

for (const [texto, deveAcusar, rotulo] of AUTORIA) {
  const acusou = violacoesEmTexto(texto).some(x => x.regra === 'AUTORIA')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${deveAcusar ? 'esperado ACUSAR' : 'esperado passar'} · ${rotulo}`)
}

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} falha(s).`)
