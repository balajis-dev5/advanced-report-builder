export interface User {
  id: number
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}
