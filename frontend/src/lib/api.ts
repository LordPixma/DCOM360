import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export interface APIResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: Record<string, unknown>
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})
