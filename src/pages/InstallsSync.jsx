import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import StoreAccountSidebar from '../components/StoreAccountSidebar'

const DELAY_MS = 5000

function fmt(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('en-US')
}

async function syncOne(recordId, storeId) {
  const res = await fetch('/.netlify/functions/installs-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordId, storeId }),
  })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return { error: `HTTP ${res.status}: ${text.slice(0, 120)}` }
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms))

// ─── Platform helpers ──────────────────────────────────────────────────────────

function PlatformBadge({ platform, style }) {
  const isIos = platform === 'ios'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
      background: isIos ? 'rgba(0,113,227,0.12)' : 'rgba(52,168,83,0.12)',
      color: isIos ? '#0071e3' : '#16a34a',
      letterSpacing: '0.04em',
      ...style,
    }}>
      {isIos ? 'iOS' : 'Android'}
    </span>
  )
}

function appIconStyle(platform) {
  return platform === 'ios' ? '#0071e3' : '#34a853'
}

function storeLink(storeId, platform) {
  if (!storeId) return null
  if (platform === 'ios') return `https://apps.apple.com/app/id${storeId}`
  return `https://play.google.com/store/apps/details?id=${storeId}`
}

function storeName(platform) {
  return platform === 'ios' ? 'Apple App Store' : 'Google Play Store'
}

function storeViewLabel(platform) {
  return platform === 'ios' ? 'Xem trên App Store' : 'Xem trên Google Play'
}

// ─── App Detail Panel ──────────────────────────────────────────────────────────

function AppDetailPanel({ app, rowState, rowData, syncingAll, onSync, onClose }) {
  const st = rowState[app.recordId] || 'idle'
  const data = rowData[app.recordId]
  const currentInstalls = data?.installs ?? app.installs
  const currentLastUpdate = st === 'done' ? Date.now() : app.lastUpdated
  const platform = app.platform || 'android'
  const isIos = platform === 'ios'

  return ReactDOM.createPortal(
    <div className="fixed inset-0" style={{ zIndex: 1000 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-white flex flex-col"
        style={{ width: 400, boxShadow: '-6px 0 32px rgba(0,0,0,0.16)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="shrink-0 px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: app.storeId ? appIconStyle(platform) : '#475569' }}
              >A</div>
              <div>
                <h2 className="font-semibold text-base leading-tight" style={{ color: '#fff' }}>
                  {app.alpId || app.appName || '—'}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: isIos ? 'rgba(0,113,227,0.2)' : 'rgba(52,168,83,0.2)',
                      color: isIos ? '#60a5fa' : '#4ade80',
                    }}
                  >{isIos ? 'iOS' : 'Android'}</span>
                  {app.hnId && (
                    <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {app.hnId}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >✕</button>
          </div>

          {/* Stats */}
          <div className="flex items-start gap-6 mt-5">
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Installs</p>
              <p className="font-bold font-mono mt-0.5" style={{ fontSize: 18, color: st === 'done' ? '#4ade80' : st === 'error' ? '#f87171' : currentInstalls != null ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {st === 'syncing' ? '⟳' : fmt(currentInstalls)}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Cập nhật</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {currentLastUpdate
                  ? new Date(currentLastUpdate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            {st === 'done' && (
              <div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Trạng thái</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#4ade80' }}>✓ Đã sync</p>
              </div>
            )}
          </div>

          {st === 'error' && (
            <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="text-xs" style={{ color: '#f87171' }}>✗ {data?.error?.slice(0, 100) || 'Lỗi không xác định'}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto" style={{ padding: '16px' }}>

          {/* Info card */}
          <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Thông tin
              </p>
            </div>
            {[
              { label: 'Alp ID',    value: app.alpId },
              { label: 'HN ID',     value: app.hnId },
              { label: 'App Name',  value: app.appName },
              { label: 'Platform',  value: isIos ? 'iOS' : 'Android' },
            ].filter(r => r.value).map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: i < arr.length - 1 ? '1px solid #f8fafc' : 'none',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Store card */}
          {app.storeId ? (
            <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '8px 14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                  {storeName(platform)}
                </p>
              </div>
              <div style={{ padding: '12px 14px' }}>
                <code style={{ fontSize: 11, color: '#475569', wordBreak: 'break-all', display: 'block', lineHeight: 1.5, fontFamily: 'monospace' }}>
                  {app.storeId}
                </code>
                <a
                  href={storeLink(app.storeId, platform)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 12, color: '#0d9488', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  {storeViewLabel(platform)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px dashed #e2e8f0', padding: '16px 14px', marginBottom: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Chưa có Store ID</p>
              <p style={{ fontSize: 11, color: '#cbd5e1', margin: '4px 0 0' }}>App này chưa được thêm lên Store</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0" style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          {app.storeId ? (
            <button
              onClick={() => onSync(app)}
              disabled={st === 'syncing' || syncingAll}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: st === 'syncing' || syncingAll ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                background: st === 'done' ? '#dcfce7' : st === 'error' ? '#fee2e2' : '#0d9488',
                color: st === 'done' ? '#16a34a' : st === 'error' ? '#dc2626' : '#fff',
                opacity: st === 'syncing' || syncingAll ? 0.55 : 1,
                transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
            >
              {st === 'syncing' ? '⟳  Đang sync…' : st === 'done' ? '✓  Đã sync — Sync lại?' : st === 'error' ? '↻  Thử lại' : '▶  Sync Installs'}
            </button>
          ) : (
            <div style={{ padding: '12px', borderRadius: 10, background: '#f1f5f9', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
              Không thể sync — chưa có Store ID
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Test Result Cards ─────────────────────────────────────────────────────────

function TestResult({ result }) {
  if (!result) return null
  if (result.error) {
    return (
      <div style={{ margin: '10px 0 0', padding: '10px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 12, color: '#dc2626', border: '1px solid #fecaca' }}>
        ✗ {result.error}
      </div>
    )
  }
  const r = result
  const fmtNum = n => n != null ? Number(n).toLocaleString('en-US') : null
  const fmtDate = v => {
    if (!v) return null
    const d = new Date(typeof v === 'number' ? v : String(v))
    return isNaN(d) ? String(v) : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const fmtSize = b => {
    if (!b) return null
    const mb = b / 1048576
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`
  }
  const fmtBool = v => v == null ? null : (v ? '✓ Yes' : '✗ No')
  const rows = [
    { label: 'Title',            value: r.title },
    { label: 'Installs (max)',   value: fmtNum(r.installs) },
    { label: 'Installs (min)',   value: fmtNum(r.minInstalls) },
    { label: 'Range',            value: r.range },
    { label: 'Ratings (US)',     value: r.ratingsUs != null && r.ratingsUs !== r.ratings ? fmtNum(r.ratingsUs) : null },
    { label: 'Est. Installs ~',  value: r.estimatedInstalls != null ? `~${fmtNum(r.estimatedInstalls)}` : null, estimated: true },
    { label: 'Score',            value: r.score != null ? `⭐ ${r.score}${r.scoreText ? ` (${r.scoreText})` : ''}` : null },
    { label: 'Ratings',          value: fmtNum(r.ratings) },
    { label: 'Reviews',          value: fmtNum(r.reviews) },
    { label: 'Developer',        value: r.developer },
    { label: 'Email',            value: r.developerEmail },
    { label: 'Genre',            value: r.genre },
    { label: 'Content Rating',   value: r.contentRating },
    { label: 'Size',             value: r.size != null ? fmtSize(Number(r.size)) || String(r.size) : null },
    { label: 'Version',          value: r.version },
    { label: 'Released',         value: fmtDate(r.released) },
    { label: 'Updated',          value: fmtDate(r.updated) },
    { label: 'Free',             value: fmtBool(r.free) },
    { label: 'Price',            value: r.price != null && r.price !== 0 ? String(r.price) : null },
    { label: 'Offers IAP',       value: fmtBool(r.offersIAP) },
    { label: 'Ad Supported',     value: fmtBool(r.adSupported) },
    { label: "Editor's Choice",  value: fmtBool(r.editorsChoice) },
    { label: 'Method',           value: r.method },
    { label: 'Summary',          value: r.summary, wide: true },
  ].filter(row => row.value != null)

  return (
    <div style={{ margin: '10px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 6 }}>
      {rows.map(({ label, value, wide, estimated }) => (
        <div key={label} style={{
          background: estimated ? '#fef9c3' : '#f0fdf4',
          borderRadius: 8, padding: '8px 10px',
          border: estimated ? '1px dashed #ca8a04' : '1px solid transparent',
          gridColumn: wide ? '1 / -1' : undefined,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: estimated ? '#92400e' : '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: estimated ? '#78350f' : '#0f172a',
            wordBreak: 'break-word', lineHeight: 1.4 }}>
            {value}
            {estimated && (
              <span style={{ fontSize: 10, fontWeight: 400, color: '#a16207', marginLeft: 4 }}>(ratings × 190)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── CSV Import Modal ──────────────────────────────────────────────────────────

function parseCsvInstalls(text) {
  // Format: No.,App Name,HN ID,Store Account,Total Install,Updated Date
  const lines = text.trim().split('\n')
  const header = lines[0].toLowerCase()
  const cols = header.split(',').map(c => c.trim().replace(/"/g, ''))
  const hnIdx    = cols.findIndex(c => c.includes('hn id') || c === 'hn id')
  const instIdx  = cols.findIndex(c => c.includes('total install') || c.includes('installs'))
  const dateIdx  = cols.findIndex(c => c.includes('updated date') || c.includes('date'))
  if (hnIdx < 0 || instIdx < 0) throw new Error('Không tìm thấy cột "HN ID" hoặc "Total Install"')

  const map = {}
  let detectedDate = '' // YYYY-MM-DD
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const parts = line.split(',').map(c => c.trim().replace(/"/g, ''))
    const hnId   = parts[hnIdx]
    const raw    = parseFloat(parts[instIdx])
    if (!hnId || isNaN(raw)) continue
    const installs = Math.floor(raw)
    if (!map[hnId] || installs > map[hnId]) map[hnId] = installs
    // Pick date from first valid row
    if (!detectedDate && dateIdx >= 0 && parts[dateIdx]) {
      // "2026/05/21" → "2026-05-21"
      detectedDate = parts[dateIdx].replace(/\//g, '-').slice(0, 10)
    }
  }
  const data = Object.entries(map).map(([hnId, installs]) => ({ hnId, installs }))
  return { data, detectedDate }
}

function CsvImportModal({ onClose, onImported }) {
  const [dragging,  setDragging]  = useState(false)
  const [parsed,    setParsed]    = useState(null) // { filename, data }
  const [dateInput, setDateInput] = useState('')   // YYYY-MM-DD
  const [error,     setError]     = useState(null)
  const [importing, setImporting] = useState(false)
  const [result,    setResult]    = useState(null)
  const inputRef = useRef(null)

  const processFile = async (file) => {
    setError(null); setParsed(null); setResult(null)
    try {
      const text = await file.text()
      const ext  = file.name.split('.').pop().toLowerCase()
      if (ext !== 'csv') { setError('Chỉ hỗ trợ file .csv'); return }
      const { data, detectedDate } = parseCsvInstalls(text)
      if (!data.length) { setError('Không tìm thấy dữ liệu hợp lệ'); return }
      setParsed({ filename: file.name, data })
      setDateInput(detectedDate || new Date().toISOString().slice(0, 10))
    } catch (e) { setError(`Lỗi parse: ${e.message}`) }
  }

  const doImport = async () => {
    if (!parsed) return
    setImporting(true); setResult(null)
    // Convert YYYY-MM-DD → timestamp (start of day UTC)
    const updatedTs = dateInput ? new Date(dateInput).getTime() : Date.now()
    try {
      const res  = await fetch('/.netlify/functions/installs-bulk-import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data: parsed.data, updatedDate: updatedTs }),
      })
      const d = await res.json()
      setResult(d)
      if (d.success) onImported()
    } catch (e) { setResult({ error: e.message }) }
    setImporting(false)
  }

  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 9999, width: 440, background: '#fff', borderRadius: 16,
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)', padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Import dữ liệu Installs</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Chỉ ghi app chưa có Installs · không ghi đè</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Drop zone */}
        {!parsed && !result && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            style={{
              border: `2px dashed ${dragging ? '#0d9488' : '#cbd5e1'}`,
              borderRadius: 12, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#f0fdfa' : '#f8fafc', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Kéo thả hoặc click để upload</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>.csv (Alp Master Data export)</div>
            <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) processFile(f); e.target.value = '' }} />
          </div>
        )}

        {/* Preview */}
        {parsed && !result && (
          <>
            <div style={{ borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{parsed.filename}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>{parsed.data.length} apps</span>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {parsed.data.map(({ hnId, installs }) => (
                  <div key={hnId} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #f8fafc', fontSize: 12 }}>
                    <span style={{ color: '#475569', fontFamily: 'monospace' }}>{hnId}</span>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>{Number(installs).toLocaleString('en-US')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>📅 Ngày cập nhật</span>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff' }}
              />
            </div>
          </>
        )}

        {/* Result */}
        {result && (
          result.error
            ? <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>✗ {result.error}</div>
            : <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14, color: '#15803d' }}>✓ Import hoàn tất</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Đã ghi',   value: result.written,  color: '#0d9488' },
                    { label: 'Bỏ qua',   value: result.skipped,  color: '#64748b' },
                    { label: 'Không tìm thấy', value: result.notFound, color: '#94a3b8' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '8px', background: '#fff', borderRadius: 8 }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color }}>{value}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10, marginBottom: 0 }}>⚠ {error}</p>}

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {result
            ? <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: '#0d9488', color: '#fff' }}>Đóng</button>
            : <>
                <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13, background: '#fff', color: '#475569' }}>Huỷ</button>
                {parsed && (
                  <button onClick={doImport} disabled={importing}
                    style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', cursor: importing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: '#0d9488', color: '#fff', opacity: importing ? 0.6 : 1 }}>
                    {importing ? '⟳ Đang import…' : `▶ Import ${parsed.data.length} apps`}
                  </button>
                )}
              </>
          }
        </div>
      </div>
    </>,
    document.body
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

// Module-level cache — tồn tại đến khi refresh trang
const _appsCache = {}
let _sortKey = null
let _sortDir = 'desc'

const PLATFORM_TABS = [
  { key: 'all',     label: 'Total' },
  { key: 'android', label: 'Android' },
  { key: 'ios',     label: 'iOS' },
  { key: 'store',   label: 'Store' },
]

function fmtCompact(n) {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-US')
}

export default function InstallsSync() {
  const { apps: storeApps } = useReleasesStore()

  const [platformTab, setPlatformTab] = useState('android')
  const [apps,       setApps]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [fetchErr,   setFetchErr]   = useState(null)
  const [rowState,   setRowState]   = useState({})
  const [rowData,    setRowData]    = useState({})
  const [syncingAll, setSyncingAll] = useState(false)
  const stopRef  = useRef(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [selectedStore, setSelectedStore] = useState(null)
  const [allInstalls, setAllInstalls] = useState(_appsCache['all'] || null)

  // Test panel
  const [showTest,   setShowTest]   = useState(false)
  const [testId,     setTestId]     = useState('')
  const [testState,  setTestState]  = useState('idle')
  const [testResult, setTestResult] = useState(null)

  // Bulk import modal
  const [showImport, setShowImport] = useState(false)

  // Sort — backed by module-level vars so state persists across navigations
  const [sortKey, setSortKey] = useState(_sortKey)
  const [sortDir, setSortDir] = useState(_sortDir)

  const toggleSort = (key) => {
    if (sortKey === key) {
      const next = sortDir === 'asc' ? 'desc' : 'asc'
      setSortDir(next); _sortDir = next
    } else {
      setSortKey(key); _sortKey = key
      setSortDir('desc'); _sortDir = 'desc'
    }
  }

  const sortedApps = useMemo(() => {
    if (!sortKey) return apps
    return [...apps].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      // Detect numeric field by checking actual values or known numeric keys
      const isNum = sortKey === 'installs' || sortKey === 'lastUpdated'
        || (typeof av === 'number') || (typeof bv === 'number')
      const cmp = isNum
        ? ((av ?? -Infinity) - (bv ?? -Infinity))
        : String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [apps, sortKey, sortDir])

  // Store tab — group installs by storeAccount (join allInstalls + storeApps by hnId)
  const storeGroups = useMemo(() => {
    if (platformTab !== 'store') return null
    const installsList = allInstalls || []
    const installsLookup = {}
    installsList.forEach(a => {
      if (a.hnId) installsLookup[a.hnId.toLowerCase()] = { installs: a.installs, platform: a.platform }
    })
    const groups = {}
    storeApps.forEach(a => {
      const sa = (a.storeAccount && a.storeAccount !== '--') ? a.storeAccount : 'Khác'
      const entry = installsLookup[a.hnId?.toLowerCase()]
      // "Khác" group: only include apps that have install data
      if (sa === 'Khác' && entry?.installs == null) return
      if (!groups[sa]) groups[sa] = { name: sa, appCount: 0, totalInstalls: 0, androidInstalls: 0, iosInstalls: 0 }
      groups[sa].appCount++
      if (entry?.installs != null) {
        groups[sa].totalInstalls += entry.installs
        if (entry.platform === 'ios') groups[sa].iosInstalls += entry.installs
        else groups[sa].androidInstalls += entry.installs
      }
    })
    return Object.values(groups).sort((a, b) => {
      if (a.name === 'Khác') return 1
      if (b.name === 'Khác') return -1
      return b.totalInstalls - a.totalInstalls
    })
  }, [platformTab, storeApps, allInstalls])

  const loadApps = useCallback((forceRefresh = false) => {
    // Store tab: fetch 'all' into cache but don't set apps state (uses storeGroups instead)
    const fetchKey = platformTab === 'store' ? 'all' : platformTab
    const cached = _appsCache[fetchKey]
    if (cached && !forceRefresh) {
      if (platformTab !== 'store') setApps(cached)
      if (fetchKey === 'all') setAllInstalls(cached)
      setLoading(false)
      setFetchErr(null)
      return
    }
    setLoading(true)
    setFetchErr(null)
    fetch(`/.netlify/functions/installs-list?platform=${fetchKey}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setFetchErr(d.error)
        } else {
          const list = d.apps || []
          _appsCache[fetchKey] = list
          if (platformTab !== 'store') setApps(list)
          if (fetchKey === 'all') setAllInstalls(list)
        }
      })
      .catch(e => setFetchErr(e.message))
      .finally(() => setLoading(false))
  }, [platformTab])

  useEffect(() => { loadApps() }, [loadApps])

  // Close panels on Escape
  useEffect(() => {
    const handler = e => {
      if (e.key !== 'Escape') return
      if (selectedStore) setSelectedStore(null)
      else if (selectedApp) setSelectedApp(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedApp, selectedStore])

  const switchTab = (tab) => {
    if (tab === platformTab) return
    setPlatformTab(tab)
    setSelectedApp(null)
    setSelectedStore(null)
    setRowState({})
    setRowData({})
  }

  const syncApp = useCallback(async (app) => {
    setRowState(s => ({ ...s, [app.recordId]: 'syncing' }))
    try {
      const data = await syncOne(app.recordId, app.storeId)
      if (data.error) {
        setRowData(s => ({ ...s, [app.recordId]: { error: data.error } }))
        setRowState(s => ({ ...s, [app.recordId]: 'error' }))
      } else {
        setRowData(s => ({ ...s, [app.recordId]: { installs: data.installs } }))
        setRowState(s => ({ ...s, [app.recordId]: 'done' }))
      }
    } catch (e) {
      setRowData(s => ({ ...s, [app.recordId]: { error: e.message } }))
      setRowState(s => ({ ...s, [app.recordId]: 'error' }))
    }
  }, [])

  const isUpdatedToday = (app) => {
    const ts = rowData[app.recordId]?.installs != null ? null : app.lastUpdated
    if (!ts) return false
    const d = new Date(ts)
    const now = new Date()
    return d.getFullYear() === now.getFullYear()
        && d.getMonth()    === now.getMonth()
        && d.getDate()     === now.getDate()
  }

  const syncAll = async () => {
    const toSync = apps.filter(a => a.storeId)
    if (!toSync.length) return
    stopRef.current = false
    setSyncingAll(true)
    for (let i = 0; i < toSync.length; i++) {
      if (stopRef.current) break
      await syncApp(toSync[i])
      if (i < toSync.length - 1 && !stopRef.current) await delay(DELAY_MS)
    }
    setSyncingAll(false)
  }

  const syncErrors = async () => {
    const toSync = apps.filter(a => a.storeId && rowState[a.recordId] === 'error')
    if (!toSync.length) return
    stopRef.current = false
    setSyncingAll(true)
    for (let i = 0; i < toSync.length; i++) {
      if (stopRef.current) break
      await syncApp(toSync[i])
      if (i < toSync.length - 1 && !stopRef.current) await delay(DELAY_MS)
    }
    setSyncingAll(false)
  }

  const stopAll = () => { stopRef.current = true; setSyncingAll(false) }

  const appsWithStore = apps.filter(a => a.storeId).length
  const done          = Object.values(rowState).filter(s => s === 'done').length
  const errors        = Object.values(rowState).filter(s => s === 'error').length

  const runTest = async () => {
    const pkg = testId.trim()
    if (!pkg) return
    setTestState('loading')
    setTestResult(null)
    const res = await fetch('/.netlify/functions/installs-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: 'TEST', storeId: pkg }),
    })
    const text = await res.text()
    try { setTestResult(JSON.parse(text)) }
    catch { setTestResult({ error: `HTTP ${res.status}: ${text.slice(0, 200)}` }) }
    setTestState('done')
  }

  const showTotal   = platformTab === 'all'
  const showAndroid = platformTab === 'android'
  const showStore   = platformTab === 'store'

  return (
    <div style={{ padding: '24px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>App Installs</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>
            Nhấn vào app để xem chi tiết · Delay 5s/app · Ghi vào Lark
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Test toggle */}
          <button
            onClick={() => setShowTest(v => !v)}
            style={{
              padding: '8px 14px', borderRadius: 8,
              border: showTest ? '1px solid #0d9488' : '1px solid #e2e8f0',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: showTest ? '#f0fdf4' : '#fff',
              color: showTest ? '#0d9488' : '#475569',
            }}
          >🛠️ Test</button>

          {/* Bulk import — Android & iOS only */}
          {!showTotal && !showStore && (
            <button
              onClick={() => setShowImport(true)}
              disabled={syncingAll}
              title="Import installs từ CSV (chỉ ghi app chưa có data)"
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: '#fff', color: '#475569',
                opacity: syncingAll ? 0.45 : 1,
              }}
            >📥 Import CSV</button>
          )}

          {/* Progress indicators */}
          {(done > 0 || errors > 0) && (
            <span style={{ fontSize: 12, color: '#64748b', padding: '0 2px' }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>{done}</span> ✓
              {errors > 0 && <> · <span style={{ color: '#ef4444', fontWeight: 700 }}>{errors}</span> ✗</>}
            </span>
          )}

          <button
            onClick={() => loadApps(true)}
            disabled={loading || syncingAll}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, background: '#fff', color: '#475569',
              opacity: loading || syncingAll ? 0.45 : 1 }}
          >↻ Tải lại</button>

          {/* Sync Errors + Sync All — Android only */}
          {showAndroid && (
            syncingAll
              ? <button onClick={stopAll}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, background: '#ef4444', color: '#fff' }}>
                  ■ Dừng
                </button>
              : <>
                  <button onClick={syncErrors} disabled={loading || !!fetchErr || !errors}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: errors ? 'pointer' : 'default',
                      fontSize: 13, fontWeight: 700, background: errors ? '#fef2f2' : '#f8fafc', color: errors ? '#dc2626' : '#cbd5e1',
                      opacity: loading || fetchErr ? 0.45 : 1 }}>
                    ↻ Sync Lỗi{errors > 0 ? ` (${errors})` : ''}
                  </button>
                  <button onClick={syncAll} disabled={loading || !!fetchErr || !appsWithStore}
                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, background: '#0d9488', color: '#fff',
                      opacity: loading || fetchErr || !appsWithStore ? 0.45 : 1 }}>
                    ▶ Sync All ({appsWithStore})
                  </button>
                </>
          )}
        </div>
      </div>

      {/* ── Platform sub-tabs ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
        {PLATFORM_TABS.map(({ key, label }) => {
          const active = platformTab === key
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? '#0d9488' : '#94a3b8',
                borderBottom: active ? '2px solid #0d9488' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#475569' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#94a3b8' }}
            >{label}</button>
          )
        })}
      </div>

      {/* ── Test Panel ─────────────────────────────────────────────────────── */}
      {showTest && (
        <div style={{ marginBottom: 20, padding: '16px', background: '#f8fafc',
          border: '1px solid #e2e8f0', borderRadius: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.07em' }}>Test package name</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={testId}
              onChange={e => setTestId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runTest()}
              placeholder="vd: com.whatsapp hoặc 6738460983 (iOS)"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                fontSize: 13, fontFamily: 'monospace', outline: 'none', background: '#fff' }}
            />
            <button
              onClick={runTest}
              disabled={testState === 'loading' || !testId.trim()}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, background: '#0d9488', color: '#fff',
                opacity: testState === 'loading' ? 0.5 : 1 }}
            >
              {testState === 'loading' ? '…' : 'Test'}
            </button>
          </div>
          <TestResult result={testResult} />
        </div>
      )}

      {fetchErr && (
        <div style={{ padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
          ⚠ {fetchErr}
        </div>
      )}

      {loading && <p style={{ fontSize: 13, color: '#94a3b8' }}>Đang tải…</p>}

      {/* ── Store summary view ─────────────────────────────────────────────── */}
      {!loading && !fetchErr && showStore && storeGroups && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {['Store Account', 'Apps', 'Android', 'iOS', 'Total Installs'].map((label, i) => (
                  <th key={label} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {storeGroups.map((g, idx) => (
                <tr key={g.name}
                  onClick={() => setSelectedStore(g.name)}
                  style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `hsl(${(idx * 47) % 360}, 55%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: `hsl(${(idx * 47) % 360}, 55%, 35%)` }}>{(g.name[0] || '?').toUpperCase()}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{g.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontWeight: 500 }}>{g.appCount}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#34a853', fontSize: 13 }}>
                    {g.androidInstalls > 0 ? fmtCompact(g.androidInstalls) : <span style={{ color: '#e2e8f0' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0071e3', fontSize: 13 }}>
                    {g.iosInstalls > 0 ? fmtCompact(g.iosInstalls) : <span style={{ color: '#e2e8f0' }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: g.totalInstalls > 0 ? '#0d9488' : '#e2e8f0', fontSize: 14 }}>
                    {fmtCompact(g.totalInstalls)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {!loading && !fetchErr && !showStore && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {[
                  { label: 'App',      key: 'alpId',       align: 'left'  },
                  { label: 'HN ID',    key: 'hnId',        align: 'left'  },
                  { label: 'Store ID', key: null,          align: 'left'  },
                  { label: 'App Name', key: 'appName',     align: 'left'  },
                  ...(showTotal ? [{ label: 'Platform', key: 'platform', align: 'left' }] : []),
                  { label: 'Installs', key: 'installs',    align: 'right' },
                  { label: 'Cập nhật', key: 'lastUpdated', align: 'right' },
                  { label: '',         key: null,          align: 'right' },
                ].map(({ label, key, align }) => {
                  const active = sortKey === key && key !== null
                  const sortable = key !== null
                  return (
                    <th key={label}
                      onClick={sortable ? () => toggleSort(key) : undefined}
                      style={{
                        padding: '10px 16px', textAlign: align,
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                        whiteSpace: 'nowrap', userSelect: 'none',
                        cursor: sortable ? 'pointer' : 'default',
                        color: active ? '#0d9488' : '#94a3b8',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { if (sortable && !active) e.currentTarget.style.color = '#64748b' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#94a3b8' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                        {label}
                        {sortable && (
                          <span style={{ fontSize: 10, opacity: active ? 1 : 0.35, color: active ? '#0d9488' : '#94a3b8' }}>
                            {active ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedApps.map((app) => {
                const st = rowState[app.recordId] || 'idle'
                const data = rowData[app.recordId]
                const currentInstalls   = data?.installs ?? app.installs
                const currentLastUpdate = st === 'done' ? Date.now() : app.lastUpdated
                const isToday    = isUpdatedToday(app)
                const isSelected = selectedApp?.recordId === app.recordId
                const platform   = app.platform || 'android'
                const isIos      = platform === 'ios'

                return (
                  <tr
                    key={app.recordId}
                    onClick={() => setSelectedApp(app)}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      background: isSelected ? '#f0fdfa' : st === 'syncing' ? '#f0fdfa' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f0fdfa' : st === 'syncing' ? '#f0fdfa' : 'transparent' }}
                  >
                    {/* App (Alp ID + icon) */}
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                          background: app.storeId ? appIconStyle(platform) : '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: app.storeId ? '#fff' : '#94a3b8' }}>A</span>
                        </div>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {app.alpId || '—'}
                        </span>
                      </div>
                    </td>

                    {/* HN ID */}
                    <td style={{ padding: '11px 16px', color: '#64748b', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {app.hnId || '—'}
                    </td>

                    {/* Store ID */}
                    <td style={{ padding: '11px 16px', maxWidth: 260 }}>
                      {app.storeId
                        ? <code style={{ fontSize: 11, color: '#475569', background: '#f1f5f9', padding: '2px 7px', borderRadius: 5, fontFamily: 'monospace', display: 'inline-block', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            {app.storeId}
                          </code>
                        : <span style={{ color: '#e2e8f0', fontSize: 12 }}>—</span>
                      }
                    </td>

                    {/* App Name */}
                    <td style={{ padding: '11px 16px', color: '#475569', fontSize: 12, maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.appName || <span style={{ color: '#e2e8f0' }}>—</span>}
                      </span>
                    </td>

                    {/* Platform badge — Total tab only */}
                    {showTotal && (
                      <td style={{ padding: '11px 16px' }}>
                        <PlatformBadge platform={platform} />
                      </td>
                    )}

                    {/* Installs */}
                    <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {st === 'syncing'
                        ? <span style={{ fontSize: 14, color: '#0d9488' }}>⟳</span>
                        : st === 'error'
                          ? <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>✗ Lỗi</span>
                          : <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
                              color: st === 'done' ? '#0d9488' : currentInstalls != null ? '#1e293b' : '#d1d5db' }}>
                              {fmt(currentInstalls)}
                            </span>
                      }
                    </td>

                    {/* Last Updated */}
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11,
                      color: isToday ? '#0d9488' : '#94a3b8', whiteSpace: 'nowrap', fontWeight: isToday ? 600 : 400 }}>
                      {currentLastUpdate
                        ? new Date(currentLastUpdate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>

                    {/* Sync button */}
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      {app.storeId && !isIos && (
                        <button
                          onClick={e => { e.stopPropagation(); syncApp(app) }}
                          disabled={st === 'syncing' || syncingAll}
                          style={{
                            padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, transition: 'all 0.15s', whiteSpace: 'nowrap',
                            background: st === 'done' ? '#dcfce7' : st === 'error' ? '#fee2e2' : isIos ? '#eff6ff' : '#0d9488',
                            color: st === 'done' ? '#16a34a' : st === 'error' ? '#dc2626' : isIos ? '#0071e3' : '#fff',
                            opacity: st === 'syncing' || syncingAll ? 0.5 : 1,
                          }}
                        >
                          {st === 'syncing' ? '…' : st === 'done' ? '✓' : st === 'error' ? '↻' : 'sync'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !fetchErr && !showStore && (
        <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12 }}>
          {apps.length} apps
          {appsWithStore > 0 && ` · ${appsWithStore} có Store ID`}
          {showAndroid && appsWithStore > 0 && ` · ~${Math.ceil(appsWithStore * DELAY_MS / 60000)} phút khi Sync All`}
        </p>
      )}
      {!loading && !fetchErr && showStore && storeGroups && (
        <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 12 }}>
          {storeGroups.length} store accounts · {storeGroups.reduce((s, g) => s + g.appCount, 0)} apps · tổng {fmtCompact(storeGroups.reduce((s, g) => s + g.totalInstalls, 0))} installs
        </p>
      )}

      {/* ── Detail Panel ───────────────────────────────────────────────────── */}
      {selectedApp && (
        <AppDetailPanel
          app={selectedApp}
          rowState={rowState}
          rowData={rowData}
          syncingAll={syncingAll}
          onSync={syncApp}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {/* ── CSV Import Modal ────────────────────────────────────────────────── */}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            delete _appsCache[platformTab]   // bust current tab cache after import
            loadApps(true)
          }}
        />
      )}

      {/* ── Store Account Sidebar ──────────────────────────────────────────── */}
      {selectedStore && (
        <StoreAccountSidebar
          account={selectedStore}
          apps={storeApps}
          appsOverride={selectedStore === 'Khác'
            ? storeApps.filter(a => {
                if (a.storeAccount && a.storeAccount !== '--') return false
                const entry = (allInstalls || []).find(i => i.hnId?.toLowerCase() === a.hnId?.toLowerCase())
                return entry?.installs != null
              })
            : undefined}
          monet={{}}
          onClose={() => setSelectedStore(null)}
          onSelectApp={null}
        />
      )}
    </div>
  )
}
