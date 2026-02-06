'use client'

import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}
