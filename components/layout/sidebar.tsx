'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Brand } from '@/components/layout/brand'
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
    <aside className="w-64 shrink-0 bg-brand-800 dark:bg-brand-900 border-r border-brand-700 h-screen overflow-y-auto">
      <div className="p-6">
        <Link href="/dashboard" aria-label="MV-Prospector — início">
          <Brand tone="dark" tagline />
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
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-500 text-white font-semibold shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-brand-700 p-4 mt-6">
        <button className="flex items-center gap-3 px-4 py-2.5 text-brand-100 hover:text-white w-full rounded-lg hover:bg-brand-700 transition-colors">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
