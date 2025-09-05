import axios from 'axios'

// Determine API base URL
let defaultBase = ''
if (typeof window !== 'undefined') {
  const host = window.location.hostname
  // Auto-target production API when running on known Pages domains
  if (
    host.includes('flare360-frontend.pages.dev') ||
    host.includes('dcom360-frontend.pages.dev') ||
    host.includes('flare360.org')
  ) {
    defaultBase = 'https://flare360-worker-production.samuel-1e5.workers.dev'
  }
  // Local dev fallback to API worker running with `wrangler dev`
  if (!defaultBase && (host === 'localhost' || host === '127.0.0.1')) {
    defaultBase = 'http://127.0.0.1:8787'
  }
}

const API_BASE: string = (import.meta.env.VITE_API_BASE as string) || defaultBase || ''

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

// Helpful console hint when API base is not configured
if (!API_BASE && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn('[Flare360] VITE_API_BASE is not set and no defaultBase matched. API requests will be relative to this origin. Configure VITE_API_BASE in .env.')
}
