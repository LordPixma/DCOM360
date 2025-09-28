import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
// Primary alias imports
import { useCyclones } from '../hooks/useCyclones'
import { useWildfireClusters } from '../hooks/useWildfireClusters'
import { useFeedHealth } from '../hooks/useFeedHealth'
import * as apiMod from '../lib/api'

// Mock axios-driven api get
vi.spyOn(apiMod.api, 'get').mockImplementation(async (url: string) => {
  if (url.startsWith('/api/cyclones')) {
    return { data: { success: true, data: [ { id: '1', name: 'ALPHA', advisory_time: new Date().toISOString() } ] } }
  }
  if (url.startsWith('/api/wildfire/clusters')) {
    return { data: { success: true, data: [ { id: '10', cluster_key: 'demo-1', centroid: { lat: 1, lng: 2 }, detections_6h: 5, detections_24h: 20 } ] } }
  }
  if (url.startsWith('/api/system/feeds')) {
    return { data: { success: true, data: [ { feed: 'gdacs', status: 'OK', error_count: 0, consecutive_failures: 0 } ] } }
  }
  return { data: { success: true, data: [] } }
})

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('data hooks', () => {
  it('loads cyclones', async () => {
    const { result } = renderHook(() => useCyclones(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].name).toBe('ALPHA')
  })
  it('loads wildfire clusters', async () => {
    const { result } = renderHook(() => useWildfireClusters({ limit: 5 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].cluster_key).toBe('demo-1')
  })
  it('loads feed health', async () => {
    const { result } = renderHook(() => useFeedHealth(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].feed).toBe('gdacs')
  })
})
