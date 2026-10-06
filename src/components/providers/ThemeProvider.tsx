'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

type Theme = 'light' | 'dark'
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null)
const themeListeners = new Set<() => void>()
const getServerTheme = (): Theme => 'light'

function getStoredTheme(): Theme {
  return window.localStorage.getItem('Phyaio Cycle-theme') === 'dark' ? 'dark' : 'light'
}

function subscribeToTheme(onChange: () => void) {
  themeListeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    themeListeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme)
  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem('Phyaio Cycle-theme', nextTheme)
    for (const listener of themeListeners) listener()
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
