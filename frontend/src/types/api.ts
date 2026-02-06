import type { User, Grant } from './user'
import type { OAuthClient } from './oauth'

export interface ApiError {
  error: string
  message?: string
}

export interface AuthMeResponse extends User {}

export interface GrantsResponse {
  grants: Grant[]
}

export interface VerifyResponse {
  success: boolean
  message?: string
}

export interface ConfirmLinkResponse {
  token: string
  message?: string
}

export interface AdminStats {
  clients: {
    total: number
    active: number
  }
  users: {
    total: number
    verified: number
  }
  logins_24h: number
}

export interface AdminClientsResponse {
  clients: OAuthClient[]
}

export interface CreateClientResponse {
  client_id: string
  client_secret: string
  name: string
}

export interface AuditLog {
  id: string
  action: string
  user_email: string
  ip_address: string
  user_agent?: string
  details?: string
  created_at: string
}

export interface AuditLogsResponse {
  logs: AuditLog[]
}
