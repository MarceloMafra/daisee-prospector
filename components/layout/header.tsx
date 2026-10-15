'use client'

import { useTheme } from 'next-themes'
import { useSession, signOut } from 'next-auth/react'
import { Menu, Moon, Sun, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  /** Abre a gaveta do menu (só aparece em tela estreita). */
  onMenu?: () => void
}

export function Header({ onMenu }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
            onClick={onMenu}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

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
          {session?.user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{session.user.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                title="Sair"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
