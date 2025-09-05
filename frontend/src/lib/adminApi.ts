import axios, { type InternalAxiosRequestConfig } from 'axios'
import { api } from './api'

// Reuse baseURL from existing api instance; add Authorization header dynamically
export const adminApi = axios.create({
  baseURL: (api.defaults.baseURL as string | undefined) || '/',
  headers: { 'content-type': 'application/json' }
})

adminApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = sessionStorage.getItem('ADMIN_TOKEN') || ''
    const email = sessionStorage.getItem('ADMIN_EMAIL') || ''
    if (token) {
  const headers = (config.headers ||= {} as any)
  headers['Authorization'] = `Bearer ${token}`
    }
    if (email) {
  const headers = (config.headers ||= {} as any)
  headers['x-admin-email'] = email
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
