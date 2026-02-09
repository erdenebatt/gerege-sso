'use client'

import { create } from 'zustand'
import type { AdminStats, OAuthClient, AuditLog, CreateClientDTO, UpdateClientDTO } from '@/types'
import { api, ApiError } from '@/lib/api'

interface AdminState {
  apiKey: string | null
  _hydrated: boolean
  stats: AdminStats | null
  clients: OAuthClient[]
  auditLogs: AuditLog[]
  isLoading: boolean
  error: string | null

  hydrate: () => void
  setApiKey: (key: string) => void
  logout: () => void
  fetchStats: () => Promise<void>
  fetchClients: () => Promise<void>
  fetchAuditLogs: () => Promise<void>
  createClient: (
    data: CreateClientDTO
  ) => Promise<{ clientId: string; clientSecret: string } | null>
  updateClient: (id: string, data: UpdateClientDTO) => Promise<boolean>
  deleteClient: (id: string) => Promise<boolean>
}

export const useAdminStore = create<AdminState>()((set, get) => ({
  apiKey: null,
  _hydrated: false,
  stats: null,
  clients: [],
  auditLogs: [],
  isLoading: false,
  error: null,

  hydrate: () => {
    if (typeof window !== 'undefined' && !get()._hydrated) {
      const key = sessionStorage.getItem('admin_key')
      set({ apiKey: key, _hydrated: true })
    }
  },

  setApiKey: (key) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_key', key)
    }
    set({ apiKey: key, _hydrated: true, error: null })
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_key')
    }
    set({ apiKey: null, stats: null, clients: [], auditLogs: [], error: null })
  },

  fetchStats: async () => {
    const { apiKey } = get()
    if (!apiKey) return

    set({ isLoading: true })
    try {
      const stats = await api.admin.stats(apiKey)
      set({ stats, isLoading: false, error: null })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        get().logout()
      }
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch stats',
        isLoading: false,
      })
    }
  },

  fetchClients: async () => {
    const { apiKey } = get()
    if (!apiKey) return

    set({ isLoading: true })
    try {
      const data = await api.admin.clients(apiKey)
      set({ clients: data.clients || [], isLoading: false, error: null })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        get().logout()
      }
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch clients',
        isLoading: false,
      })
    }
  },

  fetchAuditLogs: async () => {
    const { apiKey } = get()
    if (!apiKey) return

    set({ isLoading: true })
    try {
      const data = await api.admin.auditLogs(apiKey)
      set({ auditLogs: data.logs || [], isLoading: false, error: null })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch audit logs',
        isLoading: false,
      })
    }
  },

  createClient: async (data) => {
    const { apiKey } = get()
    if (!apiKey) return null

    try {
      const result = await api.admin.createClient(apiKey, data)
      await get().fetchClients()
      await get().fetchStats()
      return { clientId: result.client_id, clientSecret: result.client_secret }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create client' })
      return null
    }
  },

  updateClient: async (id, data) => {
    const { apiKey } = get()
    if (!apiKey) return false

    try {
      await api.admin.updateClient(apiKey, id, data)
      await get().fetchClients()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update client' })
      return false
    }
  },

  deleteClient: async (id) => {
    const { apiKey } = get()
    if (!apiKey) return false

    try {
      await api.admin.deleteClient(apiKey, id)
      await get().fetchClients()
      await get().fetchStats()
      return true
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete client' })
      return false
    }
  },
}))
