import axios from 'axios'

const TOKEN_KEY = 'arb_token'

/**
 * Single axios instance for the whole app. The base URL points at the Laravel
 * API and is overridable per environment via VITE_API_URL.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8001/api',
  headers: { Accept: 'application/json' },
})

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the token is rejected, drop it so the app falls back to the login flow.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setToken(null)
    }
    return Promise.reject(error)
  },
)
