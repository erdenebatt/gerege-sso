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
  verification_level: number
  mfa_enabled: boolean
  mfa_level: number
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
  registry: boolean
  phone: boolean
  dan: boolean
  esign: boolean
}

// MFA Types
export interface MFASettings {
  totp_enabled: boolean
  passkey_enabled: boolean
  push_enabled: boolean
  preferred_method: 'totp' | 'passkey' | 'push' | null
}

export interface TOTPSetupResponse {
  secret: string
  qr_code_uri: string
  issuer: string
  account: string
}

export interface RecoveryCodesResponse {
  codes: string[]
}

export interface PushChallengeResponse {
  challenge_id: string
  number_match: number
  expires_in: number
}

export interface QRGenerateResponse {
  session_id: string
  qr_code: string
  expires_in: number
}

export interface MFAChallengeResponse {
  challenge_id: string
  methods: string[]
  preferred_method?: string
  expires_in: number
  temp_token: string
}

export interface PasskeyInfo {
  id: string
  credential_name: string
  sign_count: number
  transport: string[]
  created_at: string
  last_used_at?: string
}

export interface DeviceInfo {
  id: string
  device_name: string
  device_type: string
  is_verified: boolean
  created_at: string
  last_used_at?: string
}
