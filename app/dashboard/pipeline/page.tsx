'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

interface Lead {
  id: string
  name: string
  company: string
  email: string
  status: string
  daiseeScore: number
}

const COLUMNS = [
  { status: 'PROSPECTANDO', label: 'Prospectando', color: 'bg-yellow-50 dark:bg-yellow-950/20' },
  { status: 'QUALIFICADO',  label: 'Qualificado',  color: 'bg-green-50 dark:bg-green-950/20' },
  { status: 'EM_PROGRESSO', label: 'Em Progresso', color: 'bg-blue-50 dark:bg-blue-950/20' },
  { status: 'DESCARTADO',   label: 'Descartado',   color: 'bg-red-50 dark:bg-red-950/20' },
  { status: 'PERDIDO',      label: 'Perdido',      color: 'bg-gray-50 dark:bg-gray-900/40' },
]

const STATUS_OPTIONS = COLUMNS.map(c => ({ value: c.status, label: c.label }))

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads')
        if (response.ok) {
          const data = await response.json()
          setLeads(data.leads || [])
        }
      } catch (error) {
        console.error('Failed to fetch pipeline:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingId(leadId)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pipeline de Vendas</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Acompanhe seus leads pelo funil de vendas. Use o seletor em cada card para mover o lead de etapa.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-gray-500">Carregando pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {COLUMNS.map((column) => {
            const columnLeads = leads.filter(l => l.status === column.status)
            return (
              <div key={column.status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {column.label}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                    {columnLeads.length}
                  </span>
                </div>

                <div className={`space-y-2 p-3 rounded-lg min-h-96 ${column.color}`}>
                  {columnLeads.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Sem leads</p>
                  ) : (
                    columnLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="p-3 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                          {lead.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {lead.company}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                            {lead.daiseeScore.toFixed(1)}
                          </span>
                        </div>
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className="mt-2 w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
