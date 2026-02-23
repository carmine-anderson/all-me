import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// ─── Fresh-launch redirect ────────────────────────────────────────────────────
// On a fresh open (new tab, PWA cold launch, browser restart) redirect to
// /dashboard so the user always lands on the home screen.
// If the app is already open in the background and the user foregrounds it,
// sessionStorage still has the flag and we leave them where they are.
const SESSION_KEY = 'allme_session_active'
if (!sessionStorage.getItem(SESSION_KEY)) {
  sessionStorage.setItem(SESSION_KEY, '1')
  // Only redirect if they're not already on a valid deep-link (e.g. /auth)
  const isAuthRoute = window.location.pathname.startsWith('/auth')
  if (!isAuthRoute && window.location.pathname !== '/dashboard') {
    window.history.replaceState(null, '', '/dashboard')
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
