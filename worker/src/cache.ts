import type { Env } from './types'

export const cache = {
  async get(env: Env, key: string): Promise<string | null> {
    if (!env.CACHE) return null
    try { return await env.CACHE.get(key) } catch { return null }
  },
  async put(env: Env, key: string, value: string, ttlSec = 300): Promise<void> {
    if (!env.CACHE) return
    try { await env.CACHE.put(key, value, { expirationTtl: ttlSec }) } catch {}
  }
}
