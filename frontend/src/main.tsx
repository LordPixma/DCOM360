import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// Route-based code splitting
const AdminApp = lazy(() => import('./AdminApp'))
const AdminLogin = lazy(() => import('@/components/AdminLogin').then(m => ({ default: m.AdminLogin })))
// Visualization routes
const HeatmapView = lazy(() => import('@/visualizations/HeatmapView').then(m => ({ default: m.HeatmapView })))
const AdvancedHeatmap = lazy(() => import('@/visualizations/AdvancedHeatmap').then(m => ({ default: m.AdvancedHeatmap })))
const PredictiveAnalytics = lazy(() => import('@/visualizations/PredictiveAnalytics').then(m => ({ default: m.PredictiveAnalytics })))
const ComparativeAnalysis = lazy(() => import('@/visualizations/ComparativeAnalysis').then(m => ({ default: m.ComparativeAnalysis })))
const HistoricalTrends = lazy(() => import('@/visualizations/HistoricalTrends').then(m => ({ default: m.HistoricalTrends })))
const DisasterDetail = lazy(() => import('@/components/DisasterDetail').then(m => ({ default: m.DisasterDetail })))
const EventsList = lazy(() => import('@/components/EventsList'))
import './index.css'
// Register PWA service worker (auto-update)
// eslint-disable-next-line import/no-unresolved
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })

const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)
const queryClient = new QueryClient()

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading…</div>}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/admin/login" element={<AdminLogin onLoggedIn={() => { window.location.href = '/admin' }} />} />
            <Route path="/viz/heatmap" element={<HeatmapView />} />
            <Route path="/viz/heatmap-advanced" element={<AdvancedHeatmap />} />
            <Route path="/viz/predict" element={<PredictiveAnalytics />} />
            <Route path="/viz/compare" element={<ComparativeAnalysis />} />
            <Route path="/viz/trends" element={<HistoricalTrends />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/disaster/:id" element={<DisasterDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
