// Casos do cálculo de disponibilidade (lib/agenda.ts). Não acessa a internet:
// os compromissos são fixtures, e o relógio é fixo.
//
//   npx tsx scripts/testar-agenda.ts
import { formatarHorario, horariosLivres, noFuso, ocupadosDoCalendario, type Ocupado } from '../lib/agenda'

const TZ = 'America/Sao_Paulo'
let falhas = 0
function confere(descricao: string, obtido: unknown, esperado: unknown) {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado)
  if (!ok) falhas++
  console.log(`${ok ? '✔' : '✘'} ${descricao}${ok ? '' : `\n    esperado ${JSON.stringify(esperado)}\n    obtido   ${JSON.stringify(obtido)}`}`)
}

const em = (dia: number, hora: number, minuto = 0) => noFuso(2026, 10, dia, hora, minuto, TZ)
const livres = (ocupados: Ocupado[], agora: Date, extra = {}) =>
  horariosLivres(ocupados, { agora, ...extra }).map((d) => formatarHorario(d, TZ))

// 2026-10-05 é uma segunda-feira; 10 e 11 são sábado e domingo.
console.log('— Agenda vazia')
confere(
  'três opções a partir de segunda de manhã',
  livres([], em(5, 7, 0)),
  ['segunda, 05/10, às 9h', 'segunda, 05/10, às 9h30', 'terça, 06/10, às 9h']
)

console.log('\n— Antecedência mínima de 2 horas')
confere(
  'às 8h50 não oferece 9h, oferece 11h',
  livres([], em(5, 8, 50)).slice(0, 1),
  ['segunda, 05/10, às 11h']
)

console.log('\n— Compromisso ocupa o horário e a folga de 15 minutos')
const reuniao = [{ inicio: em(5, 9, 0), fim: em(5, 10, 0), titulo: 'CDT' }]
confere(
  'reunião das 9h às 10h empurra para 10h30',
  livres(reuniao, em(5, 6, 0)).slice(0, 2),
  ['segunda, 05/10, às 10h30', 'segunda, 05/10, às 11h']
)

console.log('\n— Fim de semana e janela de almoço')
// Às 16h de sexta, a antecedência de 2h joga o primeiro horário para 18h, e a
// janela fecha às 18h — então o dia acabou e a próxima opção é segunda.
confere(
  'sexta à tarde pula sábado e domingo',
  livres([], em(9, 16, 0)).slice(0, 3),
  ['segunda, 12/10, às 9h', 'segunda, 12/10, às 9h30', 'terça, 13/10, às 9h']
)
confere('sexta de manhã ainda oferece a tarde da sexta', livres([], em(9, 9, 0)).slice(0, 2), [
  'sexta, 09/10, às 11h',
  'sexta, 09/10, às 11h30',
])
confere('não oferece horário entre 12h e 14h', livres([], em(5, 10, 0)).some((h) => h.includes('12h') || h.includes('13h')), false)

console.log('\n— No máximo dois por dia')
confere(
  'com o dia cheio de opções, espalha entre os dias',
  livres([], em(5, 6, 0), { quantos: 4 }).map((h) => h.split(',')[0]),
  ['segunda', 'segunda', 'terça', 'terça']
)

console.log('\n— Dia inteiro ocupado')
const diaCheio = [{ inicio: em(5, 8, 0), fim: em(5, 19, 0), titulo: 'Viagem' }]
confere('pula para o dia seguinte', livres(diaCheio, em(5, 6, 0)).slice(0, 1), ['terça, 06/10, às 9h'])

console.log('\n— Leitura do iCal')
const eventos = {
  a: { type: 'VEVENT', summary: 'Call', start: em(6, 10, 0), end: em(6, 11, 0) },
  b: { type: 'VEVENT', summary: 'Cancelada', status: 'CANCELLED', start: em(6, 15, 0), end: em(6, 16, 0) },
  c: { type: 'VEVENT', summary: 'Lembrete', transparency: 'TRANSPARENT', start: em(6, 16, 0), end: em(6, 17, 0) },
  d: { type: 'VTIMEZONE', start: em(6, 9, 0) },
}
const ocupados = ocupadosDoCalendario(eventos as never, em(5, 0, 0), em(12, 0, 0), TZ)
confere('só o compromisso real ocupa', ocupados.map((o) => o.titulo), ['Call'])
confere(
  'e ele bloqueia o horário na sugestão',
  livres(ocupados, em(6, 6, 0)).slice(0, 2),
  ['terça, 06/10, às 9h', 'terça, 06/10, às 11h30']
)

if (falhas) {
  console.log(`\n${falhas} caso(s) falharam.`)
  process.exitCode = 1
} else {
  console.log('\nTodos os casos passaram.')
}
