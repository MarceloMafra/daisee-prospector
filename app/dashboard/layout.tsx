'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ReactNode, useState } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={menuAberto} onClose={() => setMenuAberto(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenu={() => setMenuAberto(true)} />
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
