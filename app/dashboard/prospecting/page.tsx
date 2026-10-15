'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Linkedin, Mail, CheckCircle2, Clock, XCircle, MessageSquare, UserCheck, PauseCircle } from 'lucide-react'

interface Touch {
  id: string
  sequence: number
  type: string
  channel: string
  status: string
  sentAt: string | null
}

interface Cadencia {
  id: string
  tone: string
  status: string
  touches: Touch[]
}

interface Interacao {
  id: string
  status: string
  recebidaEm: string
}

interface Lead {
  id: string
  name: string
  company: string
  email: string
  daiseeScore: number
  status: string
  linkedinConnectedAt: string | null
  excludedFromAutomation: boolean
  interacoes: Interacao[]
  cadencia: Cadencia | null
}

// De quem é a vez na conversa. "Respondido" num touch só diz que o lead
// escreveu algum dia — não diz se alguém já retornou para ele.
type Vez = 'VOCE' | 'LEAD' | null

function vezDe(lead: Lead): Vez {
  const interacoes = lead.interacoes || []
  if (interacoes.some(i => i.status === 'NOVA')) return 'VOCE'
  if (interacoes.length > 0) return 'LEAD'
  return null
}

// A cadência para de avançar sozinha quando o lead responde ou quando o lead
// sai da automação — vale dizer isso na tela, senão parece que travou.
function cadenciaPausada(lead: Lead): boolean {
  if (lead.excludedFromAutomation) return true
  return Boolean(lead.cadencia?.touches.some(t => t.status === 'RESPONDIDO'))
}

const T1_JA_SAIU = ['ENVIADO', 'ENTREGUE', 'RESPONDIDO']

// O mesmo intervalo de scripts/send-t2.ts. Rajada sem espera entre as DMs é o
// que derruba a conta — o tempo aqui não é enfeite.
const MIN_GAP_MS = 30_000
const MAX_GAP_MS = 90_000
const sortearIntervalo = () => MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS))
const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface EnvioEmLote {
  total: number
  feitos: number
  atual: string
  erros: { nome: string; motivo: string }[]
  aguardandoSegundos: number
}

function estimativaDeTempo(qtd: number): string {
  if (qtd <= 1) return 'alguns segundos'
  const minutos = Math.round(((qtd - 1) * (MIN_GAP_MS + MAX_GAP_MS)) / 2 / 60_000)
  return minutos <= 1 ? 'cerca de 1 minuto' : `cerca de ${minutos} minutos`
}

function touchDaSequencia(lead: Lead, sequence: number): Touch | undefined {
  return lead.cadencia?.touches.find(t => t.sequence === sequence)
}

// Aceitou o convite e o T2 ainda não saiu. Mesmo critério de
// scripts/gerar-fila-t2.ts, para a tela e a fila nunca discordarem: quem já
// respondeu está em conversa humana e sai da lista de propósito — mandar o T2
// agora atropelaria o diálogo.
function t2Pendente(lead: Lead): boolean {
  if (lead.excludedFromAutomation) return false
  if (!lead.linkedinConnectedAt) return false

  const t2 = touchDaSequencia(lead, 2)
  if (!t2 || t2.status !== 'AGENDADO') return false

  const t1 = touchDaSequencia(lead, 1)
  if (!t1 || !T1_JA_SAIU.includes(t1.status)) return false

  if ((lead.interacoes || []).length > 0) return false
  if (lead.cadencia?.touches.some(t => t.status === 'RESPONDIDO')) return false

  return true
}

const TOUCH_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  AGENDADO:   { label: 'Agendado',   color: 'text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',   icon: Clock },
  ENVIADO:    { label: 'Enviado',    color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40', icon: Send },
  ENTREGUE:   { label: 'Entregue',   color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/40', icon: CheckCircle2 },
  RESPONDIDO: { label: 'Respondido', color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/40', icon: CheckCircle2 },
  FALHOU:     { label: 'Falhou',     color: 'text-red-500',    bg: 'bg-red-100 dark:bg-red-900/40',  icon: XCircle },
}

const TOUCH_LABELS: Record<string, string> = {
  LINKEDIN_250: 'LI 1',
  LINKEDIN_500: 'LI 2',
  EMAIL_T3: 'E-3',
  EMAIL_T4: 'E-4',
  EMAIL_T5: 'E-5',
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  PROSPECTANDO: 'Prospectando',
  QUALIFICADO:  'Qualificado',
  EM_PROGRESSO: 'Em Progresso',
  DESCARTADO:   'Descartado',
  PERDIDO:      'Perdido',
}

function TouchBadge({ touch, onStatusChange }: { touch: Touch; onStatusChange: (touchId: string, status: string) => void }) {
  const config = TOUCH_STATUS_CONFIG[touch.status] || TOUCH_STATUS_CONFIG.AGENDADO
  const isLinkedin = touch.channel === 'LINKEDIN'
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={`${TOUCH_LABELS[touch.type]} — ${config.label}`}
        className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-bold border-2 transition-all hover:scale-110 ${config.bg} ${config.color} ${touch.status === 'AGENDADO' ? 'border-gray-200 dark:border-gray-700' : 'border-current'}`}
      >
        {isLinkedin
          ? <Linkedin className="w-3.5 h-3.5" />
          : <Mail className="w-3.5 h-3.5" />
        }
        <span className="text-[9px] leading-none mt-0.5">{TOUCH_LABELS[touch.type]}</span>
      </button>

      {open && (
        <div className="absolute z-10 top-12 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[130px]">
          <p className="text-xs text-gray-400 px-3 py-1 border-b dark:border-gray-700">Marcar como:</p>
          {Object.entries(TOUCH_STATUS_CONFIG).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => { onStatusChange(touch.id, status); setOpen(false) }}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 ${touch.status === status ? 'font-bold ' + cfg.color : 'text-gray-700 dark:text-gray-300'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function progressOf(touches: Touch[]) {
  const sent = touches.filter(t => t.status !== 'AGENDADO').length
  return { sent, total: touches.length, pct: touches.length ? Math.round((sent / touches.length) * 100) : 0 }
}

export default function ProspectingPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [envio, setEnvio] = useState<EnvioEmLote | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/prospecting')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleStatusChange = async (touchId: string, newStatus: string) => {
    await fetch(`/api/touches/${touchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    await fetchData()
  }

  const allTouches = leads.flatMap(l => l.cadencia?.touches || [])
  const stats = {
    total: leads.length,
    agendado: allTouches.filter(t => t.status === 'AGENDADO').length,
    enviado: allTouches.filter(t => t.status === 'ENVIADO').length,
    conectado: leads.filter(l => l.linkedinConnectedAt).length,
    respondido: allTouches.filter(t => t.status === 'RESPONDIDO').length,
  }

  const aguardandoVoce = leads.filter(l => vezDe(l) === 'VOCE').length
  const filaT2 = leads.filter(t2Pendente)
  const modoT2 = filter === 'T2_PENDENTE'

  const FILTERS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'SUA_VEZ', label: `Aguardando você${aguardandoVoce ? ` (${aguardandoVoce})` : ''}` },
    { value: 'AGENDADO', label: 'Com pendências' },
    { value: 'CONECTADO', label: 'Conexão aceita' },
    { value: 'RESPONDIDO', label: 'Com resposta' },
    { value: 'T2_PENDENTE', label: `T2 pendentes${filaT2.length ? ` (${filaT2.length})` : ''}` },
  ]

  // Entrar no modo T2 já marca a fila inteira: o uso normal é despachar o lote
  // todo e desmarcar a exceção. Sair limpa a seleção, para não sobrar marcação
  // invisível de um filtro que não está mais na tela.
  const trocarFiltro = (novo: string) => {
    setFilter(novo)
    setSelecionados(novo === 'T2_PENDENTE' ? new Set(filaT2.map(l => l.id)) : new Set())
  }

  const alternarSelecao = (leadId: string) => {
    setSelecionados(atual => {
      const proximo = new Set(atual)
      if (proximo.has(leadId)) proximo.delete(leadId)
      else proximo.add(leadId)
      return proximo
    })
  }

  // Dispara de verdade o T2 dos selecionados, um a um, com o intervalo de
  // segurança entre eles. O envio acontece aqui no navegador: fechar a aba
  // interrompe a fila, e o que já saiu está enviado — por isso o aviso.
  const enviarT2 = async () => {
    const alvos = filaT2
      .filter(l => selecionados.has(l.id))
      .map(l => ({ lead: l, touch: touchDaSequencia(l, 2) }))
      .filter((a): a is { lead: Lead; touch: Touch } => Boolean(a.touch))

    if (!alvos.length) return

    const plural = alvos.length === 1 ? '' : 's'
    const ok = confirm(
      `Enviar ${alvos.length} DM${plural} de T2 agora, de verdade, pelo LinkedIn?\n\n` +
      `As mensagens saem uma a cada 30-90 segundos, o que leva ${estimativaDeTempo(alvos.length)}.\n` +
      `Mantenha esta aba aberta até o fim — fechar interrompe a fila.`
    )
    if (!ok) return

    const erros: { nome: string; motivo: string }[] = []
    setEnvio({ total: alvos.length, feitos: 0, atual: alvos[0].lead.name, erros, aguardandoSegundos: 0 })

    for (const [i, { lead, touch }] of alvos.entries()) {
      setEnvio({ total: alvos.length, feitos: i, atual: lead.name, erros: [...erros], aguardandoSegundos: 0 })
      try {
        const res = await fetch(`/api/touches/${touch.id}/send`, { method: 'POST' })
        if (!res.ok) {
          const corpo = await res.json().catch(() => ({}))
          erros.push({ nome: lead.name, motivo: corpo.error || `HTTP ${res.status}` })
        }
      } catch (e) {
        erros.push({ nome: lead.name, motivo: e instanceof Error ? e.message : 'falha de rede' })
      }

      // A espera fica entre um envio e o próximo, nunca depois do último.
      if (i < alvos.length - 1) {
        const intervalo = sortearIntervalo()
        for (let resta = Math.round(intervalo / 1000); resta > 0; resta--) {
          setEnvio({ total: alvos.length, feitos: i + 1, atual: alvos[i + 1].lead.name, erros: [...erros], aguardandoSegundos: resta })
          await esperar(1000)
        }
      }
    }

    setEnvio(null)
    setSelecionados(new Set())
    await fetchData()

    if (erros.length) {
      alert(
        `${alvos.length - erros.length} de ${alvos.length} enviados.\n\n` +
        `Não saíram:\n${erros.map(e => `• ${e.nome}: ${e.motivo}`).join('\n')}`
      )
    }
  }

  const filtered = leads
    .filter(lead => {
      if (filter === 'ALL') return true
      if (filter === 'SUA_VEZ') return vezDe(lead) === 'VOCE'
      if (filter === 'AGENDADO') return lead.cadencia?.touches.some(t => t.status === 'AGENDADO')
      if (filter === 'CONECTADO') return Boolean(lead.linkedinConnectedAt)
      if (filter === 'RESPONDIDO') return lead.cadencia?.touches.some(t => t.status === 'RESPONDIDO')
      if (filter === 'T2_PENDENTE') return t2Pendente(lead)
      return true
    })
    // Quem está esperando resposta vai para o topo: é a única coisa da lista
    // que depende de uma pessoa agir hoje.
    .sort((a, b) => {
      const peso = (l: Lead) => (vezDe(l) === 'VOCE' ? 0 : vezDe(l) === 'LEAD' ? 1 : 2)
      const d = peso(a) - peso(b)
      if (d !== 0) return d
      return b.daiseeScore - a.daiseeScore
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cadências</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Acompanhe o progresso de cada cadência. Clique em um touch para atualizar o status.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Leads em cadência</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Touches agendados</p>
            <p className="text-3xl font-bold text-gray-500 mt-1">{stats.agendado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Touches enviados</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.enviado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Conexões aceitas</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.conectado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Respondidos</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.respondido}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => trocarFiltro(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ações em lote — só no modo T2, que é onde existe um lote a despachar */}
      {modoT2 && filaT2.length > 0 && (
        envio ? (
          <div className="rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Enviando {envio.feitos}/{envio.total}
              </span>
              <span className="text-sm text-blue-800 dark:text-blue-300">
                {envio.aguardandoSegundos > 0
                  ? `aguardando ${envio.aguardandoSegundos}s antes de ${envio.atual}`
                  : `enviando para ${envio.atual}...`}
              </span>
              {envio.erros.length > 0 && (
                <span className="text-sm text-red-600 dark:text-red-400">{envio.erros.length} falhou</span>
              )}
              <div className="flex-1" />
              <span className="text-xs text-blue-700 dark:text-blue-400">Não feche esta aba</span>
            </div>
            <div className="h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${Math.round((envio.feitos / envio.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <span className="text-sm text-amber-900 dark:text-amber-200">
              <strong>{selecionados.size}</strong> de {filaT2.length} selecionado{selecionados.size === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => setSelecionados(new Set(filaT2.map(l => l.id)))}
              className="text-xs text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:no-underline"
            >
              Selecionar todos
            </button>
            <button
              onClick={() => setSelecionados(new Set())}
              className="text-xs text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:no-underline"
            >
              Limpar
            </button>
            <div className="flex-1" />
            {selecionados.size > 0 && (
              <span className="text-xs text-amber-800 dark:text-amber-300">
                sai 1 a cada 30-90s · {estimativaDeTempo(selecionados.size)}
              </span>
            )}
            <button
              onClick={enviarT2}
              disabled={selecionados.size === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Enviar T2{selecionados.size ? ` (${selecionados.size})` : ''}
            </button>
          </div>
        )
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <p className="text-gray-500">Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <MessageSquare className="w-10 h-10" />
          <p>
            {modoT2
              ? 'Nenhum T2 esperando — a fila está em dia.'
              : filter === 'ALL'
                ? 'Nenhum lead com cadência gerada ainda.'
                : 'Nenhum lead neste filtro.'}
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    {modoT2 && (
                      <th className="pb-3 pr-3 w-8">
                        <input
                          type="checkbox"
                          aria-label="Selecionar todos os T2 pendentes"
                          checked={filaT2.length > 0 && selecionados.size === filaT2.length}
                          disabled={Boolean(envio)}
                          onChange={e => setSelecionados(e.target.checked ? new Set(filaT2.map(l => l.id)) : new Set())}
                          className="h-4 w-4 cursor-pointer accent-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </th>
                    )}
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium">Lead</th>
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium">Situação</th>
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium hidden lg:table-cell">Status</th>
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium hidden lg:table-cell">Score</th>
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium">Progresso</th>
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 font-medium">Touches</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {filtered.map(lead => {
                    const touches = lead.cadencia?.touches || []
                    const { sent, total, pct } = progressOf(touches)
                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${modoT2 && selecionados.has(lead.id) ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}
                      >
                        {modoT2 && (
                          <td className="py-4 pr-3 align-middle">
                            <input
                              type="checkbox"
                              aria-label={`Selecionar ${lead.name}`}
                              checked={selecionados.has(lead.id)}
                              disabled={Boolean(envio)}
                              onChange={() => alternarSelecao(lead.id)}
                              className="h-4 w-4 cursor-pointer accent-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>
                        )}
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <a href={`/dashboard/leads/${lead.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 dark:text-white hover:text-red-600 hover:underline text-sm">
                              {lead.name}
                            </a>
                            {lead.linkedinConnectedAt && (
                              <span
                                title={`Conexão aceita em ${new Date(lead.linkedinConnectedAt).toLocaleDateString('pt-BR')}`}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                              >
                                <UserCheck className="w-3 h-3" />
                                Conectado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{lead.company}</p>
                        </td>
                        <td className="py-4 pr-4 align-middle">
                          <div className="flex flex-col items-start gap-1">
                            {vezDe(lead) === 'VOCE' && (
                              <span
                                title="O lead escreveu e ainda não foi respondido"
                                className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 whitespace-nowrap"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Sua vez
                              </span>
                            )}
                            {vezDe(lead) === 'LEAD' && (
                              <span
                                title="Você respondeu por último — a bola está com o lead"
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                              >
                                <Clock className="w-3 h-3" />
                                Aguardando lead
                              </span>
                            )}
                            {cadenciaPausada(lead) && (
                              <span
                                title="A cadência automática não avança mais neste lead"
                                className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap"
                              >
                                <PauseCircle className="w-3 h-3" />
                                Cadência pausada
                              </span>
                            )}
                            {!vezDe(lead) && !cadenciaPausada(lead) && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4 hidden lg:table-cell">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {LEAD_STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4 hidden lg:table-cell">
                          <span className={`text-sm font-bold ${lead.daiseeScore >= 80 ? 'text-green-600' : lead.daiseeScore >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {lead.daiseeScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-primary-500' : 'bg-gray-300'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{sent}/{total}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {touches.map(touch => (
                              <TouchBadge key={touch.id} touch={touch} onStatusChange={handleStatusChange} />
                            ))}
                            {touches.length === 0 && (
                              <span className="text-xs text-gray-400 italic">Sem touches</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(TOUCH_STATUS_CONFIG).map(([status, cfg]) => {
          const Icon = cfg.icon
          return (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full inline-block ${cfg.bg}`} />
              <Icon className={`w-3 h-3 ${cfg.color}`} />
              {cfg.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
