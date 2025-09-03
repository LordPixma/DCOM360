import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Filters = {
  country?: string
  severity?: 'green' | 'yellow' | 'red'
  type?: string
}

type Preferences = {
  autoRefresh: boolean
  refreshInterval: number
}

type AppState = {
  filters: Filters
  preferences: Preferences
  setFilters: (f: Filters) => void
  clearFilters: () => void
  setPreferences: (p: Partial<Preferences>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      filters: {},
      preferences: { autoRefresh: true, refreshInterval: 30000 },
      setFilters: (f) => set({ filters: f }),
      clearFilters: () => set({ filters: {} }),
      setPreferences: (p) => set((s) => ({ preferences: { ...s.preferences, ...p } })),
    }),
    { name: 'dcom360-app' }
  )
)
