'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Brand } from '@/components/layout/brand'
import { FunilLogo } from '@/components/layout/funil-logo'
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
  PanelLeftClose,
  PanelLeftOpen,
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

const STORAGE_KEY = 'mvp:sidebar-recolhida'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Lembra a escolha deste navegador. Lê depois da montagem para não
  // divergir do HTML do servidor; se o storage falhar, segue expandida.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {}
  }, [])

  function toggle() {
    setCollapsed((atual) => {
      const proximo = !atual
      try {
        localStorage.setItem(STORAGE_KEY, proximo ? '1' : '0')
      } catch {}
      return proximo
    })
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <aside
      className={cn(
        'sticky top-0 shrink-0 bg-brand-800 dark:bg-brand-900 border-r border-brand-700 h-screen overflow-y-auto overflow-x-hidden transition-[width] duration-200 ease-out',
        collapsed ? 'w-[76px]' : 'w-64'
      )}
    >
      <div
        className={cn(
          'py-6 flex items-center',
          collapsed ? 'justify-center px-3' : 'justify-between px-5'
        )}
      >
        <Link href="/dashboard" aria-label="MV-Prospector — início" title="MV-Prospector">
          {collapsed ? <FunilLogo onDark /> : <Brand tone="dark" tagline />}
        </Link>
      </div>

      <nav className={cn('py-4 space-y-2', collapsed ? 'px-3' : 'px-4')}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center rounded-lg transition-colors',
                collapsed ? 'justify-center h-11' : 'gap-3 px-4 py-2.5',
                isActive
                  ? 'bg-primary-500 text-white font-semibold shadow-sm'
                  : 'text-brand-100 hover:bg-brand-700 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-brand-700 mt-6 space-y-2', collapsed ? 'p-3' : 'p-4')}>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!collapsed}
          className={cn(
            'flex items-center text-brand-200 hover:text-white w-full rounded-lg hover:bg-brand-700 transition-colors',
            collapsed ? 'justify-center h-11' : 'gap-3 px-4 py-2.5'
          )}
        >
          <ToggleIcon className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Recolher menu</span>}
        </button>
        <button
          type="button"
          title={collapsed ? 'Sair' : undefined}
          aria-label={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center text-brand-100 hover:text-white w-full rounded-lg hover:bg-brand-700 transition-colors',
            collapsed ? 'justify-center h-11' : 'gap-3 px-4 py-2.5'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
