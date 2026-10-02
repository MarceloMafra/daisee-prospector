// Disponibilidade na agenda do Marcelo, para a sugestão de réplica propor
// horário que existe de verdade.
//
// Lê o Google Calendar em MODO LEITURA pelo endereço secreto em iCal
// (Google Agenda → Configurações da agenda → Integrar agenda → "Endereço
// secreto no formato iCal"), gravado em GOOGLE_CALENDAR_ICS_URL. Sem OAuth,
// sem projeto no Google Cloud e sem nenhuma permissão de escrita: o app não
// consegue criar nem alterar evento, só enxergar o que está ocupado.
//
// Sem a variável, tudo continua funcionando como antes — a sugestão sai sem
// horário, e quem marca é o SDR.
import ical from 'node-ical'

export interface Ocupado {
  inicio: Date
  fim: Date
  titulo?: string
}

export interface OpcoesAgenda {
  agora: Date
  /** Dias corridos olhados à frente. */
  diasAFrente?: number
  /** Duração da conversa proposta, em minutos. */
  duracaoMin?: number
  /** Folga antes e depois de cada compromisso, em minutos. */
  folgaMin?: number
  /** Antecedência mínima: não propor algo para daqui a 20 minutos. */
  antecedenciaMin?: number
  /** Janelas de trabalho, no horário local. */
  janelas?: { inicio: string; fim: string }[]
  /** Quantos horários devolver. */
  quantos?: number
  /** No máximo um horário por dia, para as opções não caírem todas na terça. */
  maxPorDia?: number
  tz?: string
}

export const PADRAO: Required<Omit<OpcoesAgenda, 'agora'>> = {
  diasAFrente: 7,
  duracaoMin: 30,
  folgaMin: 15,
  antecedenciaMin: 120,
  janelas: [
    { inicio: '09:00', fim: '12:00' },
    { inicio: '14:00', fim: '18:00' },
  ],
  quantos: 3,
  maxPorDia: 2,
  tz: 'America/Sao_Paulo',
}

// ── Fuso: o Brasil não tem mais horário de verão, mas a conta é feita pelo
// deslocamento real de cada data para o caso de a agenda ter evento em outro
// fuso (o Marcelo tem recorrente em America/Bahia).
function offsetMinutos(data: Date, tz: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(data)
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value])) as Record<string, string>
  const comoUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second))
  return (comoUtc - data.getTime()) / 60_000
}

/** Monta um instante a partir de ano/mês/dia/hora no fuso informado. */
export function noFuso(ano: number, mes: number, dia: number, hora: number, minuto: number, tz: string): Date {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto)
  const off = offsetMinutos(new Date(palpite), tz)
  return new Date(palpite - off * 60_000)
}

const partesLocais = (d: Date, tz: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  ) as Record<string, string>
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour) % 24,
    minuto: Number(p.minute),
    diaSemana: p.weekday, // Mon, Tue...
  }
}

// ── Leitura do iCal ────────────────────────────────────────────────────────

export function isAgendaConfigurada() {
  return Boolean(process.env.GOOGLE_CALENDAR_ICS_URL)
}

// Expande os eventos (inclusive os recorrentes) em intervalos ocupados dentro
// da janela pedida. Evento marcado como "disponível" (TRANSPARENT) e evento
// cancelado não ocupam a agenda.
export function ocupadosDoCalendario(
  eventos: Record<string, any>,
  de: Date,
  ate: Date,
  tz = PADRAO.tz
): Ocupado[] {
  const ocupados: Ocupado[] = []

  for (const ev of Object.values(eventos)) {
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue
    if (ev.status === 'CANCELLED') continue
    if (String(ev.transparency ?? '').toUpperCase() === 'TRANSPARENT') continue

    const inicio: Date = ev.start
    const fim: Date = ev.end ?? new Date(inicio.getTime() + 60 * 60_000)
    const duracao = Math.max(fim.getTime() - inicio.getTime(), 15 * 60_000)

    if (!ev.rrule) {
      if (fim > de && inicio < ate) ocupados.push({ inicio, fim, titulo: ev.summary })
      continue
    }

    // Recorrente: o rrule devolve a data "crua"; corrige pelo deslocamento de
    // fuso da ocorrência em relação ao do primeiro evento.
    const excluidas = new Set(
      Object.values((ev.exdate ?? {}) as Record<string, Date>).map((d) => new Date(d).toDateString() + new Date(d).getHours())
    )
    const offInicio = offsetMinutos(inicio, tz)
    let datas: Date[] = []
    try {
      datas = ev.rrule.between(new Date(de.getTime() - duracao), ate, true)
    } catch {
      continue
    }

    for (const data of datas) {
      const corrigida = new Date(data.getTime() + (offInicio - offsetMinutos(data, tz)) * 60_000)
      if (excluidas.has(corrigida.toDateString() + corrigida.getHours())) continue

      // Ocorrência editada individualmente (horário movido ou cancelada).
      const chave = `${corrigida.getFullYear()}-${String(corrigida.getMonth() + 1).padStart(2, '0')}-${String(corrigida.getDate()).padStart(2, '0')}`
      const alterada = ev.recurrences?.[chave]
      if (alterada) {
        if (alterada.status === 'CANCELLED') continue
        ocupados.push({ inicio: alterada.start, fim: alterada.end ?? new Date(alterada.start.getTime() + duracao), titulo: alterada.summary ?? ev.summary })
        continue
      }
      ocupados.push({ inicio: corrigida, fim: new Date(corrigida.getTime() + duracao), titulo: ev.summary })
    }
  }

  return ocupados
    .filter((o) => o.fim > de && o.inicio < ate)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
}

// ── Cálculo dos horários livres (puro, testável) ───────────────────────────

export function horariosLivres(ocupados: Ocupado[], opcoes: OpcoesAgenda): Date[] {
  const o = { ...PADRAO, ...opcoes }
  const inicioBusca = new Date(o.agora.getTime() + o.antecedenciaMin * 60_000)
  const livres: Date[] = []
  const porDia = new Map<string, number>()

  for (let i = 0; i <= o.diasAFrente && livres.length < o.quantos; i++) {
    const base = new Date(o.agora.getTime() + i * 86_400_000)
    const { ano, mes, dia, diaSemana } = partesLocais(base, o.tz)
    if (diaSemana === 'Sat' || diaSemana === 'Sun') continue
    const chaveDia = `${ano}-${mes}-${dia}`

    for (const janela of o.janelas) {
      const [h1, m1] = janela.inicio.split(':').map(Number)
      const [h2, m2] = janela.fim.split(':').map(Number)
      const abre = noFuso(ano, mes, dia, h1, m1, o.tz)
      const fecha = noFuso(ano, mes, dia, h2, m2, o.tz)

      for (let t = abre.getTime(); t + o.duracaoMin * 60_000 <= fecha.getTime(); t += 30 * 60_000) {
        if (livres.length >= o.quantos) break
        if ((porDia.get(chaveDia) ?? 0) >= o.maxPorDia) break
        const inicio = new Date(t)
        if (inicio < inicioBusca) continue

        const fim = new Date(t + o.duracaoMin * 60_000)
        const colide = ocupados.some(
          (ocup) =>
            ocup.inicio.getTime() < fim.getTime() + o.folgaMin * 60_000 &&
            ocup.fim.getTime() + o.folgaMin * 60_000 > inicio.getTime()
        )
        if (colide) continue

        livres.push(inicio)
        porDia.set(chaveDia, (porDia.get(chaveDia) ?? 0) + 1)
      }
    }
  }

  return livres
}

/** "quinta, 08/10, às 10h30" — como a pessoa escreveria numa mensagem. */
export function formatarHorario(d: Date, tz = PADRAO.tz): string {
  const { dia, mes, hora, minuto } = partesLocais(d, tz)
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, weekday: 'long' })
    .format(d)
    .replace(/-feira$/, '')
  const hhmm = minuto === 0 ? `${hora}h` : `${hora}h${String(minuto).padStart(2, '0')}`
  return `${diaSemana}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}, às ${hhmm}`
}

// ── Uso pelo app ───────────────────────────────────────────────────────────

export interface Disponibilidade {
  horarios: string[]
  datas: Date[]
  consultadaEm: Date
  fonte: 'google-calendar' | 'espelho' | 'nao-configurada' | 'falhou'
  erro?: string
  /** Só no espelho: há quantas horas a agenda foi lida. */
  idadeHoras?: number
}

// ── Espelho da agenda ──────────────────────────────────────────────────────
// Enquanto o painel não tem credencial do Google, quem lê a agenda é o Claude
// (pelo conector do Google Calendar, na conversa) e grava os horários livres
// aqui. O painel usa esse espelho e mostra quando ele foi conferido — horário
// velho é pior que horário nenhum, então acima de ESPELHO_VALIDADE_H ele é
// descartado.
export const CHAVE_ESPELHO = 'agenda.horarios'
export const ESPELHO_VALIDADE_H = 14

interface EspelhoGravado {
  horarios: string[]
  datasISO: string[]
  conferidaEm: string
}

export async function salvarEspelhoDaAgenda(datas: Date[], tz = PADRAO.tz) {
  const { prisma } = await import('@/lib/prisma')
  const valor: EspelhoGravado = {
    horarios: datas.map((d) => formatarHorario(d, tz)),
    datasISO: datas.map((d) => d.toISOString()),
    conferidaEm: new Date().toISOString(),
  }
  await prisma.config.upsert({
    where: { chave: CHAVE_ESPELHO },
    create: { chave: CHAVE_ESPELHO, valor: JSON.stringify(valor) },
    update: { valor: JSON.stringify(valor) },
  })
  return valor
}

async function lerEspelhoDaAgenda(agora: Date): Promise<Disponibilidade | null> {
  const { prisma } = await import('@/lib/prisma')
  const linha = await prisma.config.findUnique({ where: { chave: CHAVE_ESPELHO } })
  if (!linha) return null

  const e: EspelhoGravado = JSON.parse(linha.valor)
  const conferidaEm = new Date(e.conferidaEm)
  const idadeHoras = (agora.getTime() - conferidaEm.getTime()) / 3_600_000

  // Horário que já passou nunca é oferecido, mesmo dentro da validade.
  const futuros = e.datasISO
    .map((iso, i) => ({ data: new Date(iso), texto: e.horarios[i] }))
    .filter((x) => x.data.getTime() > agora.getTime() + PADRAO.antecedenciaMin * 60_000)

  if (idadeHoras > ESPELHO_VALIDADE_H || futuros.length === 0) {
    return { horarios: [], datas: [], consultadaEm: conferidaEm, fonte: 'espelho', idadeHoras }
  }
  return {
    horarios: futuros.map((x) => x.texto),
    datas: futuros.map((x) => x.data),
    consultadaEm: conferidaEm,
    fonte: 'espelho',
    idadeHoras,
  }
}

let cache: { em: number; valor: Disponibilidade } | null = null
const CACHE_MS = 10 * 60_000

export async function buscarDisponibilidade(opcoes: Partial<OpcoesAgenda> = {}): Promise<Disponibilidade> {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) {
    // Sem iCal, usa o espelho gravado pelo Claude.
    const espelho = await lerEspelhoDaAgenda(opcoes.agora ?? new Date())
    return espelho ?? { horarios: [], datas: [], consultadaEm: new Date(), fonte: 'nao-configurada' }
  }
  if (cache && Date.now() - cache.em < CACHE_MS && !opcoes.agora) return cache.valor

  const agora = opcoes.agora ?? new Date()
  const o = { ...PADRAO, ...opcoes, agora }
  try {
    const eventos = await ical.async.fromURL(url)
    const ate = new Date(agora.getTime() + (o.diasAFrente + 1) * 86_400_000)
    const ocupados = ocupadosDoCalendario(eventos as Record<string, any>, agora, ate, o.tz)
    const datas = horariosLivres(ocupados, o)
    const valor: Disponibilidade = {
      horarios: datas.map((d) => formatarHorario(d, o.tz)),
      datas,
      consultadaEm: new Date(),
      fonte: 'google-calendar',
    }
    if (!opcoes.agora) cache = { em: Date.now(), valor }
    return valor
  } catch (err) {
    // Agenda fora do ar não pode derrubar a sugestão de réplica.
    return {
      horarios: [],
      datas: [],
      consultadaEm: new Date(),
      fonte: 'falhou',
      erro: err instanceof Error ? err.message : String(err),
    }
  }
}
