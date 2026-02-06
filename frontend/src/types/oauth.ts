export interface OAuthClient {
  id: string
  client_id: string
  name: string
  redirect_uri: string
  allowed_scopes: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClientDTO {
  name: string
  redirect_uri: string
  scopes?: string[]
}

export interface UpdateClientDTO {
  name?: string
  redirect_uri?: string
  scopes?: string[]
  is_active?: boolean
}

export interface OAuthConsentParams {
  client_id: string
  redirect_uri: string
  scope: string
  state: string
  app_name: string
  code_challenge?: string
  code_challenge_method?: string
}
