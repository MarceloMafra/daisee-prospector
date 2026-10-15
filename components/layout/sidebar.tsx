'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
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
  X,
} from 'lucide-react'

// Só rótulos e agrupamento mudam: as rotas são o contrato com as telas e a API
// (ver docs/mapa-telas-rotas.md) e continuam as mesmas.
const menuGroups = [
  {
    titulo: 'Visão geral',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
      { label: 'Relatório', href: '/dashboard/relatorio', icon: LineChart },
    ],
  },
  {
    titulo: 'Operação',
    items: [
      { label: 'Base de Leads', href: '/dashboard/leads', icon: Users },
      { label: 'Funil de Vendas', href: '/dashboard/pipeline', icon: Zap },
      { label: 'Respostas & DM', href: '/dashboard/interacoes', icon: Inbox },
      { label: 'Cadências', href: '/dashboard/prospecting', icon: Activity },
    ],
  },
  {
    titulo: 'Qualidade',
    items: [{ label: 'Compliance de Copy', href: '/dashboard/compliance', icon: Shield }],
  },
  {
    titulo: 'Sistema',
    items: [{ label: 'Configurações', href: '/dashboard/settings', icon: Settings }],
  },
]

const STORAGE_KEY = 'mvp:sidebar-recolhida'

interface SidebarProps {
  /** Gaveta aberta (só vale em tela estreita). */
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Lembra a escolha deste navegador. Lê depois da montagem para não
  // divergir do HTML do servidor; se o storage falhar, segue expandida.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {}
  }, [])

  // Navegou: fecha a gaveta.
  useEffect(() => {
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggle() {
    setCollapsed((atual) => {
      const proximo = !atual
      try {
        localStorage.setItem(STORAGE_KEY, proximo ? '1' : '0')
      } catch {}
      return proximo
    })
  }

  // Na gaveta do celular o menu sempre aparece por extenso.
  const compact = collapsed && !mobileOpen
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-brand-900/60 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'bg-brand-800 dark:bg-brand-900 border-r border-brand-700 h-screen overflow-y-auto overflow-x-hidden',
          'fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:shrink-0 lg:transition-[width]',
          compact ? 'lg:w-[76px]' : 'lg:w-64'
        )}
      >
        <div
          className={cn(
            'py-6 flex items-center',
            compact ? 'justify-center px-3' : 'justify-between px-5'
          )}
        >
          <Link href="/dashboard" aria-label="MV-Prospector — início" title="MV-Prospector">
            {compact ? <FunilLogo onDark /> : <Brand tone="dark" tagline />}
          </Link>
          {mobileOpen && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="lg:hidden p-2 rounded-lg text-brand-100 hover:bg-brand-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className={cn('pb-4', compact ? 'px-3' : 'px-4')}>
          {menuGroups.map((grupo, i) => (
            <div key={grupo.titulo} className={cn(i > 0 && 'mt-5')}>
              {compact ? (
                i > 0 && <div className="mx-3 mb-3 border-t border-brand-700" />
              ) : (
                <p className="px-4 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-mint-300/70">
                  {grupo.titulo}
                </p>
              )}
              <div className="space-y-1">
                {grupo.items.map((item) => {
                  const Icon = item.icon
                  // "/dashboard" só é ativo na própria página; senão acenderia em todas.
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(item.href + '/')

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={compact ? item.label : undefined}
                      aria-label={compact ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center rounded-lg transition-colors',
                        compact ? 'justify-center h-11' : 'gap-3 px-4 py-2.5',
                        isActive
                          ? 'bg-primary-500 text-white font-semibold shadow-sm'
                          : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                      )}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {!compact && <span className="whitespace-nowrap">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn('border-t border-brand-700 mt-2 space-y-1', compact ? 'p-3' : 'p-4')}>
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            className={cn(
              'hidden lg:flex items-center text-brand-200 hover:text-white w-full rounded-lg hover:bg-brand-700 transition-colors',
              compact ? 'justify-center h-11' : 'gap-3 px-4 py-2.5'
            )}
          >
            <ToggleIcon className="w-5 h-5 shrink-0" />
            {!compact && <span className="whitespace-nowrap">Recolher menu</span>}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={compact ? 'Sair' : undefined}
            aria-label={compact ? 'Sair' : undefined}
            className={cn(
              'flex items-center text-brand-100 hover:text-white w-full rounded-lg hover:bg-brand-700 transition-colors',
              compact ? 'justify-center h-11' : 'gap-3 px-4 py-2.5'
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!compact && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
