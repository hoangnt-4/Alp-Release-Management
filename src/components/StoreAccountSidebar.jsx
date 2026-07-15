import React, { useMemo, useState, useEffect } from 'react'
import ReactDOM from 'react-dom'

// Module-level cache — persists until page refresh, shared across all sidebar instances
let _installsMap = null  // { [hnId_lower]: installs } | null = not yet loaded

function fmtInstalls(n) {
  if (n == null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`
  return String(n)
}

function useInstallsMap() {
  const [map, setMap] = useState(_installsMap)
  useEffect(() => {
    if (_installsMap !== null) return
    fetch('/.netlify/functions/installs-list?platform=all')
      .then(r => r.json())
      .then(d => {
        const m = {}
        ;(d.apps || []).forEach(a => {
          if (a.hnId && a.installs != null) m[a.hnId.toLowerCase()] = a.installs
        })
        _installsMap = m
        setMap(m)
      })
      .catch(() => { _installsMap = {}; setMap({}) })
  }, [])
  return map
}

const STATUS_COLOR = { RUNNING: '#22c55e', PENDING: '#f59e0b', UNPUBLISHED: '#94a3b8', ABANDONED: '#f43f5e' }

import googlePlayImg from '../assets/icons/google-play.png'
import appStoreImg from '../assets/icons/app-store.png'

function PlatformHeaderIcon({ byPlatform, size = 44 }) {
  const platforms = Object.keys(byPlatform).map(p => p.toLowerCase())
  const hasAndroid = platforms.some(p => p.includes('android'))
  const hasIos = platforms.some(p => p.includes('ios') || p.includes('apple') || p.includes('iphone'))

  if (hasAndroid && hasIos) return (
    <div style={{ display: 'flex', gap: 3 }}>
      <img src={googlePlayImg} width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} style={{ borderRadius: 8, objectFit: 'contain' }} />
      <img src={appStoreImg}   width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} style={{ borderRadius: 8, objectFit: 'contain' }} />
    </div>
  )
  if (hasAndroid) return <img src={googlePlayImg} width={size} height={size} style={{ borderRadius: 10, objectFit: 'contain' }} />
  if (hasIos)     return <img src={appStoreImg}   width={size} height={size} style={{ borderRadius: 10, objectFit: 'contain' }} />
  return <span style={{ fontSize: 20 }}>🏢</span>
}

function SidebarContent({ account, apps, appsOverride, monet = {}, onClose, onSelectApp }) {
  const installsMap = useInstallsMap()
  const hasMonetData = (a) => {
    const m = monet[(a.alpId || '').toLowerCase()] || monet[(a.hnId || '').toLowerCase()]
    return m && Object.keys(m.months || {}).length > 0
  }
  const accountApps = useMemo(() =>
    appsOverride
      ? [...appsOverride].sort((a, b) => (a.alpId || '').localeCompare(b.alpId || ''))
      : apps.filter(a => a.storeAccount && a.storeAccount === account)
          .sort((a, b) => (a.alpId || '').localeCompare(b.alpId || ''))
  , [apps, appsOverride, account])

  const byPlatform = useMemo(() => {
    const m = {}
    accountApps.forEach(a => {
      const p = (typeof a.platform === 'object' ? a.platform?.text : a.platform) || 'Other'
      m[p] = (m[p] || 0) + 1
    })
    return m
  }, [accountApps])

  const byStatus = useMemo(() => {
    const m = {}
    accountApps.forEach(a => { const s = a.status || 'Unknown'; m[s] = (m[s] || 0) + 1 })
    return m
  }, [accountApps])

  const totalInstalls = useMemo(() => {
    if (!installsMap) return null
    return accountApps.reduce((sum, a) => {
      const v = installsMap[a.hnId?.toLowerCase()]
      return sum + (v != null ? v : 0)
    }, 0)
  }, [accountApps, installsMap])

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(40px); opacity:0 } to { transform: none; opacity:1 } }`}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.5)',
      }} />

      {/* Panel — pure white bg to prevent bleed-through */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.2s ease',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            <PlatformHeaderIcon byPlatform={byPlatform} size={44} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>{account}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{accountApps.length} apps</p>
              {totalInstalls != null && totalInstalls > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', fontFamily: 'monospace' }}>
                  ↓ {totalInstalls >= 1_000_000
                    ? `${(totalInstalls / 1_000_000).toFixed(1)}M`
                    : totalInstalls >= 1_000
                      ? `${(totalInstalls / 1_000).toFixed(1)}K`
                      : totalInstalls.toLocaleString('en-US')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }}>×</button>
        </div>

        {/* Chips */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(byStatus).map(([s, c]) => (
            <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: `${STATUS_COLOR[s] || '#94a3b8'}18`, border: `1px solid ${STATUS_COLOR[s] || '#94a3b8'}30`, fontSize: 12, color: STATUS_COLOR[s] || '#94a3b8', fontWeight: 500 }}>
              {s} · {c}
            </span>
          ))}
        </div>

        {/* App list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {accountApps.map(a => {
            const aIsA = ((typeof a.platform === 'object' ? a.platform?.text : a.platform) || '').toLowerCase().includes('android')
            const adc = aIsA ? '#34a853' : '#007aff'
            const sc = STATUS_COLOR[a.status] || '#94a3b8'
            const installs = installsMap?.[a.hnId?.toLowerCase()]
            const installsStr = fmtInstalls(installs)
            return (
              <div key={a.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'default', borderBottom: '1px solid #f1f5f9' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Platform icon */}
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: adc, color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{aIsA ? 'A' : 'i'}</span>

                {/* Name + ID */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                    {/* App name — opens detail modal */}
                    <button onClick={() => { onSelectApp?.(a); onClose() }}
                      style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', background: 'none', border: 'none', padding: 0, cursor: onSelectApp ? 'pointer' : 'default', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}
                      onMouseEnter={e => { if (onSelectApp) e.currentTarget.style.color = '#0d9488' }}
                      onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}>
                      {a.alpId || a.hnId}
                    </button>
                    {hasMonetData(a) && (
                      <span title="Có dữ liệu Monet" style={{ fontSize: 10, padding: '1px 5px', borderRadius: 8, background: '#eff6ff', color: '#3b82f6', fontWeight: 600, flexShrink: 0, border: '1px solid #bfdbfe', whiteSpace: 'nowrap' }}>◈ M</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{a.hnId}</span>
                    {/* Store link */}
                    {a.appLinkUrl && (
                      <a href={a.appLinkUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#0d9488', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                        onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        onClick={e => e.stopPropagation()}>
                        Store ↗
                      </a>
                    )}
                    {/* Installs */}
                    {installsStr && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: aIsA ? '#34a853' : '#0071e3', fontFamily: 'monospace', background: aIsA ? 'rgba(52,168,83,0.08)' : 'rgba(0,113,227,0.08)', padding: '1px 5px', borderRadius: 4 }}>
                        ↓{installsStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                {a.status && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: `${sc}15`, color: sc, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>{a.status}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Render via portal so it always escapes any overflow/stacking context
export default function StoreAccountSidebar(props) {
  return ReactDOM.createPortal(<SidebarContent {...props} />, document.body)
}
