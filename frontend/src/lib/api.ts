import type {
  User,
  Grant,
  AdminStats,
  OAuthClient,
  CreateClientDTO,
  UpdateClientDTO,
  AuditLog,
  CreateClientResponse,
} from '@/types'

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

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('gerege_token') : null

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      message = data.error || data.message || message
    } catch {
      message = await res.text()
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
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': apiKey,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      message = data.error || data.message || message
    } catch {
      message = await res.text()
    }
    throw new ApiError(res.status, message)
  }

  return res.json()
}

export const api = {
  auth: {
    me: () => fetchAPI<User>('/api/auth/me'),

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
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('gerege_token')
          : null

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
    stats: (apiKey: string) =>
      fetchWithAdminKey<AdminStats>('/api/admin/stats', apiKey),

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
