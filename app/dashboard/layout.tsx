'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
