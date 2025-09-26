import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// Route-based code splitting
const AdminApp = lazy(() => import('./AdminApp'))
const AdminLogin = lazy(() => import('@/components/AdminLogin').then(m => ({ default: m.AdminLogin })))

// Authentication routes
const LoginPage = lazy(() => import('@/components/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/components/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const UserProfilePage = lazy(() => import('@/components/auth/UserProfilePage').then(m => ({ default: m.UserProfilePage })))

// Visualization routes
const HeatmapView = lazy(() => import('@/visualizations/HeatmapView').then(m => ({ default: m.HeatmapView })))
const AdvancedHeatmap = lazy(() => import('@/visualizations/AdvancedHeatmap').then(m => ({ default: m.AdvancedHeatmap })))
const PredictiveAnalytics = lazy(() => import('@/visualizations/PredictiveAnalytics').then(m => ({ default: m.PredictiveAnalytics })))
const ComparativeAnalysis = lazy(() => import('@/visualizations/ComparativeAnalysis').then(m => ({ default: m.ComparativeAnalysis })))
const HistoricalTrends = lazy(() => import('@/visualizations/HistoricalTrends').then(m => ({ default: m.HistoricalTrends })))
const DisasterDetail = lazy(() => import('@/components/DisasterDetail').then(m => ({ default: m.DisasterDetail })))
const EventsList = lazy(() => import('@/components/EventsList'))
const AlertManagement = lazy(() => import('@/components/AlertManagement'))
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
            
            {/* Authentication routes */}
            <Route path="/auth/login" element={<LoginPage onLoggedIn={() => { window.location.href = '/' }} />} />
            <Route path="/auth/register" element={<RegisterPage onRegistered={() => { window.location.href = '/' }} />} />
            <Route path="/profile" element={<UserProfilePage />} />
            
            {/* Admin routes */}
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/admin/login" element={<AdminLogin onLoggedIn={() => { window.location.href = '/admin' }} />} />
            
            {/* Visualization routes */}
            <Route path="/viz/heatmap" element={<HeatmapView />} />
            <Route path="/viz/heatmap-advanced" element={<AdvancedHeatmap />} />
            <Route path="/viz/predict" element={<PredictiveAnalytics />} />
            <Route path="/viz/compare" element={<ComparativeAnalysis />} />
            <Route path="/viz/trends" element={<HistoricalTrends />} />
            
            {/* Feature routes */}
            <Route path="/events" element={<EventsList />} />
            <Route path="/alerts" element={<AlertManagement />} />
            <Route path="/disaster/:id" element={<DisasterDetail />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
