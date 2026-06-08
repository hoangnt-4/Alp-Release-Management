import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { downloadCSV } from '../lib/lark'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', label: 'Dashboard',            icon: '⌂' },
  { to: '/history',   label: 'Lịch sử phát hành',   icon: '≡', countKey: 'total' },
  { to: '/watchlist', label: 'Xem sau',              icon: '◉', countKey: 'watchlist' },
  { to: '/stats',     label: 'Thống kê',             icon: '↗' },
  { to: '/apps',      label: 'Apps',                 icon: '⊞' },
]

export default function Layout({ children }) {
  const { counts, releases } = useReleasesStore()
  const [collapsed, setCollapsed] = useState(false)

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
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ to, label, icon, countKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx('flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors', isActive && 'font-medium')}
              style={({ isActive }) => isActive
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
          ))}
        </nav>

        {/* Export CSV */}
        <div className="px-2 pb-3 border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-surface-50">
        {children}
      </main>
    </div>
  )
}
