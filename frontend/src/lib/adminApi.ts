import axios from 'axios'
import { api } from './api'

// Reuse baseURL from existing api instance; add Authorization header dynamically
export const adminApi = axios.create({
  baseURL: (api.defaults.baseURL as string | undefined) || '/',
  headers: { 'content-type': 'application/json' }
})

adminApi.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem('ADMIN_TOKEN') || ''
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any)['Authorization'] = `Bearer ${token}`
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
