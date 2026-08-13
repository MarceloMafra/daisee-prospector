'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText, Search, Trash2, RefreshCw, Sparkles } from 'lucide-react'
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
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)

  const handleRecalculate = async () => {
    if (!confirm('Recalcular o DAISEE Score de todos os leads com os novos critérios?')) return
    setRecalculating(true)
    setRecalcMsg('')
    try {
      const res = await fetch('/api/leads/recalculate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const response = await fetch(`/api/leads?limit=${pageSize}&page=${currentPage}`)
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
    const fetchLeads = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/leads?limit=${pageSize}&page=${currentPage}`)
        if (response.ok) {
          const data = await response.json()
          setLeads(data.leads || [])
          setTotalLeads(data.pagination?.total || 0)
        }
      } catch (error) {
        console.error('Falha ao buscar leads:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [pageSize, currentPage])

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const allFilteredSelected = filteredLeads.length > 0 && filteredLeads.every(l => selected.has(l.id))
  const someSelected = selected.size > 0

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredLeads.map(l => l.id)))
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

    const response = await fetch(`/api/leads?limit=${pageSize}&page=${currentPage}`)
    if (response.ok) {
      const data = await response.json()
      setLeads(data.leads || [])
      setTotalLeads(data.pagination?.total || 0)
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads</h1>
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
          <Link href="/dashboard/leads/import">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Importar Leads
            </Button>
          </Link>
        </div>
      </div>

      {bulkPrepareSummary && (
        <div className="text-sm text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-3">
          {bulkPrepareSummary}
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Leads</CardTitle>
          <CardDescription>
            Mostrando {filteredLeads.length} de {totalLeads} lead{totalLeads !== 1 ? 's' : ''}
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
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {leads.length === 0
                  ? 'Nenhum lead ainda. Importe sua primeira lista para começar.'
                  : 'Nenhum lead encontrado para esta busca.'}
              </p>
              {leads.length === 0 && (
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
                  {filteredLeads.map((lead) => (
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
                        <a href={`/dashboard/leads/${lead.id}`} className="font-medium text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 hover:underline cursor-pointer">
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
