'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Grant } from '@/types'
import { api, ApiError } from '@/lib/api'

interface AuthState {
  token: string | null
  user: User | null
  grants: Grant[]
  isLoading: boolean
  error: string | null

  setToken: (token: string) => void
  setUser: (user: User) => void
  setGrants: (grants: Grant[]) => void
  setError: (error: string | null) => void
  logout: () => void
  fetchUser: () => Promise<User | null>
  fetchGrants: () => Promise<void>
  revokeGrant: (grantId: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      grants: [],
      isLoading: false,
      error: null,

      setToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('gerege_token', token)
        }
        set({ token, error: null })
      },

      setUser: (user) => set({ user }),

      setGrants: (grants) => set({ grants }),

      setError: (error) => set({ error }),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gerege_token')
        }
        set({ token: null, user: null, grants: [], error: null })
      },

      fetchUser: async () => {
        const { token } = get()
        if (!token) {
          set({ user: null })
          return null
        }

        set({ isLoading: true, error: null })
        try {
          const user = await api.auth.me()
          set({ user, isLoading: false })
          return user
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            get().logout()
          }
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch user',
            isLoading: false,
          })
          return null
        }
      },

      fetchGrants: async () => {
        try {
          const data = await api.auth.grants()
          set({ grants: data.grants || [] })
        } catch (err) {
          console.error('Failed to fetch grants:', err)
        }
      },

      revokeGrant: async (grantId: string) => {
        try {
          await api.auth.revokeGrant(grantId)
          const { grants } = get()
          set({ grants: grants.filter((g) => g.id !== grantId) })
          return true
        } catch (err) {
          console.error('Failed to revoke grant:', err)
          return false
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    }
  )
)
