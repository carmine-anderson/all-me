import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { AppShell } from '@/components/layout/AppShell'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TasksPage } from '@/pages/TasksPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { FriendsPage } from '@/pages/FriendsPage'

/** Wraps protected routes — redirects to /auth if not authenticated */
function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-brand-500" />
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

/** Redirects authenticated users away from /auth */
function AuthLayout() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <AuthPage />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/auth',
    element: <AuthLayout />,
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/friends', element: <FriendsPage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
