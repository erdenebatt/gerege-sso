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
  gerege: GeregeInfo
  created_at?: string
  updated_at?: string
}

export interface Grant {
  id: string
  client_id: string
  client_name: string
  scopes: string[]
  granted_at: string
  last_used_at?: string
}

export interface VerificationLevel {
  level: number
  email: boolean
  phone: boolean
  dan: boolean
  face: boolean
}
