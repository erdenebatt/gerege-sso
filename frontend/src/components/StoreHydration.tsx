'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

export function StoreHydration() {
  useEffect(() => {
    useAuthStore.persist.rehydrate()
    useSettingsStore.persist.rehydrate()
  }, [])

  return null
}
