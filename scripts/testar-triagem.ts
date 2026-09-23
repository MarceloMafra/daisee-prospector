// Casos da triagem de lista (lib/triagemLista.ts). Os nomes vêm da lista de
// 22/09, que expôs três buracos: auditoria independente, terceiro setor e
// setor público entravam como ALVO.
//
//   npx tsx scripts/testar-triagem.ts
import { triar, type Faixa } from '../lib/triagemLista'

let falhas = 0
const ficha = (p: { cargo: string; empresa: string; setor?: string; headline?: string }) => ({
  nome: 'Fulano',
  headline: p.headline ?? p.cargo,
  cargo: p.cargo,
  empresa: p.empresa,
  setor: p.setor ?? '',
  uf: 'SP',
  providerId: 'x',
  convitePendente: false,
  grau: 'DISTANCE_2',
})

function confere(descricao: string, p: Parameters<typeof ficha>[0], esperada: Faixa) {
  const v = triar(ficha(p))
  const ok = v.faixa === esperada
  if (!ok) falhas++
  console.log(`${ok ? '✔' : '✘'} ${descricao} — ${v.pontos} pts, ${v.faixa}${ok ? '' : ` (esperado ${esperada})`}`)
  if (!ok) console.log(`    motivos: ${v.motivos.join(' · ')}`)
}

// A triagem lê cargo E headline: o título do LinkedIn é que traz a densidade
// técnica, e por isso os headlines abaixo são os reais da lista de 22/09.
console.log('— Quem é público-alvo')
confere(
  'gerente de controles internos em cooperativa',
  { cargo: 'Gerente de Controles Internos', headline: 'Gerente de Controles Internos | Compliance | Riscos | Governança', empresa: 'Sicredi Celeiro MT/RR', setor: 'Serviços financeiros' },
  'ALVO'
)
confere(
  'coordenadora de riscos e governança no Sicoob',
  { cargo: 'Coordenadora de Riscos e Governança', headline: 'Coordenadora de Riscos e Governança | Compliance | PLD/FT | Controles Internos | LGPD', empresa: 'Sicoob Credicapital', setor: 'Serviços financeiros' },
  'ALVO'
)
confere(
  'analista de compliance e PLD em banco',
  { cargo: 'Analista de Compliance e PLD/FT Sênior', headline: 'Analista de Compliance e PLD/FT Sênior | KYC | BACEN', empresa: 'Villela Brasil Bank', setor: 'Bancos' },
  'ALVO'
)
confere(
  'auditora interna em fundo de pensão (Previc)',
  { cargo: 'Analista Pleno de Riscos e Controles Internos', headline: 'Riscos | Controles Internos | Compliance | Auditoria | LGPD', empresa: 'Serpros Fundo Multipatrocinado', setor: 'Previdência' },
  'ALVO'
)

console.log('\n— Auditoria e consultoria independente: fornecedor do mesmo mercado')
confere('gerente sênior de auditoria na EY', { cargo: 'Gerente Sênior de Auditoria', empresa: 'EY', setor: 'Consultoria' }, 'FORA')
confere('auditor sênior na KPMG', { cargo: 'Auditor sênior', empresa: 'KPMG Brasil', setor: 'Consultoria' }, 'FORA')
confere('consultor FSI na Grant Thornton', { cargo: 'Consultor Sênior - FSI Advisory', empresa: 'Grant Thornton Brasil', setor: 'Consultoria' }, 'FORA')
confere('sócio de auditoria independente', { cargo: 'Especialista em Auditoria, Riscos e Controles', empresa: 'Sacho Auditores Independentes', setor: 'Auditoria' }, 'FORA')

console.log('\n— Terceiro setor e setor público')
confere('vice-presidente de associação', { cargo: 'Vice-presidente', empresa: 'IBEF RS - Instituto Brasileiro de Executivos de Finanças', setor: '' }, 'FORA')
confere('coordenadora voluntária de clube', { cargo: 'Coordenadora Voluntária de Planejamento', empresa: 'Araruama Va´a - Canoa Havaiana', setor: '' }, 'FORA')
confere('consultor jurídico em ministério', { cargo: 'Consultor jurídico', empresa: 'Ministerio Da Saude', setor: 'Administração pública' }, 'FORA')

console.log('\n— O que já funcionava continua funcionando')
confere('dono de empresa sem função de compliance', { cargo: 'Founder & CEO', empresa: 'Mileto Tech Motors', setor: 'Tecnologia' }, 'FORA')
confere('sem empregador identificável', { cargo: 'Auditora Interna | Compliance', empresa: 'Não informado', setor: '' }, 'FORA')
confere('estagiário de compliance em banco', { cargo: 'Estagiário de Compliance', empresa: 'Banco Daycoval', setor: 'Bancos' }, 'FORA')

if (falhas) {
  console.log(`\n${falhas} caso(s) falharam.`)
  process.exitCode = 1
} else {
  console.log('\nTodos os casos passaram.')
}
