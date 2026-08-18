'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Send, Linkedin, Mail, CheckCircle2, Clock, XCircle, MessageSquare, UserCheck } from 'lucide-react'

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

interface Lead {
  id: string
  name: string
  company: string
  email: string
  daiseeScore: number
  status: string
  linkedinConnectedAt: string | null
  cadencia: Cadencia | null
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

  const FILTERS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'AGENDADO', label: 'Com pendências' },
    { value: 'CONECTADO', label: 'Conexão aceita' },
    { value: 'RESPONDIDO', label: 'Com resposta' },
  ]

  const filtered = leads.filter(lead => {
    if (filter === 'ALL') return true
    if (filter === 'AGENDADO') return lead.cadencia?.touches.some(t => t.status === 'AGENDADO')
    if (filter === 'CONECTADO') return Boolean(lead.linkedinConnectedAt)
    if (filter === 'RESPONDIDO') return lead.cadencia?.touches.some(t => t.status === 'RESPONDIDO')
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monitoramento de Prospecção</h1>
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
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <p className="text-gray-500">Carregando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <MessageSquare className="w-10 h-10" />
          <p>Nenhum lead com cadência gerada ainda.</p>
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
                    <th className="text-left text-xs text-gray-500 uppercase pb-3 pr-4 font-medium">Lead</th>
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
                      <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <a href={`/dashboard/leads/${lead.id}`} className="font-medium text-gray-900 dark:text-white hover:text-red-600 hover:underline text-sm">
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
                                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
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
