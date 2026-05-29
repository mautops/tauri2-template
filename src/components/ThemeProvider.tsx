import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { emit } from '@tauri-apps/api/event'
import { ThemeProviderContext, type Theme } from '@/lib/theme-context'
import { usePreferences } from '@/services/preferences'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  // Load theme from persistent preferences
  const { data: preferences } = usePreferences()
  const hasSyncedPreferences = useRef(false)

  // Sync theme with preferences when they load
  useLayoutEffect(() => {
    if (preferences?.theme && !hasSyncedPreferences.current) {
      hasSyncedPreferences.current = true

      setTheme(preferences.theme as Theme)
    }
  }, [preferences?.theme])

  // Apply color scheme data attribute
  useEffect(() => {
    const root = window.document.documentElement
    if (preferences?.color_scheme) {
      root.setAttribute('data-color-scheme', preferences.color_scheme)
    }
  }, [preferences?.color_scheme])

  // Apply glass opacity CSS variables
  useEffect(() => {
    if (preferences?.glass_opacity != null) {
      const root = window.document.documentElement
      const opacity = preferences.glass_opacity
      root.style.setProperty('--glass-opacity', String(opacity))
      root.style.setProperty(
        '--glass-opacity-dark',
        String(Math.min(1, opacity + 0.06))
      )
    }
  }, [preferences?.glass_opacity])

  useEffect(() => {
    const root = window.document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (isDark: boolean) => {
      root.classList.remove('light', 'dark')
      root.classList.add(isDark ? 'dark' : 'light')
    }

    if (theme === 'system') {
      applyTheme(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    applyTheme(theme === 'dark')
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme)
      setTheme(newTheme)
      // Notify other windows (e.g., quick pane) of theme change
      emit('theme-changed', { theme: newTheme })
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
