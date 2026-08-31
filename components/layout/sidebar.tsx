'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Users,
  Zap,
  Shield,
  Settings,
  LogOut,
  Activity,
  Inbox,
  LineChart,
} from 'lucide-react'

const menuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    label: 'Relatório',
    href: '/dashboard/relatorio',
    icon: LineChart,
  },
  {
    label: 'Leads',
    href: '/dashboard/leads',
    icon: Users,
  },
  {
    label: 'Respostas',
    href: '/dashboard/interacoes',
    icon: Inbox,
  },
  {
    label: 'Pipeline',
    href: '/dashboard/pipeline',
    icon: Zap,
  },
  {
    label: 'Prospecções',
    href: '/dashboard/prospecting',
    icon: Activity,
  },
  {
    label: 'Compliance',
    href: '/dashboard/compliance',
    icon: Shield,
  },
  {
    label: 'Configurações',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-card border-r border-border h-screen overflow-y-auto">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          <span className="font-bold text-lg text-gray-900 dark:text-white">
            DAISEE
          </span>
        </Link>
      </div>

      <nav className="px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 font-medium'
                  : 'text-gray-700 dark:text-gray-400 hover:bg-muted dark:hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-4 mt-6">
        <button className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white w-full rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
