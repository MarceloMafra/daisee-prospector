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
  ['Fluxos de onboarding, regras de motor antifraude, documentação de due diligence de credenciamento.', false, 'due diligence como documentacao (coletivo)'],
  ['Canal de denúncias, due diligence, auditorias — e os docs?', false, 'due diligence em enumeracao de temas (assunto de email)'],
  ['Políticas, due diligence e treinamentos geram acervo.', false, 'due diligence em enumeracao com "e"'],
  ['A DAISEE cuida da due diligence dos seus fornecedores.', true, 'promessa continua sendo pega apos as excecoes'],
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

// CASE: afirmar semelhanca com outro cliente pressupoe o outro cliente. O T3 da
// Niara Ferro dizia "uma empresa de tecnologia com desafios parecidos" -- case
// que nao existe, e a regra so enxergava "casos parecidos".
const CASE_SEMELHANCA: [string, boolean, string][] = [
  ['Conversei com uma empresa de tecnologia com desafios parecidos.', true, 'desafios parecidos'],
  ['Vi uma operação com dores similares à de vocês.', true, 'dores similares'],
  ['Outra área com problemas semelhantes resolveu assim.', true, 'problemas semelhantes'],
  ['Encontrei cenários parecidos em outras instituições.', true, 'cenarios parecidos'],
  ['Não conheço empresas com desafios parecidos para te citar.', false, 'negacao explicita'],
  ['Vi que você enfrenta desafios de integração entre sistemas.', false, 'desafio do lead, sem semelhanca'],
]

// AUTOMACAO no ASSUNTO: o titulo do e-mail nao tem sujeito, entao a checagem de
// CONTEXTO_DO_LEAD nao tem o que reconhecer -- e o assunto caia mesmo com o corpo
// inteiro falando do lead. Terceiro caso do mesmo padrao: Mayra Benaion Lachter e
// Marcelo da Veiga em 02/09, Diego Alvim (BTG) em 04/09.
const AUTOMACAO_NO_ASSUNTO: [string, boolean, string][] = [
  [
    'Conexão — Automação & IA no BTG\nDiego, parabéns pela posição de Associate Director em Process Automation & AI no BTG. Você lidera essa área num banco desse porte.',
    false,
    'assunto cita o CARGO do lead e o corpo fala dele',
  ],
  [
    'Canal de denúncias, due diligence, auditorias — e os docs?\nVi que você toca todas essas frentes.',
    false,
    'assunto enumera a rotina do lead',
  ],
  [
    'Workflow e robôs\nA DAISEE automatiza o seu fluxo de aprovação de contratos.',
    true,
    'assunto solto, mas o corpo promete: continua acusando',
  ],
  [
    'Automação de processos\nNossa plataforma faz o monitoramento de risco dos seus fornecedores.',
    true,
    'sujeito nosso no corpo: continua acusando',
  ],
  [
    'Automação de processos\nBom dia, tudo bem?',
    true,
    'assunto sem corpo que fale do lead: continua acusando',
  ],
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

// Declaracao de intencao: regra do Marcelo em 31/08. Negar o interesse comercial
// e afirmacao falsa -- ele TEM segunda intencao, e o lead sabe. A legitimidade
// vem da pergunta agregar valor.
const INTENCAO: [string, boolean, string][] = [
  ['Te chamo sem segunda intenção, só para trocar ideia.', true, 'sem segunda intencao'],
  ['Escrevo sem segundas intenções.', true, 'plural'],
  ['Não quero te vender nada, juro.', true, 'nao quero te vender nada'],
  ['Não vou te vender nada agora.', true, 'nao vou te vender nada'],
  ['Isso não é um pitch.', true, 'nao e um pitch'],
  ['Não é uma abordagem comercial.', true, 'nao e abordagem comercial'],
  ['Podemos conversar sem compromisso algum.', true, 'sem compromisso algum'],
  ['Não estou vendendo nada aqui.', true, 'nao estou vendendo'],
  ['Falo sem nenhum interesse comercial.', true, 'sem interesse comercial'],
  ['Prometo que não vou insistir.', true, 'nao vou insistir'],
  ['Faço prospecção e vendo software — por isso te procurei.', false, 'assumir a intencao NAO e violacao'],
  ['Se a conversa fizer sentido, proponho uma call de 20 minutos.', false, 'CTA direto passa'],
  ['Vi que você não vende para o varejo desde 2024.', false, 'trajetoria do lead com "vend"'],
  ['Como funciona hoje a busca de documentos no seu time?', false, 'pergunta limpa'],
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

for (const [texto, deveAcusar, rotulo] of CASE_SEMELHANCA) {
  const acusou = violacoesEmTexto(texto).some(x => x.regra === 'CASE')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${deveAcusar ? 'esperado ACUSAR' : 'esperado passar'} · ${rotulo}`)
}

for (const [texto, deveAcusar, rotulo] of AUTOMACAO_NO_ASSUNTO) {
  const acusou = violacoesEmTexto(texto).some(x => x.regra === 'AUTOMACAO')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${deveAcusar ? 'esperado ACUSAR' : 'esperado passar'} · ${rotulo}`)
}

for (const [texto, deveAcusar, rotulo] of INTENCAO) {
  const acusou = violacoesEmTexto(texto).some(x => x.regra === 'INTENCAO')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${deveAcusar ? 'esperado ACUSAR' : 'esperado passar'} · ${rotulo}`)
}


// REPERTORIO: a regra existe para barrar experiencia acumulada que a
// MasterVendas nao tem ("o que costuma funcionar nesses casos"). Quando o
// sujeito e a ROTINA DO LEAD, "costuma" e pergunta legitima, nao case inventado.
// Caso real: Gustavo Andrade Milhomem (Sicredi) em 03/10 -- "a busca nas pastas
// costuma resolver" foi barrado, e o guard TRAJETORIA_DO_LEAD existia mas so
// enxergava 120 caracteres atras, e "Na sua rotina" estava a ~145.
const REPERTORIO: [string, boolean, string][] = [
  [
    'Na sua rotina de controladoria e auditoria PJ, quando precisa cruzar evidências ou localizar uma cláusula específica num contrato, a busca nas pastas costuma resolver rápido ou ainda dá trabalho?',
    false,
    'CASO GUSTAVO: sujeito e a rotina do lead, a 145 caracteres',
  ],
  ['Na sua rotina, a busca nas pastas costuma resolver rápido?', false, 'mesma frase, sujeito perto'],
  ['Você sabe se a busca atual costuma resolver esse tipo de consulta?', false, 'voce = sujeito do lead'],
  ['Pelo que costuma funcionar nesses casos, o caminho é indexar primeiro.', true, 'repertorio nosso: deve continuar acusando'],
  ['Na maioria das vezes o problema está na indexação.', true, 'na maioria das vezes'],
  ['Vejo com frequência esse gargalo em cooperativas.', true, 'vejo com frequencia'],
  ['O padrão que a gente observa é esse.', true, 'o padrao que a gente observa'],
  ['A DAISEE costuma resolver esse tipo de busca.', true, 'sujeito NOSSO na frase: acusa'],
  ['Nossa plataforma costuma dar certo nesse cenário.', true, 'nossa plataforma: acusa'],
]

for (const [texto, deveAcusar, rotulo] of REPERTORIO) {
  const acusou = violacoesEmTexto(texto).some(x => x.regra === 'REPERTORIO')
  const ok = acusou === deveAcusar
  if (!ok) falhas++
  console.log(`${ok ? '  ok  ' : ' FALHA'} | ${deveAcusar ? 'esperado ACUSAR' : 'esperado passar'} · ${rotulo}`)
}

console.log(falhas === 0 ? '\nTodos os casos passaram.' : `\n${falhas} falha(s).`)
