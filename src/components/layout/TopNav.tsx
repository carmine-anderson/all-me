import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { useUIStore } from '@/store/uiStore'
import { Button } from '@/components/ui/Button'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function TopNav() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'ME'

  return (
    <header className="flex h-16 items-center justify-between border-b border-surface-border bg-surface-card px-4 md:px-6">
      {/* Left: hamburger */}
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
        aria-label="Toggle sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Right: notifications + theme + avatar */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-surface-elevated hover:text-zinc-100"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Avatar menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-400 transition-colors hover:bg-brand-500/30"
          >
            {initials}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-surface-border bg-surface-card p-1 shadow-xl">
                <div className="px-3 py-2">
                  <p className="truncate text-xs text-zinc-400">{user?.email}</p>
                </div>
                <div className="my-1 border-t border-surface-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => { signOut(); setMenuOpen(false) }}
                >
                  Sign out
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
