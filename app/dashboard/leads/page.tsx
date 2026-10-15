'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText, Search, Trash2, RefreshCw, Sparkles, Rocket, X, UserPlus } from 'lucide-react'
import { NovoLeadDialog } from '@/components/leads/novo-lead-dialog'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  name: string
  email: string | null
  company: string
  daiseeScore: number
  status: string
  excludedFromAutomation: boolean
  createdAt: string
}

const statusLabels: Record<string, string> = {
  PROSPECTANDO: 'Prospectando',
  QUALIFICADO: 'Qualificado',
  EM_PROGRESSO: 'Em Progresso',
  DESCARTADO: 'Descartado',
  PERDIDO: 'Perdido',
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkAutomationUpdating, setBulkAutomationUpdating] = useState(false)
  const [bulkPreparing, setBulkPreparing] = useState(false)
  const [bulkPrepareProgress, setBulkPrepareProgress] = useState({ done: 0, total: 0 })
  const [bulkPrepareSummary, setBulkPrepareSummary] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkSendProgress, setBulkSendProgress] = useState({ done: 0, total: 0, waitingLabel: '' })
  const [bulkSendSummary, setBulkSendSummary] = useState('')
  const bulkSendCancelRef = useRef(false)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [novoLeadAberto, setNovoLeadAberto] = useState(false)
  // O que já foi consultado no servidor. Difere de searchQuery enquanto o
  // usuário ainda está digitando.
  const [buscaAplicada, setBuscaAplicada] = useState('')

  // A busca precisa varrer a base inteira, não a página carregada: com 25 por
  // página, procurar um lead da página 6 não devolvia nada. A rota já aceitava
  // o parâmetro — faltava mandar.
  const urlDaListagem = useCallback(
    (pagina = currentPage) => {
      const params = new URLSearchParams({ limit: String(pageSize), page: String(pagina) })
      if (buscaAplicada) params.set('search', buscaAplicada)
      return `/api/leads?${params}`
    },
    [pageSize, currentPage, buscaAplicada]
  )

  // Uma consulta por pausa na digitação, não uma por tecla.
  useEffect(() => {
    const id = setTimeout(() => {
      setBuscaAplicada(searchQuery.trim())
      // Resultado novo, paginação nova: seguir na página 4 da lista anterior
      // cairia numa página que a busca talvez nem tenha.
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(id)
  }, [searchQuery])

  const handleRecalculate = async () => {
    if (!confirm('Recalcular o DAISEE Score de todos os leads com os novos critérios?')) return
    setRecalculating(true)
    setRecalcMsg('')
    try {
      const res = await fetch('/api/leads/recalculate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const response = await fetch(urlDaListagem())
        if (response.ok) {
          const d = await response.json()
          setLeads(d.leads || [])
          setTotalLeads(d.pagination?.total || 0)
        }
        setRecalcMsg(`${data.updated} leads recalculados com sucesso.`)
        setTimeout(() => setRecalcMsg(''), 4000)
      }
    } catch {
      setRecalcMsg('Erro ao recalcular scores.')
    } finally {
      setRecalculating(false)
    }
  }

  useEffect(() => {
    let cancelado = false
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const response = await fetch(urlDaListagem())
        if (response.ok) {
          const data = await response.json()
          // Digitar rápido dispara buscas em sequência; sem isso a resposta de
          // uma consulta antiga pode chegar depois e sobrescrever a atual.
          if (cancelado) return
          setLeads(data.leads || [])
          setTotalLeads(data.pagination?.total || 0)
        }
      } catch (error) {
        console.error('Falha ao buscar leads:', error)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    fetchLeads()
    return () => {
      cancelado = true
    }
  }, [urlDaListagem])

  const allFilteredSelected = leads.length > 0 && leads.every(l => selected.has(l.id))
  const someSelected = selected.size > 0

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map(l => l.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o lead "${name}"?`)) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setLeads(prev => prev.filter(l => l.id !== id))
        setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
      }
    } catch (error) {
      console.error('Falha ao excluir lead:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selected.size} lead(s)? Esta ação não pode ser desfeita.`)) return
    setBulkDeleting(true)
    const ids = Array.from(selected)
    try {
      await Promise.all(ids.map(id => fetch(`/api/leads/${id}`, { method: 'DELETE' })))
      setLeads(prev => prev.filter(l => !selected.has(l.id)))
      setSelected(new Set())
    } catch (error) {
      console.error('Falha ao excluir leads:', error)
    } finally {
      setBulkDeleting(false)
    }
  }

  // Melhor esforço: tenta enriquecer via LinkedIn (pode falhar sem interromper o lote,
  // já que a geração de cadência funciona mesmo sem perfil completo) e garante que
  // exista uma cadência com os 5 touches gerados pra esse lead.
  const enrichAndGenerateForLead = async (id: string, name: string): Promise<{ id: string; name: string; outcome: 'ok' | 'falhou'; reason?: string }> => {
    try {
      await fetch(`/api/leads/${id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => null)

      let cadenciaId: string | undefined
      const existing = await fetch(`/api/cadencias?leadId=${id}&limit=1`).then(r => (r.ok ? r.json() : null))
      cadenciaId = existing?.cadencias?.[0]?.id

      if (!cadenciaId) {
        const cadRes = await fetch('/api/cadencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: id, tone: 'CONSULTIVO', name: `Cadência - ${name}` }),
        })
        if (!cadRes.ok) throw new Error('Falha ao criar cadência')
        const cad = await cadRes.json()
        cadenciaId = cad.id
      }

      const genRes = await fetch(`/api/cadencias/${cadenciaId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: 'CONSULTIVO' }),
      })
      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Falha ao gerar cadência')
      }

      return { id, name, outcome: 'ok' }
    } catch (err) {
      return { id, name, outcome: 'falhou', reason: err instanceof Error ? err.message : 'Erro desconhecido' }
    }
  }

  const handleBulkEnrichAndGenerate = async () => {
    const ids = Array.from(selected)
    if (!confirm(`Enriquecer via LinkedIn e gerar cadência de IA pra ${ids.length} lead(s)?\n\nOs leads são processados um de cada vez (evita sobrecarregar a Unipile), então isso pode levar alguns minutos.`)) return

    setBulkPreparing(true)
    setBulkPrepareSummary('')
    setBulkPrepareProgress({ done: 0, total: ids.length })

    const results: Array<{ id: string; name: string; outcome: 'ok' | 'falhou'; reason?: string }> = []
    for (const id of ids) {
      const lead = leads.find(l => l.id === id)
      const result = await enrichAndGenerateForLead(id, lead?.name || id)
      results.push(result)
      setBulkPrepareProgress(prev => ({ ...prev, done: prev.done + 1 }))
    }

    const ok = results.filter(r => r.outcome === 'ok').length
    const failed = results.filter(r => r.outcome === 'falhou')
    let summary = `${ok}/${ids.length} cadências geradas com sucesso.`
    if (failed.length > 0) {
      summary += ` ${failed.length} falharam: ` + failed.map(f => `${f.name} (${f.reason})`).join('; ')
    }
    setBulkPrepareSummary(summary)
    setBulkPreparing(false)
    setSelected(new Set())

    const response = await fetch(urlDaListagem())
    if (response.ok) {
      const data = await response.json()
      setLeads(data.leads || [])
      setTotalLeads(data.pagination?.total || 0)
    }
  }

  // Aguarda ms milissegundos, atualizando onTick a cada segundo — interrompe cedo se
  // bulkSendCancelRef for sinalizado (botão Cancelar do lote de disparo).
  const sleepCancellable = async (ms: number, onTick: (remainingMs: number) => void) => {
    let elapsed = 0
    const step = 1000
    while (elapsed < ms) {
      if (bulkSendCancelRef.current) return
      const chunk = Math.min(step, ms - elapsed)
      await new Promise(resolve => setTimeout(resolve, chunk))
      elapsed += chunk
      onTick(Math.max(0, ms - elapsed))
    }
  }

  const handleBulkSend = async () => {
    const ids = Array.from(selected)
    if (
      !confirm(
        `Isso vai disparar de verdade o próximo touch pendente de ${ids.length} lead(s) selecionado(s) — convite/mensagem real no LinkedIn (ou e-mail, se for a vez do touch de e-mail).\n\nEnvio um de cada vez, com intervalo aleatório de 30 a 90 segundos entre cada. Mantenha esta aba aberta até terminar — se fechar ou navegar pra outra página, o processo para.\n\nConfirmar?`
      )
    )
      return

    bulkSendCancelRef.current = false
    setBulkSending(true)
    setBulkSendSummary('')
    setBulkSendProgress({ done: 0, total: ids.length, waitingLabel: '' })

    const results: Array<{ id: string; name: string; outcome: string; reason?: string }> = []
    let rateLimited = false

    for (let i = 0; i < ids.length; i++) {
      if (bulkSendCancelRef.current) break
      const id = ids[i]
      const name = leads.find(l => l.id === id)?.name || id

      try {
        const leadRes = await fetch(`/api/leads/${id}`)
        const leadData: { cadencia?: { touches?: Array<{ id: string; status: string }> } } = await leadRes.json()
        const nextTouch = leadData.cadencia?.touches?.find(t => t.status === 'AGENDADO')

        if (!nextTouch) {
          results.push({ id, name, outcome: 'pulado', reason: 'Sem touch pendente (cadência ausente ou já concluída).' })
        } else {
          const sendRes = await fetch(`/api/touches/${nextTouch.id}/send`, { method: 'POST' })
          const sendData = await sendRes.json()
          if (sendRes.status === 429) {
            rateLimited = true
            results.push({ id, name, outcome: 'pulado', reason: sendData.error })
          } else if (!sendRes.ok) {
            results.push({ id, name, outcome: 'falhou', reason: sendData.error })
          } else {
            results.push({ id, name, outcome: sendData.outcome, reason: sendData.reason })
          }
        }
      } catch (err) {
        results.push({ id, name, outcome: 'falhou', reason: err instanceof Error ? err.message : 'Erro desconhecido' })
      }

      setBulkSendProgress(prev => ({ ...prev, done: prev.done + 1 }))

      if (rateLimited || bulkSendCancelRef.current || i === ids.length - 1) continue

      const waitMs = (30 + Math.random() * 60) * 1000
      await sleepCancellable(waitMs, remainingMs => {
        setBulkSendProgress(prev => ({ ...prev, waitingLabel: `Aguardando ${Math.ceil(remainingMs / 1000)}s pro próximo...` }))
      })
      setBulkSendProgress(prev => ({ ...prev, waitingLabel: '' }))
    }

    const sent = results.filter(r => r.outcome === 'enviado').length
    const skipped = results.filter(r => r.outcome === 'pulado')
    const failed = results.filter(r => r.outcome === 'falhou')
    let summary = `${sent}/${ids.length} enviados com sucesso.`
    if (bulkSendCancelRef.current) summary += ' Cancelado pelo usuário.'
    if (rateLimited) summary += ' Parado por limite de ritmo atingido — tente novamente mais tarde.'
    if (skipped.length) summary += ` ${skipped.length} pulados: ` + skipped.map(s => `${s.name} (${s.reason})`).join('; ')
    if (failed.length) summary += ` ${failed.length} falharam: ` + failed.map(f => `${f.name} (${f.reason})`).join('; ')
    setBulkSendSummary(summary)
    setBulkSending(false)
    setSelected(new Set())
  }

  const handleCancelBulkSend = () => {
    bulkSendCancelRef.current = true
  }

  const handleBulkAutomationToggle = async (excluded: boolean) => {
    setBulkAutomationUpdating(true)
    const ids = Array.from(selected)
    try {
      await Promise.all(
        ids.map(id =>
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ excludedFromAutomation: excluded }),
          })
        )
      )
      setLeads(prev => prev.map(l => (selected.has(l.id) ? { ...l, excludedFromAutomation: excluded } : l)))
      setSelected(new Set())
    } catch (error) {
      console.error('Falha ao atualizar automação dos leads:', error)
    } finally {
      setBulkAutomationUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Base de Leads</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie e acompanhe seus leads de vendas
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {someSelected && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkEnrichAndGenerate}
                disabled={bulkPreparing}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {bulkPreparing
                  ? `Processando ${bulkPrepareProgress.done}/${bulkPrepareProgress.total}...`
                  : `Enriquecer + Gerar Cadência (${selected.size})`}
              </Button>
              {bulkSending ? (
                <Button
                  variant="outline"
                  onClick={handleCancelBulkSend}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar envio ({bulkSendProgress.done}/{bulkSendProgress.total}{bulkSendProgress.waitingLabel ? ` · ${bulkSendProgress.waitingLabel}` : ''})
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleBulkSend}
                  disabled={bulkPreparing}
                  className="text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-sky-300"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Disparar próximo touch ({selected.size})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => handleBulkAutomationToggle(false)}
                disabled={bulkAutomationUpdating}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
              >
                {bulkAutomationUpdating ? 'Atualizando...' : `Incluir ${selected.size} na automação`}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAutomationToggle(true)}
                disabled={bulkAutomationUpdating}
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
              >
                {bulkAutomationUpdating ? 'Atualizando...' : `Excluir ${selected.size} da automação`}
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {bulkDeleting ? 'Excluindo...' : `Excluir ${selected.size} selecionado(s)`}
              </Button>
            </>
          )}
          <div className="flex items-center gap-2">
            {recalcMsg && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">{recalcMsg}</span>
            )}
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculando...' : 'Recalcular Scores'}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setNovoLeadAberto(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Novo Lead
          </Button>
          <Link href="/dashboard/leads/import">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Importar Leads
            </Button>
          </Link>
        </div>
      </div>

      <NovoLeadDialog
        aberto={novoLeadAberto}
        onFechar={() => setNovoLeadAberto(false)}
        onCriado={(leadId, aviso) => {
          setNovoLeadAberto(false)
          if (aviso) alert(aviso)
          router.push(`/dashboard/leads/${leadId}`)
        }}
      />

      {bulkPrepareSummary && (
        <div className="text-sm text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-3">
          {bulkPrepareSummary}
        </div>
      )}

      {bulkSendSummary && (
        <div className="text-sm text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg px-4 py-3">
          {bulkSendSummary}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Leads</CardTitle>
          <CardDescription>
            Mostrando {leads.length} de {totalLeads} lead{totalLeads !== 1 ? 's' : ''}
            {buscaAplicada && ` encontrado${totalLeads !== 1 ? 's' : ''} para “${buscaAplicada}”`}
            {someSelected && ` · ${selected.size} selecionado(s)`}
          </CardDescription>
          <div className="flex items-center gap-3 pt-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Exibir:</label>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">por página</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Página {currentPage} de {Math.max(1, Math.ceil(totalLeads / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalLeads / pageSize)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <p className="text-gray-500">Carregando leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {buscaAplicada
                  ? `Nenhum lead encontrado para “${buscaAplicada}” em toda a base.`
                  : 'Nenhum lead ainda. Importe sua primeira lista para começar.'}
              </p>
              {!buscaAplicada && (
                <Link href="/dashboard/leads/import">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Importar Leads
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Nome</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">E-mail</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Empresa</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Score</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Automação</th>
                    <th className="text-left px-4 py-3 font-semibold text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {leads.map((lead) => (
                    <tr key={lead.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selected.has(lead.id) ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/dashboard/leads/${lead.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 hover:underline cursor-pointer">
                          {lead.name}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{lead.company}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          lead.daiseeScore >= 80
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                            : lead.daiseeScore >= 50
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                        }`}>
                          {lead.daiseeScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          lead.excludedFromAutomation
                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        }`}>
                          {lead.excludedFromAutomation ? 'Excluído' : 'Ativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          >
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(lead.id, lead.name)}
                            disabled={deletingId === lead.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
