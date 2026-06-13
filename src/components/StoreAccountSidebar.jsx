import React, { useMemo } from 'react'
import ReactDOM from 'react-dom'

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

function SidebarContent({ account, apps, monet = {}, onClose, onSelectApp }) {
  const hasMonetData = (a) => {
    const m = monet[(a.alpId || '').toLowerCase()] || monet[(a.hnId || '').toLowerCase()]
    return m && Object.keys(m.months || {}).length > 0
  }
  const accountApps = useMemo(() =>
    apps.filter(a => a.storeAccount && a.storeAccount === account)
      .sort((a, b) => (a.alpId || '').localeCompare(b.alpId || ''))
  , [apps, account])

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
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{accountApps.length} apps</p>
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
            return (
              <div key={a.id}
                onClick={() => { onSelectApp?.(a); onClose() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', cursor: onSelectApp ? 'pointer' : 'default' }}
                onMouseEnter={e => { if (onSelectApp) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: adc, color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{aIsA ? 'A' : 'i'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.alpId || a.hnId}</p>
                    {hasMonetData(a) && (
                      <span title="Có dữ liệu Monet" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#eff6ff', color: '#3b82f6', fontWeight: 600, flexShrink: 0, border: '1px solid #bfdbfe' }}>◈ Monet</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{a.hnId}</p>
                </div>
                {a.status && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: `${sc}15`, color: sc, fontWeight: 600, flexShrink: 0 }}>{a.status}</span>
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
  return ReactDOM.createPortal(
    <SidebarContent {...props} />,
    document.body
  )
}
