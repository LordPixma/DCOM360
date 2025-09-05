import axios, { type AxiosRequestConfig } from 'axios'
import { api } from './api'

// Reuse baseURL from existing api instance; add Authorization header dynamically
export const adminApi = axios.create({
  baseURL: (api.defaults.baseURL as string | undefined) || '/',
  headers: { 'content-type': 'application/json' }
})

adminApi.interceptors.request.use((config: AxiosRequestConfig) => {
  try {
    const token = sessionStorage.getItem('ADMIN_TOKEN') || ''
    const email = sessionStorage.getItem('ADMIN_EMAIL') || ''
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any)['Authorization'] = `Bearer ${token}`
    }
    if (email) {
      config.headers = config.headers || {}
      ;(config.headers as any)['x-admin-email'] = email
    }
  } catch {}
  return config
})

export function setAdminToken(token: string) {
  try { sessionStorage.setItem('ADMIN_TOKEN', token) } catch {}
}

export function clearAdminToken() {
  try { sessionStorage.removeItem('ADMIN_TOKEN') } catch {}
}

export function setAdminEmail(email: string) {
  try { sessionStorage.setItem('ADMIN_EMAIL', email) } catch {}
}

export function clearAdminEmail() {
  try { sessionStorage.removeItem('ADMIN_EMAIL') } catch {}
}
