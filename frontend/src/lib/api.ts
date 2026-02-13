import type {
  User,
  Grant,
  LoginActivityResponse,
  AdminStats,
  OAuthClient,
  CreateClientDTO,
  UpdateClientDTO,
  AuditLog,
  CreateClientResponse,
} from '@/types'
import { getToken } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const MAX_RETRIES = 3
const RETRY_BASE_MS = 500

async function fetchWithRetry(url: string, options: RequestInit, retries = 0): Promise<Response> {
  try {
    const res = await fetch(url, options)

    // Retry on 5xx server errors
    if (res.status >= 500 && retries < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * Math.pow(2, retries)
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, options, retries + 1)
    }

    return res
  } catch (err) {
    // Retry on network errors
    if (retries < MAX_RETRIES) {
      const delay = RETRY_BASE_MS * Math.pow(2, retries)
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, options, retries + 1)
    }
    throw err
  }
}

export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        message = data.error || data.message || message
      } catch {
        message = text || message
      }
    } catch {
      // body unreadable
    }
    throw new ApiError(res.status, message)
  }

  return res.json()
}

export async function fetchWithAdminKey<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': apiKey,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const text = await res.text()
      try {
        const data = JSON.parse(text)
        message = data.error || data.message || message
      } catch {
        message = text || message
      }
    } catch {
      // body unreadable
    }
    throw new ApiError(res.status, message)
  }

  return res.json()
}

export const api = {
  auth: {
    me: () => fetchAPI<User>('/api/auth/me'),

    exchangeToken: (code: string) =>
      fetchAPI<{ token: string }>('/api/auth/exchange-token', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    verify: (regNo: string) =>
      fetchAPI<{ success: boolean; message?: string }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ reg_no: regNo }),
      }),

    confirmLink: (genId: string, regNo: string) =>
      fetchAPI<{ token: string }>('/api/auth/confirm-link', {
        method: 'POST',
        body: JSON.stringify({ gen_id: genId, reg_no: regNo }),
      }),

    grants: () => fetchAPI<{ grants: Grant[] }>('/api/auth/grants'),

    revokeGrant: (id: string) =>
      fetchAPI<{ success: boolean }>(`/api/auth/grants/${id}`, {
        method: 'DELETE',
      }),

    sendPhoneOTP: () =>
      fetchAPI<{ message: string; phone: string; otp?: string }>('/api/auth/phone/send-otp', {
        method: 'POST',
      }),

    verifyPhoneOTP: (otp: string) =>
      fetchAPI<{ message: string }>('/api/auth/phone/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp }),
      }),

    sendEmailOTP: (email: string) =>
      fetchAPI<{ message: string; email: string; otp?: string }>('/api/auth/email/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    verifyEmailOTP: (email: string, otp: string) =>
      fetchAPI<{ message: string; code: string }>('/api/auth/email/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      }),

    danCallback: (regNo: string) =>
      fetchAPI<{ message: string; reg_no: string }>(
        `/api/auth/dan/callback?reg_no=${encodeURIComponent(regNo)}`
      ),

    loginActivity: () => fetchAPI<LoginActivityResponse>('/api/auth/login-activity'),

    apiLogs: () =>
      fetchAPI<{
        logs: {
          id: number
          method: string
          path: string
          query: string
          status_code: number
          latency_ms: number
          client_ip: string
          user_agent: string
          request_headers: string
          request_body: string
          response_headers: string
          response_body: string
          created_at: string
        }[]
      }>('/api/auth/api-logs'),

    logout: () =>
      fetchAPI<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      }),
  },

  oauth: {
    authorize: async (params: {
      clientId: string
      redirectUri: string
      scope: string
      state: string
      approve: boolean
      codeChallenge?: string
      codeChallengeMethod?: string
    }) => {
      const token = getToken()

      let url =
        `/api/oauth/authorize` +
        `?client_id=${encodeURIComponent(params.clientId)}` +
        `&redirect_uri=${encodeURIComponent(params.redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(params.scope)}` +
        `&state=${encodeURIComponent(params.state)}` +
        `&approve=${params.approve}`

      if (params.codeChallenge) {
        url += `&code_challenge=${encodeURIComponent(params.codeChallenge)}`
        url += `&code_challenge_method=${encodeURIComponent(params.codeChallengeMethod || 'plain')}`
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        redirect: 'manual',
        credentials: 'include',
      })

      const location = res.headers.get('Location')
      if (location) {
        return { redirect: location }
      }

      if (res.ok) {
        const data = await res.json()
        if (data.error) {
          throw new ApiError(400, data.error)
        }
        return data
      }

      throw new ApiError(res.status, 'Authorization failed')
    },
  },

  admin: {
    stats: (apiKey: string) => fetchWithAdminKey<AdminStats>('/api/admin/stats', apiKey),

    clients: (apiKey: string) =>
      fetchWithAdminKey<{ clients: OAuthClient[] }>('/api/admin/clients', apiKey),

    createClient: (apiKey: string, data: CreateClientDTO) =>
      fetchWithAdminKey<CreateClientResponse>('/api/admin/clients', apiKey, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateClient: (apiKey: string, id: string, data: UpdateClientDTO) =>
      fetchWithAdminKey<OAuthClient>(`/api/admin/clients/${id}`, apiKey, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteClient: (apiKey: string, id: string) =>
      fetchWithAdminKey<{ success: boolean }>(`/api/admin/clients/${id}`, apiKey, {
        method: 'DELETE',
      }),

    auditLogs: (apiKey: string) =>
      fetchWithAdminKey<{ logs: AuditLog[] }>('/api/admin/audit-logs', apiKey),
  },
}
