'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex-1" />

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {/* User Profile */}
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
