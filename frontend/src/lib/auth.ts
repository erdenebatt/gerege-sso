'use client'

const TOKEN_KEY = 'gerege_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function logout(): void {
  removeToken()
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}

export function redirectToLogin(redirect?: string): void {
  if (typeof window === 'undefined') return
  const url = redirect ? `/?redirect=${encodeURIComponent(redirect)}` : '/'
  window.location.href = url
}

export function getAdminKey(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('admin_key')
}

export function setAdminKey(key: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('admin_key', key)
}

export function removeAdminKey(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('admin_key')
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminKey()
}

export function adminLogout(): void {
  removeAdminKey()
  if (typeof window !== 'undefined') {
    window.location.href = '/admin'
  }
}
