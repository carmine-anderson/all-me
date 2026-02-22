import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { router } from '@/router'
import { AuthProvider } from '@/providers/AuthProvider'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#18181b',
                color: '#f4f4f5',
                border: '1px solid #27272a',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#18181b',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#18181b',
                },
              },
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
