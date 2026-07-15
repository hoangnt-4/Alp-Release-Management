import React, { useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { useAuth } from '../hooks/useAuth'
import { canAccessMonet } from '../lib/monetAccess'
import { downloadCSV } from '../lib/lark'
import ActivityHistoryModal from './ActivityHistoryModal'
import clsx from 'clsx'

const APP_STATUSES = [
  { value: '',            label: 'Tất cả' },
  { value: 'RUNNING',     label: 'Running' },
  { value: 'PENDING',     label: 'Pending' },
  { value: 'UNPUBLISHED', label: 'Unpublished' },
  { value: 'ABANDONED',   label: 'Abandoned' },
  { value: '__goals__',   label: 'Goals' },
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

function useMonetAccess() {
  const { user } = useAuth()
  return canAccessMonet(user?.email)
}

// SVG icon components
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IconApps = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
  </svg>
)
const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h18v18H3z" style={{display:'none'}}/><circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconWatchlist = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconStats = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)
const IconMonet = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
)
const IconInstalls = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v13"/><path d="m7 12 5 5 5-5"/><rect x="2" y="19" width="20" height="3" rx="1"/>
  </svg>
)
const BASE_NAV = [
  { to: '/dashboard', label: 'Dashboard',          Icon: IconDashboard,  group: 'main' },
  { to: '/apps',      label: 'Apps',               Icon: IconApps,       group: 'main', defaultStatus: 'RUNNING' },
  { to: '/history',   label: 'Lịch sử phát hành', Icon: IconHistory,    group: 'main', countKey: 'total' },
  { to: '/watchlist', label: 'Xem sau',            Icon: IconWatchlist,  group: 'main', countKey: 'watchlist' },
  { to: '/stats',     label: 'Thống kê',           Icon: IconStats,      group: 'analytics' },
  { to: '/installs',  label: 'App Installs',        Icon: IconInstalls,   group: 'analytics' },
]

export default function Layout({ children }) {
  const { counts, releases, apps, refresh, loading } = useReleasesStore()
  const { user, logout } = useAuth()
  const hasMonet = useMonetAccess()
  const NAV = hasMonet
    ? [...BASE_NAV, { to: '/monet', label: 'Monet', Icon: IconMonet, group: 'analytics' }]
    : BASE_NAV
  const [collapsed, setCollapsed]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()

  const isApps  = location.pathname === '/apps'
  const isStats = location.pathname === '/stats'
  const currentStatus = new URLSearchParams(location.search).get('status') || ''
  const currentView   = new URLSearchParams(location.search).get('view')   || 'stats'

  const STATS_TABS = [
    { value: 'stats',     label: 'Overview' },
    { value: 'gantt',     label: 'Timeline' },
    { value: 'calendar',  label: 'Release Calendar' },
  ]

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refresh() } finally { setRefreshing(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside
        className={clsx('hidden md:flex flex-col shrink-0 transition-all duration-200', collapsed ? 'w-14' : 'w-56')}
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
        <nav className="flex-1 p-2 overflow-y-auto">
          {!collapsed && (
            <p className="px-2.5 pt-1 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Main</p>
          )}
          {NAV.filter(n => n.group === 'main').map(({ to, label, Icon, countKey, defaultStatus }) => {
            const isAppsItem = to === '/apps'
            const active = location.pathname === to
            // For Apps item: restore last used tab from localStorage
            const appsNavTarget = (() => {
              if (!isAppsItem) return defaultStatus ? `${to}?status=${defaultStatus}` : to
              const last = localStorage.getItem('appsLastTab')
              if (!last) return to
              if (last === '__goals__') return '/apps?view=goals'
              if (last) return `/apps?status=${last}`
              return to
            })()
            return (
              <React.Fragment key={to}>
                <NavLink
                  to={appsNavTarget}
                  className={() => clsx('relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5', active && 'font-medium')}
                  style={() => active
                    ? { background: 'rgba(13,148,136,0.18)', color: '#2dd4bf' }
                    : { color: 'rgba(255,255,255,0.55)' }}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full" style={{ background: '#2dd4bf' }} />}
                  <span className="w-5 flex items-center justify-center shrink-0"><Icon /></span>
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
                      const isGoals = s.value === '__goals__'
                      const count = isGoals
                        ? null
                        : s.value
                          ? (apps || []).filter(a => (a.status || '').toUpperCase() === s.value).length
                          : (apps || []).length
                      const urlView = new URLSearchParams(location.search).get('view') || ''
                      const isActive = isGoals
                        ? urlView === 'goals'
                        : !urlView && currentStatus === s.value
                      const handleClick = () => {
                        if (isGoals) {
                          localStorage.setItem('appsLastTab', '__goals__')
                          navigate('/apps?view=goals')
                        } else {
                          localStorage.setItem('appsLastTab', s.value)
                          navigate(s.value ? `/apps?status=${s.value}` : '/apps')
                        }
                      }
                      return (
                        <button
                          key={s.value}
                          onClick={handleClick}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                          style={isActive
                            ? { background: 'rgba(13,148,136,0.15)', color: '#2dd4bf' }
                            : { color: 'rgba(255,255,255,0.4)' }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                        >
                          {isGoals
                            ? <span style={{ fontSize: 10 }}>🎯</span>
                            : <span className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: s.value ? STATUS_DOT[s.value] : 'rgba(255,255,255,0.3)' }} />
                          }
                          <span className="flex-1 text-left">{s.label}</span>
                          {count !== null && <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{count}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {/* Analytics group */}
          {!collapsed && (
            <p className="px-2.5 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Analytics</p>
          )}
          {collapsed && <div className="my-1 mx-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />}
          {NAV.filter(n => n.group === 'analytics').map(({ to, label, Icon, countKey, defaultStatus }) => {
            const active = location.pathname === to
            const isStatsItem = to === '/stats'
            return (
              <React.Fragment key={to}>
                <NavLink
                  to={defaultStatus ? `${to}?status=${defaultStatus}` : to}
                  className={() => clsx('relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-all duration-150 mb-0.5', active && 'font-medium')}
                  style={() => active
                    ? { background: 'rgba(13,148,136,0.18)', color: '#2dd4bf' }
                    : { color: 'rgba(255,255,255,0.55)' }}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full" style={{ background: '#2dd4bf' }} />}
                  <span className="w-5 flex items-center justify-center shrink-0"><Icon /></span>
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                </NavLink>

                {/* Stats sub-tabs — inline after Thống kê item */}
                {isStatsItem && isStats && !collapsed && (
                  <div className="ml-4 space-y-0.5 pb-1">
                    {STATS_TABS.map(s => {
                      const isActive = currentView === s.value
                      return (
                        <button
                          key={s.value}
                          onClick={() => navigate(`/stats?view=${s.value}`)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                          style={isActive
                            ? { background: 'rgba(13,148,136,0.15)', color: '#2dd4bf' }
                            : { color: 'rgba(255,255,255,0.4)' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: isActive ? '#2dd4bf' : 'rgba(255,255,255,0.3)' }} />
                          <span className="flex-1 text-left">{s.label}</span>
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

      <main className="flex-1 overflow-auto bg-surface-50 pb-16 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex items-stretch border-t z-50"
        style={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', height: 56 }}
      >
        {NAV.slice(0, hasMonet ? 6 : 5).map(({ to, label, Icon, defaultStatus }) => {
          const active = location.pathname === to
          return (
            <button
              key={to}
              onClick={() => navigate(defaultStatus ? `${to}?status=${defaultStatus}` : to)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: active ? '#2dd4bf' : 'rgba(255,255,255,0.45)' }}
            >
              <Icon />
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>
                {label === 'Lịch sử phát hành' ? 'Lịch sử' : label}
              </span>
            </button>
          )
        })}
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-40"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          <span className={clsx('text-lg leading-none', (refreshing || loading) && 'animate-spin')}>↻</span>
          <span style={{ fontSize: 9 }}>Refresh</span>
        </button>
      </nav>

      {showHistory && <ActivityHistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  )
}
