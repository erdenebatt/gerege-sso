export interface GeregeInfo {
  reg_no?: string
  family_name?: string
  last_name?: string
  first_name?: string
  name?: string
  birth_date?: string
  gender?: string
}

export interface User {
  gen_id: string
  email: string
  picture?: string
  verified: boolean
  providers: Record<string, boolean>
  gerege: GeregeInfo
  created_at?: string
  updated_at?: string
  last_login_at?: string
  dan_verified_at?: string
  dan_history?: DanVerificationLog[]
}

export interface DanVerificationLog {
  id: number
  user_id: number
  reg_no: string
  method: string
  created_at: string
}

export interface Grant {
  id: string
  client_id: string
  client_name: string
  scopes: string[]
  granted_at: string
  last_used_at?: string
}

export interface LoginEntry {
  id: number
  action: string
  details: string
  ip_address: string
  created_at: string
}

export interface LoginActivityResponse {
  logins: LoginEntry[]
  counts: Record<string, number>
}

export interface VerificationLevel {
  level: number
  email: boolean
  phone: boolean
  dan: boolean
  face: boolean
}
