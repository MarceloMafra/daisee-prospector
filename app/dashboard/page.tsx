'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Users,
  MessageSquare,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalLeads: number
  hotProspects: number
  pendingCadencias: number
  completedTouches: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Falha ao buscar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Bem-vindo. Aqui está o resumo do seu pipeline de vendas.
          </p>
        </div>
        <Link href="/dashboard/leads/import">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Importar Leads
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total de Leads
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {loading ? '-' : stats?.totalLeads || 0}
              </p>
            </div>
            <Users className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Prospectos Quentes
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {loading ? '-' : stats?.hotProspects || 0}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cadências Pendentes
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {loading ? '-' : stats?.pendingCadencias || 0}
              </p>
            </div>
            <MessageSquare className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Touches Enviados
              </p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                {loading ? '-' : stats?.completedTouches || 0}
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Ações Rápidas
          </h3>
          <div className="space-y-3">
            <Link href="/dashboard/leads/import">
              <Button variant="outline" className="w-full justify-between">
                Importar Leads
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard/leads">
              <Button variant="outline" className="w-full justify-between">
                Ver Todos os Leads
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard/pipeline">
              <Button variant="outline" className="w-full justify-between">
                Pipeline de Vendas
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Como Começar
          </h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-3">
              <span className="font-semibold text-red-600 dark:text-red-400">1.</span>
              <span>Importe seus leads via arquivo CSV com nome, e-mail, empresa e cargo</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-red-600 dark:text-red-400">2.</span>
              <span>O sistema calcula o score DAISEE automaticamente com base em senioridade e porte da empresa</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-red-600 dark:text-red-400">3.</span>
              <span>Clique em "Ver" em um lead para gerar uma cadência personalizada com IA</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-red-600 dark:text-red-400">4.</span>
              <span>Valide suas mensagens para garantir conformidade com LGPD, ANVISA, SUSEP e CONAR</span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
