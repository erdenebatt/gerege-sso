import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock zustand persist middleware to avoid localStorage issues in tests
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware')
  return {
    ...actual,
    persist: (fn: any) => fn,
    createJSONStorage: vi.fn(),
  }
})

// Mock modules before imports
vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      me: vi.fn(),
      logout: vi.fn().mockResolvedValue({ message: 'ok' }),
      grants: vi.fn().mockResolvedValue({ grants: [] }),
      revokeGrant: vi.fn().mockResolvedValue({ success: true }),
    },
  },
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/lib/auth', () => ({
  setToken: vi.fn(),
  removeToken: vi.fn(),
  getToken: vi.fn(() => null),
}))

import { useAuthStore } from './authStore'
import { api } from '@/lib/api'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      grants: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
  })

  it('should start with null state', () => {
    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.grants).toEqual([])
  })

  it('should set token', () => {
    useAuthStore.getState().setToken('test-token')
    expect(useAuthStore.getState().token).toBe('test-token')
  })

  it('should clear state on logout', () => {
    useAuthStore.setState({
      token: 'test-token',
      user: { gen_id: '123', email: 'test@test.com' } as any,
    })

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.grants).toEqual([])
  })

  it('should fetch user successfully', async () => {
    const mockUser = { gen_id: '123', email: 'test@test.com', verified: true }
    vi.mocked(api.auth.me).mockResolvedValue(mockUser as any)

    useAuthStore.setState({ token: 'test-token' })
    const result = await useAuthStore.getState().fetchUser()

    expect(result).toEqual(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('should return null when fetching user without token', async () => {
    useAuthStore.setState({ token: null })
    const result = await useAuthStore.getState().fetchUser()
    expect(result).toBeNull()
  })
})
