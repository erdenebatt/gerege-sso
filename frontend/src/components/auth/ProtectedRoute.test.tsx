import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock auth store
const mockAuthStore = {
  token: null as string | null,
  user: null as any,
  isLoading: false,
  fetchUser: vi.fn(),
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthStore,
}))

import { ProtectedRoute } from './ProtectedRoute'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuthStore.token = null
    mockAuthStore.user = null
    mockAuthStore.isLoading = false
    mockAuthStore.fetchUser = vi.fn()
  })

  it('should show loading when no token', () => {
    mockAuthStore.token = null

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('should show loading when isLoading', () => {
    mockAuthStore.token = 'test-token'
    mockAuthStore.isLoading = true

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('should render children when authenticated', () => {
    mockAuthStore.token = 'test-token'
    mockAuthStore.user = { gen_id: '123', email: 'test@test.com' }
    mockAuthStore.isLoading = false

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeDefined()
  })
})
