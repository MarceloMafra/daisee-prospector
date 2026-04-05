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

interface PipelineColumn {
  status: string
  leads: Lead[]
  color: string
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const response = await fetch('/api/leads?groupBy=status')
        if (response.ok) {
          const data = await response.json()
          // Group leads by status
          const grouped = {
            'QUALIFICADO': { status: 'QUALIFICADO', leads: [], color: 'bg-green-100' },
            'EM_PROGRESSO': { status: 'EM_PROGRESSO', leads: [], color: 'bg-blue-100' },
            'DESCARTADO': { status: 'DESCARTADO', leads: [], color: 'bg-red-100' },
            'PERDIDO': { status: 'PERDIDO', leads: [], color: 'bg-gray-100' },
          }

          data.leads?.forEach((lead: Lead) => {
            if (grouped[lead.status as keyof typeof grouped]) {
              grouped[lead.status as keyof typeof grouped].leads.push(lead)
            }
          })

          setPipeline(Object.values(grouped) as PipelineColumn[])
        }
      } catch (error) {
        console.error('Failed to fetch pipeline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPipeline()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Sales Pipeline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track leads through the sales funnel
        </p>
      </div>

      {/* Pipeline Kanban */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-gray-500">Loading pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {pipeline.map((column) => (
            <div key={column.status} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {column.status}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                  {column.leads.length}
                </span>
              </div>

              <div className={`space-y-3 p-4 rounded-lg min-h-96 ${column.color}`}>
                {column.leads.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No leads</p>
                ) : (
                  column.leads.map((lead) => (
                    <Card
                      key={lead.id}
                      className="p-4 cursor-move hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {lead.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {lead.company}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {lead.email}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                          {lead.daiseeScore.toFixed(1)}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
