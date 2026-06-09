import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ReleasesProvider } from './hooks/useReleasesStore'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Watchlist from './pages/Watchlist'
import Stats from './pages/Stats'
import Apps from './pages/Apps'
import Tutorial from './pages/Tutorial'
import Login from './pages/Login'

function PrivateApp() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="text-sm" style={{ color: '#94a3b8' }}>Đang tải...</div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <ReleasesProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/tutorial" element={<Tutorial />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ReleasesProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PrivateApp />
      </AuthProvider>
    </BrowserRouter>
  )
}
