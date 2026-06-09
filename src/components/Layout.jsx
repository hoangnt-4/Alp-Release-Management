import React, { useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { useAuth } from '../hooks/useAuth'
import { downloadCSV } from '../lib/lark'
import ActivityHistoryModal from './ActivityHistoryModal'
import clsx from 'clsx'

const APP_STATUSES = [
  { value: '',            label: 'Tất cả' },
  { value: 'RUNNING',     label: 'Running' },
  { value: 'PENDING',     label: 'Pending' },
  { value: 'UNPUBLISHED', label: 'Unpublished' },
  { value: 'ABANDONED',   label: 'Abandoned' },
]

const STATUS_DOT = {
  NEW:          '#38bdf8',
  'UI FIGMA':   '#a78bfa',
  'WAIT ASSIGN':'#f472b6',
  CODING:       '#34d399',
  RUNNING:      '#22c55e',
  PENDING:      '#eab308',
  REMOVED:      '#94a3b8',
  UNPUBLISHED:  '#64748b',
  ABANDONED:    '#ef4444',
}

const NAV = [
  { to: '/dashboard', label: 'Dashboard',          icon: '⌂' },
  { to: '/apps',      label: 'Apps',               icon: '⊞', defaultStatus: 'RUNNING' },
  { to: '/history',   label: 'Lịch sử phát hành', icon: '≡', countKey: 'total' },
  { to: '/watchlist', label: 'Xem sau',            icon: '◉', countKey: 'watchlist' },
  { to: '/stats',     label: 'Thống kê',           icon: '↗' },
]

export default function Layout({ children }) {
  const { counts, releases, apps, refresh, loading } = useReleasesStore()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()

  const isApps = location.pathname === '/apps'
  const currentStatus = new URLSearchParams(location.search).get('status') || ''

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refresh() } finally { setRefreshing(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={clsx('flex flex-col shrink-0 transition-all duration-200', collapsed ? 'w-14' : 'w-56')}
        style={{ background: '#0f172a', color: '#fff' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 h-14 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0d9488' }}>R</div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Release Manager</p>
                <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>App Tracking</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(v => !v)} className="shrink-0 text-xs p-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon, countKey, defaultStatus }) => {
            const isAppsItem = to === '/apps'
            const active = location.pathname === to
            return (
              <React.Fragment key={to}>
                <NavLink
                  to={defaultStatus ? `${to}?status=${defaultStatus}` : to}
                  className={() => clsx('flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors', active && 'font-medium')}
                  style={() => active
                    ? { background: 'rgba(13,148,136,0.2)', color: '#2dd4bf' }
                    : { color: 'rgba(255,255,255,0.55)' }}
                >
                  <span className="text-base w-5 text-center shrink-0">{icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {countKey !== undefined && counts[countKey] >= 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(255,255,255,0.12)' }}>
                          {counts[countKey]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                {/* Apps sub-tabs */}
                {isAppsItem && isApps && !collapsed && (
                  <div className="ml-4 space-y-0.5 pb-1">
                    {APP_STATUSES.map(s => {
                      const count = s.value
                        ? (apps || []).filter(a => (a.status || '').toUpperCase() === s.value).length
                        : (apps || []).length
                      const isActive = currentStatus === s.value
                      return (
                        <button
                          key={s.value}
                          onClick={() => navigate(s.value ? `/apps?status=${s.value}` : '/apps?status=')}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                          style={isActive
                            ? { background: 'rgba(13,148,136,0.15)', color: '#2dd4bf' }
                            : { color: 'rgba(255,255,255,0.4)' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: s.value ? STATUS_DOT[s.value] : 'rgba(255,255,255,0.3)' }} />
                          <span className="flex-1 text-left">{s.label}</span>
                          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{count}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 pb-3 border-t pt-2 space-y-0.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors disabled:opacity-40"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <span className={clsx('text-sm', (refreshing || loading) && 'animate-spin')}>↻</span>
            {!collapsed && (refreshing || loading ? 'Đang tải...' : 'Làm mới dữ liệu')}
          </button>
          <button
            onClick={() => downloadCSV(releases)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <span className="text-sm">↓</span>
            {!collapsed && 'Xuất CSV'}
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <span className="text-sm">📋</span>
            {!collapsed && 'Activity Log'}
          </button>
          <Link
            to="/tutorial"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <span className="text-sm">?</span>
            {!collapsed && 'Hướng dẫn'}
          </Link>

          {/* User + Logout */}
          {user && (
            <div className="pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {!collapsed && (
                <div className="px-2.5 py-1.5 text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {user.email || user.name}
                </div>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                <span className="text-sm">⎋</span>
                {!collapsed && 'Đăng xuất'}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-surface-50">
        {children}
      </main>

      {showHistory && <ActivityHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  )
}
