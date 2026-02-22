import { createContext, useEffect, useState, type ReactNode } from 'react'
import type { Theme, AccentColor } from '@/types'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  accent: AccentColor
  setAccent: (color: AccentColor) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('allme-theme') as Theme | null
    return stored ?? 'dark'
  })

  const [accent, setAccentState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('allme-accent') as AccentColor | null
    return stored ?? 'green'
  })

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('allme-theme', theme)
  }, [theme])

  // Apply accent color via data-accent attribute on <html>
  useEffect(() => {
    const root = document.documentElement
    if (accent === 'green') {
      root.removeAttribute('data-accent')
    } else {
      root.setAttribute('data-accent', accent)
    }
    localStorage.setItem('allme-accent', accent)
  }, [accent])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const setAccent = (color: AccentColor) => setAccentState(color)

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}
