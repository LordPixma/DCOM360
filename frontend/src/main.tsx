import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminApp from './AdminApp'
import { AdminLogin } from '@/components/AdminLogin'
import './index.css'

const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)
const queryClient = new QueryClient()

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/admin/login" element={<AdminLogin onLoggedIn={() => { window.location.href = '/admin' }} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
