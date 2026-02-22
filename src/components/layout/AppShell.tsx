import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarOpen ? 'ml-0' : 'ml-0'
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
