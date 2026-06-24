import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getActivities, updateActivity, updateRelease, deleteRelease } from '../lib/lark'
import { addEvent } from '../lib/activityHistory'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { PlatformBadge, RolloutBadge } from '../pages/Dashboard'
import StatusBadge from './StatusBadge'
import { AppStatusBadge } from '../pages/Apps'
import { FEATURES, REVIEWER_OPTIONS, DEFAULT_REVIEWER, DEFAULT_STATUS } from '../lib/features'
import StoreAccountSidebar from './StoreAccountSidebar'

const STATUS_OPTS   = ['', 'Checked', 'Updated', 'Pending Review', 'Checking', 'New']
const ROLLOUT_OPTS  = ['--', '5%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '99%', '100%']

// ─── Timeline ────────────────────────────────────────────────────────────────

const MILESTONES = [
  { key: 'figmaStart',  label: 'Figma Start',  color: '#a78bfa' },
  { key: 'figmaEnd',    label: 'Figma End',     color: '#7c3aed' },
  { key: 'devStart',    label: 'Dev Start',     color: '#60a5fa' },
  { key: 'testStart',   label: 'Test Start',    color: '#34d399' },
  { key: 'liveFullAds', label: 'Live Full Ads', color: '#fb923c' },
  { key: 'liveIap',     label: 'Live iAP',      color: '#f43f5e' },
]

function VerticalTimeline({ timeline }) {
  const nodes = MILESTONES.map(m => ({ ...m, date: timeline?.[m.key] || '' }))
  return (
    <div className="relative pl-8 space-y-0">
      {nodes.map((node, i) => {
        const isLast = i === nodes.length - 1
        const isDone = !!node.date
        return (
          <div key={node.key} className="relative flex items-start gap-4 pb-6">
            {!isLast && (
              <div className="absolute left-0 top-5 bottom-0 w-px" style={{ background: '#e2e8f0', marginLeft: '-1px' }} />
            )}
            <div className="absolute -left-2 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{ background: isDone ? node.color : '#fff', borderColor: isDone ? node.color : '#cbd5e1', zIndex: 1 }}>
              {isDone && <span className="text-white" style={{ fontSize: 8 }}>✓</span>}
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium" style={{ color: '#1e293b' }}>{node.label}</p>
              {isDone
                ? <p className="text-xs font-mono mt-0.5" style={{ color: node.color }}>{node.date}</p>
                : <p className="text-xs mt-0.5" style={{ color: '#cbd5e1' }}>—</p>
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Activities ───────────────────────────────────────────────────────────────

const LOCAL_NOTI_STYLES = {
  'LIVE':          { bg: '#d1fae5', color: '#065f46' },
  'NEW':           { bg: '#f1f5f9', color: '#475569' },
  'ABANDONED':     { bg: '#fee2e2', color: '#991b1b' },
  'READY FOR DEV': { bg: '#dbeafe', color: '#1e40af' },
  'REQUIRED':      { bg: '#fef3c7', color: '#92400e' },
}

function LocalNotiBadge({ value }) {
  if (!value || value === '--') return <span style={{ color: '#cbd5e1' }}>—</span>
  const s = LOCAL_NOTI_STYLES[value.toUpperCase()] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: s.bg, color: s.color }}>{value}</span>
  )
}

function SelectBadge({ value }) {
  if (!value || value === '--') return <span className="text-xs" style={{ color: '#cbd5e1' }}>—</span>
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#f0fdf4', color: '#0d9488' }}>{value}</span>
  )
}

function IapBadge({ value, isIos }) {
  if (value) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#d1fae5', color: '#065f46' }}>Live</span>
  )
  if (isIos) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#fee2e2', color: '#dc2626' }}>No</span>
  )
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#f1f5f9', color: '#94a3b8' }}>No</span>
  )
}

const COLLAPSED_MAX = 3

function ReleaseEventSection({ label, releases, dot, prefix }) {
  const [expanded, setExpanded] = useState(false)
  if (releases.length === 0) return null
  const shown = expanded ? releases : releases.slice(0, COLLAPSED_MAX)
  const hidden = releases.length - COLLAPSED_MAX
  return (
    <div className="mt-4 pt-4 border-t border-surface-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>{label}</p>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(0,0,0,0.06)', color: '#94a3b8' }}>{releases.length}</span>
      </div>
      <div className="relative pl-8 space-y-0">
        {shown.map((r, i) => (
          <div key={r.id} className="relative flex items-start gap-4 pb-5">
            {i < shown.length - 1 && (
              <div className="absolute left-0 top-5 bottom-0 w-px" style={{ background: '#e2e8f0', marginLeft: '-1px' }} />
            )}
            <div className="absolute -left-2 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              style={{ background: dot.bg, borderColor: dot.border, zIndex: 1 }}>
              <span style={{ fontSize: 7 }}>{dot.icon}</span>
            </div>
            <div className="ml-4">
              <p className="text-xs font-medium" style={{ color: '#1e293b' }}>{prefix} #{i + 1}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: dot.color }}>{r.releaseDate || '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{r.version}</p>
            </div>
          </div>
        ))}
      </div>
      {hidden > 0 && !expanded && (
        <button onClick={() => setExpanded(true)}
          className="text-xs mt-1 pl-8 hover:underline"
          style={{ color: '#94a3b8' }}>
          +{hidden} more
        </button>
      )}
      {expanded && releases.length > COLLAPSED_MAX && (
        <button onClick={() => setExpanded(false)}
          className="text-xs mt-1 pl-8 hover:underline"
          style={{ color: '#94a3b8' }}>
          Thu gọn
        </button>
      )}
    </div>
  )
}

const LINK_FIELDS = ['linkRequest', 'linkRequest2', 'linkRequest3', 'linkRequest4']

const IS_URL = v => /^https?:\/\//i.test(v)

function LinkRow({ index, value, dateValue, saving, onSave }) {
  const [input, setInput]     = useState(value || '')
  const [date, setDate]       = useState(dateValue || '')
  const [editing, setEditing] = useState(false)

  useEffect(() => { setInput(value || '') }, [value])
  useEffect(() => { setDate(dateValue || '') }, [dateValue])

  const handleSave = async () => {
    const today = new Date().toISOString().slice(0, 10)
    await onSave(input.trim(), date || today)
    setEditing(false)
  }

  return (
    <div className={`px-4 py-3 ${index > 0 ? 'border-t border-surface-100' : ''}`}>
      {index > 0 && <p className="text-xs mb-1.5 font-medium" style={{ color: '#94a3b8' }}>#{index + 1}</p>}
      {editing ? (
        <div className="space-y-2">
          <textarea
            className="input text-xs w-full resize-none"
            placeholder="Nhập link hoặc nội dung..."
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && handleSave()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input type="date" className="input text-xs flex-1"
              value={date || new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)} />
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
              style={{ background: '#0d9488' }}>{saving ? '...' : 'Lưu'}</button>
            <button onClick={() => { setEditing(false); setInput(value || ''); setDate(dateValue || '') }}
              className="px-3 py-1.5 rounded-lg text-xs border border-surface-200">Huỷ</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {value
              ? IS_URL(value)
                ? <a href={value} target="_blank" rel="noopener noreferrer"
                    className="text-xs truncate block hover:underline" style={{ color: '#0d9488' }}>{value}</a>
                : <p className="text-xs break-words whitespace-pre-wrap" style={{ color: '#334155' }}>{value}</p>
              : <span className="text-xs" style={{ color: '#cbd5e1' }}>Chưa có nội dung</span>
            }
            {dateValue && (
              <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{dateValue}</p>
            )}
          </div>
          <button onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded border border-surface-200 hover:bg-surface-50 shrink-0"
            style={{ color: '#64748b' }}>{value ? 'Sửa' : '+ Thêm'}</button>
        </div>
      )}
    </div>
  )
}

function LinkRequestsBlock({ activity, saving, onSaveLink, initCount }) {
  const [count, setCount] = useState(initCount)
  return (
    <div className="rounded-xl border border-surface-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-100">
        <p className="text-xs font-medium" style={{ color: '#64748b' }}>Request Update</p>
        {count < LINK_FIELDS.length && (
          <button
            onClick={() => setCount(c => c + 1)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
            style={{ background: '#f0fdf4', color: '#0d9488' }}
            title="Thêm link"
          >+</button>
        )}
      </div>
      {LINK_FIELDS.slice(0, count).map((field, i) => (
        <LinkRow
          key={field}
          index={i}
          value={activity[field]}
          dateValue={activity.lastedRequest}
          saving={saving}
          onSave={(val, date) => onSaveLink(field, val, date)}
        />
      ))}
    </div>
  )
}

function ActivitiesTab({ app, initialActivity, timeline, latestRelease }) {
  const [activity, setActivity] = useState(initialActivity || null)
  const [loading, setLoading]   = useState(!initialActivity)
  const [saving, setSaving]     = useState(false)

  // Helpers to persist crash-on date in localStorage (no Lark field needed)
  const crashDateKey = activity?.id ? `fixCrashDate_${activity.id}` : null
  const getCrashDate = () => (crashDateKey ? localStorage.getItem(crashDateKey) || '' : '')
  const setCrashDate = (d) => { if (crashDateKey) { if (d) localStorage.setItem(crashDateKey, d); else localStorage.removeItem(crashDateKey) } }

  // Auto turn off toggles only if the latest release note covers the request date
  useEffect(() => {
    if (!activity) return
    // Init crashDate in localStorage if fixCrashes is ON but no date recorded
    // (e.g. toggled from another device or set directly in Lark)
    if (activity.fixCrashes && !getCrashDate()) {
      setCrashDate(new Date().toISOString().slice(0, 10))
    }
    if (!latestRelease?.releaseNote || !latestRelease?.releaseDate) return
    const note        = latestRelease.releaseNote.toLowerCase()
    const releaseDate = latestRelease.releaseDate   // "YYYY-MM-DD"
    const reqDate     = activity.lastedRequest || '' // "YYYY-MM-DD" or ''
    const crashDate   = getCrashDate()              // "YYYY-MM-DD" or ''
    const patch = {}
    // Only auto-off crash if we have a recorded crashDate AND release covers it
    if (activity.fixCrashes && crashDate && releaseDate >= crashDate && (note.includes('fix crash') || note.includes('fix bug'))) {
      patch.fixCrashes = false
      setCrashDate(null)
    }
    if (activity.requestUpdate && reqDate && releaseDate >= reqDate && (note.includes('update request') || note.includes('request update')))
      patch.requestUpdate = false
    if (Object.keys(patch).length === 0) return
    updateActivity(activity.id, patch)
      .then(() => setActivity(a => ({ ...a, ...patch })))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestRelease?.id])   // only re-run when the latest release changes, NOT on toggle

  useEffect(() => {
    if (initialActivity !== undefined) {
      setActivity(initialActivity)
      setLoading(false)
      return
    }
    getActivities()
      .then(res => {
        const records = res.records || []
        const match = records.find(r =>
          (app.hnId  && r.hnId?.toLowerCase()  === app.hnId?.toLowerCase()) ||
          (app.alpId && r.alpId?.toLowerCase() === app.alpId?.toLowerCase())
        )
        setActivity(match || null)
      })
      .catch(() => setActivity(null))
      .finally(() => setLoading(false))
  }, [app, initialActivity])

  const handleToggleFixCrashes = async () => {
    if (!activity) return
    setSaving(true)
    try {
      const newVal = !activity.fixCrashes
      await updateActivity(activity.id, { fixCrashes: newVal })
      // Track date when crash is turned ON (used for auto-off date guard)
      setCrashDate(newVal ? new Date().toISOString().slice(0, 10) : null)
      setActivity(a => ({ ...a, fixCrashes: newVal }))
    } finally { setSaving(false) }
  }

  const handleToggleRequest = async () => {
    if (!activity) return
    setSaving(true)
    try {
      const newVal = !activity.requestUpdate
      const today  = new Date().toISOString().slice(0, 10)
      const lastedRequest = newVal ? today : null
      await updateActivity(activity.id, { requestUpdate: newVal, lastedRequest })
      addEvent({
        appId:    app.alpId || app.hnId,
        appName:  app.alpId || app.hnId,
        field:    'requestUpdate',
        oldValue: activity.requestUpdate,
        newValue: newVal,
      })
      setActivity(a => ({ ...a, requestUpdate: newVal, lastedRequest }))
    } finally { setSaving(false) }
  }

  const handleSaveLink = async (field, val, date) => {
    if (!activity) return
    setSaving(true)
    try {
      const patch = { [field]: val, lastedRequest: date || null }
      await updateActivity(activity.id, patch)
      setActivity(a => ({ ...a, ...patch }))
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-xs text-center py-10" style={{ color: '#94a3b8' }}>Đang tải...</p>
  if (!activity) return <p className="text-xs text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu Activities</p>

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Card 1: Feature status ── */}
      <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Config</p>
        </div>
        {[
          { label: 'Show Intro',  value: activity.show,      type: 'select' },
          { label: 'Config Intro', value: activity.config,    type: 'select' },
          { label: 'Local Noti',  value: activity.localNoti, type: 'noti'   },
          { label: 'iAP',         value: activity.iap || !!timeline?.liveIap, type: 'iap' },
        ].map(({ label, value, type }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{label}</span>
            {type === 'noti' ? <LocalNotiBadge value={value} /> : type === 'iap' ? <IapBadge value={value} isIos={!(app.platform || '').toLowerCase().includes('android')} /> : <SelectBadge value={value} />}
          </div>
        ))}
      </div>

      {/* ── Card 2: App flags ── */}
      <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Flags</p>
        </div>
        {[
          { label: 'Ad 2',            value: app.ad2,           color: '#6366f1', subtle: false },
          { label: 'Native no media', value: app.nativeNoMedia, color: '#f59e0b', subtle: false },
          { label: 'Freezed',         value: app.freezed,       color: '#ef4444', subtle: true  },
        ].map(({ label, value, color, subtle }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{label}</span>
            {value
              ? <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontWeight: 600 }}>Yes</span>
              : subtle
                ? <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#f1f5f9', color: '#cbd5e1', fontWeight: 400 }}>No</span>
                : <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 500 }}>No</span>
            }
          </div>
        ))}
      </div>

      {/* ── Card 3: Toggles ── */}
      <div style={{ borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Status</p>
        </div>

        {/* Fix Crashes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #f8fafc', gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#475569', margin: 0 }}>Fix Crashes</p>
            {activity.fixCrashes && <p style={{ fontSize: 11, color: '#ef4444', margin: '2px 0 0', fontWeight: 500 }}>🔴 Đang có crash cần fix</p>}
          </div>
          <button onClick={handleToggleFixCrashes} disabled={saving}
            style={{ position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, opacity: saving ? 0.5 : 1, background: activity.fixCrashes ? '#ef4444' : '#e2e8f0', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', left: activity.fixCrashes ? 19 : 3 }} />
          </button>
        </div>

        {/* Request Update */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#475569', margin: 0 }}>Request Update</p>
            {activity.requestUpdate && (() => {
              const days = activity.lastedRequest ? Math.round((Date.now() - new Date(activity.lastedRequest)) / 86400000) : null
              return (
                <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0', fontWeight: 500 }}>
                  ⚡ Đang có request update
                  {days !== null && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 6, background: '#fef3c7', color: '#b45309', fontSize: 10, fontWeight: 600 }}>{days} ngày trước</span>}
                </p>
              )
            })()}
          </div>
          <button onClick={handleToggleRequest} disabled={saving}
            style={{ position: 'relative', width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, opacity: saving ? 0.5 : 1, background: activity.requestUpdate ? '#0d9488' : '#e2e8f0', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', left: activity.requestUpdate ? 19 : 3 }} />
          </button>
        </div>
      </div>

      {/* ── Link Requests ── */}
      {(() => {
        const initCount = Math.max(1, LINK_FIELDS.reduce((acc, f, i) => activity[f] ? i + 1 : acc, 1))
        return <LinkRequestsBlock activity={activity} saving={saving} onSaveLink={handleSaveLink} initCount={initCount} />
      })()}
    </div>
  )
}

// ─── Monet Tab ────────────────────────────────────────────────────────────────

function MonetTab({ data }) {
  const [hovered, setHovered] = React.useState(null) // { i, x, y, cr, install, label }

  if (!data || !data.months || Object.keys(data.months).length === 0) {
    return <p className="text-xs text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu Monet</p>
  }

  const sorted = Object.entries(data.months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, vals]) => ({
      ym,
      label: `${ym.slice(4, 6)}/${ym.slice(0, 4)}`,
      install: vals.install ?? null,
      cr: vals.cr != null ? vals.cr * 100 : null,
    }))

  // Simple SVG line chart
  const W = 480, H = 140, PAD = { t: 16, r: 20, b: 36, l: 52 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const n = sorted.length
  const BAR_W = Math.min(32, Math.max(6, innerW / Math.max(n, 1) * 0.4))

  const crVals = sorted.map(d => d.cr).filter(v => v !== null)
  const crMax = crVals.length ? Math.ceil(Math.max(...crVals) * 1.25) : 100
  const crMin = 0

  // Distribute evenly across chart width regardless of date gaps
  const scaleX = i => PAD.l + (n < 2 ? innerW / 2 : (i / (n - 1)) * innerW)
  const scaleY = v => PAD.t + innerH - ((v - crMin) / (crMax - crMin || 1)) * innerH

  const crPoints = sorted
    .map((d, i) => d.cr !== null ? `${scaleX(i)},${scaleY(d.cr)}` : null)
    .filter(Boolean)
  const crPath = crPoints.length > 1 ? `M${crPoints.join('L')}` : null

  // Install max for secondary axis
  const instVals = sorted.map(d => d.install).filter(v => v !== null)
  const instMax = instVals.length ? Math.max(...instVals) * 1.2 : 1

  const scaleYInst = v => PAD.t + innerH - (v / (instMax || 1)) * innerH

  const instPoints = sorted
    .map((d, i) => d.install !== null ? `${scaleX(i)},${scaleYInst(d.install)}` : null)
    .filter(Boolean)
  const instPath = instPoints.length > 1 ? `M${instPoints.join('L')}` : null

  return (
    <div className="p-5 space-y-4">
      {/* Priority */}
      {data.priority && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#94a3b8' }}>Priority</span>
          <PriorityBadge value={data.priority} />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-surface-100 overflow-hidden p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: '#64748b' }}>Install &amp; CR theo tháng</p>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 280, maxWidth: W }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const y = PAD.t + innerH * (1 - t)
              return (
                <line key={t} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                  stroke="#f1f5f9" strokeWidth="1" />
              )
            })}

            {/* Install bars */}
            {sorted.map((d, i) => {
              if (d.install === null) return null
              const bw = BAR_W
              const x = scaleX(i) - bw / 2
              const bh = (d.install / (instMax || 1)) * innerH
              const y = PAD.t + innerH - bh
              return (
                <rect key={i} x={x} y={y} width={bw} height={bh}
                  fill="#bfdbfe" rx="2" opacity="0.7" />
              )
            })}

            {/* CR line */}
            {crPath && (
              <path d={crPath} fill="none" stroke="#0d9488" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {/* Inst line */}
            {instPath && (
              <path d={instPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,2" strokeLinejoin="round" strokeLinecap="round" opacity="0.5" />
            )}

            {/* CR dots */}
            {sorted.map((d, i) => {
              if (d.cr === null) return null
              const cx = scaleX(i), cy = scaleY(d.cr)
              const isHov = hovered?.i === i
              return (
                <g key={i}
                  onMouseEnter={() => setHovered({ i, x: cx, y: cy, cr: d.cr, install: d.install, label: d.label })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}>
                  {/* hit area */}
                  <circle cx={cx} cy={cy} r="12" fill="transparent" />
                  {/* pulse ring when hovered */}
                  {isHov && <circle cx={cx} cy={cy} r="8" fill="#0d9488" opacity="0.15" />}
                  <circle cx={cx} cy={cy} r={isHov ? 5 : 3.5}
                    fill="#0d9488" stroke="white" strokeWidth="1.5"
                    style={{ transition: 'r 0.15s ease' }} />
                </g>
              )
            })}

            {/* Tooltip */}
            {hovered && (() => {
              const TW = 110, TH = hovered.install !== null ? 54 : 42
              // horizontal: clamp within PAD.l … W-PAD.r
              const tx = Math.min(Math.max(hovered.x - TW / 2, PAD.l), W - PAD.r - TW)
              // vertical: show above if room, else below
              const aboveY = hovered.y - TH - 12
              const ty = aboveY >= PAD.t ? aboveY : hovered.y + 14
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={tx} y={ty} width={TW} height={TH} rx="7"
                    fill="#1e293b" opacity="0.93" />
                  <text x={tx + TW / 2} y={ty + 13} textAnchor="middle" fontSize="9" fill="#64748b">{hovered.label}</text>
                  <text x={tx + TW / 2} y={ty + 30} textAnchor="middle" fontSize="14" fontWeight="700" fill="#34d399">
                    {parseFloat(hovered.cr.toFixed(2))}%
                  </text>
                  {hovered.install !== null && (
                    <text x={tx + TW / 2} y={ty + 46} textAnchor="middle" fontSize="9" fill="#93c5fd">
                      {hovered.install.toLocaleString()} installs
                    </text>
                  )}
                </g>
              )
            })()}

            {/* X labels */}
            {sorted.map((d, i) => (
              <text key={i} x={scaleX(i)} y={H - 6}
                textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
            ))}

            {/* Y axis CR labels */}
            {[0, 0.5, 1].map(t => {
              const y = PAD.t + innerH * (1 - t)
              const val = (crMin + t * (crMax - crMin)).toFixed(1)
              return (
                <text key={t} x={PAD.l - 4} y={y + 3.5}
                  textAnchor="end" fontSize="9" fill="#94a3b8">{val}%</text>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#bfdbfe' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>Install</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 rounded" style={{ background: '#0d9488' }} />
            <span className="text-xs" style={{ color: '#64748b' }}>CR (%)</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-surface-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: '#64748b' }}>Tháng</th>
              <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#64748b' }}>Install</th>
              <th className="text-right px-4 py-2.5 font-semibold" style={{ color: '#64748b' }}>CR (%)</th>
            </tr>
          </thead>
          <tbody>
            {[...sorted].reverse().map((d, i) => (
              <tr key={d.ym} className={i % 2 === 0 ? '' : ''} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td className="px-4 py-2.5 font-mono font-medium" style={{ color: '#1e293b' }}>{d.label}</td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: '#3b82f6' }}>
                  {d.install !== null ? d.install.toLocaleString() : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono" style={{ color: '#0d9488' }}>
                  {d.cr !== null ? `${parseFloat(d.cr.toFixed(2))}%` : <span style={{ color: '#cbd5e1' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES = {
  'LOW':    { bg: '#f1f5f9', color: '#64748b' },
  'NORMAL': { bg: '#fff7ed', color: '#c2410c' },
  'HIGH':   { bg: '#fce7f3', color: '#be185d' },
  'URGENT': { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

function PriorityBadge({ value }) {
  if (!value) return null
  const key = value.toUpperCase()
  const s = PRIORITY_STYLES[key] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color, border: s.border ? `1px solid ${s.border}` : undefined }}>
      {value}
    </span>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AppDetailModal({ app, onClose }) {
  const { releases, refresh, timelines, activities, monet, apps } = useReleasesStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('activities')
  const [showAccountPanel, setShowAccountPanel] = useState(false)

  const appKey      = app.hnId?.toLowerCase() || app.alpId?.toLowerCase() || ''
  const timeline    = timelines[appKey] || null
  const appActivity = activities[appKey] || null
  const monetData   = monet[app.alpId?.toLowerCase()] || monet[appKey] || null

  // Edit modal
  const [editModal, setEditModal]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal]   = useState(null)
  const [reviewForm, setReviewForm]     = useState({ status: DEFAULT_STATUS, reviewNotes: '', lastCheckedDate: '', reviewer: DEFAULT_REVIEWER })
  const [reviewSaving, setReviewSaving] = useState(false)

  const openEdit = (r) => {
    setEditForm({ version: r.version || '', rollout: r.rollout || '--', releaseDate: r.releaseDate || '', releaseNote: r.releaseNote || '' })
    setEditModal(r)
  }

  const handleDelete = async () => {
    if (!editModal) return
    if (!window.confirm(`Xoá release "${editModal.version || ''}" của ${editModal.appName || editModal.app || ''}?`)) return
    setEditSaving(true)
    try { await deleteRelease(editModal.id); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  const handleEdit = async () => {
    if (!editModal) return
    setEditSaving(true)
    try { await updateRelease(editModal.id, editForm); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  const openReview = (r) => {
    setReviewForm({ status: r.status || DEFAULT_STATUS, reviewNotes: r.reviewNotes || '', lastCheckedDate: r.lastCheckedDate || new Date().toISOString().slice(0, 10), reviewer: r.reviewer || DEFAULT_REVIEWER })
    setReviewModal(r)
  }

  const handleReview = async () => {
    if (!reviewModal) return
    setReviewSaving(true)
    try { await updateRelease(reviewModal.id, reviewForm); setReviewModal(null); refresh() }
    finally { setReviewSaving(false) }
  }


  const appReleases = releases
    .filter(r =>
      (app.hnId  && (r.hnId || '').toLowerCase()  === app.hnId?.toLowerCase()) ||
      (app.alpId && (r.appName || r.app || '').toLowerCase() === app.alpId?.toLowerCase())
    )
    .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))

  const latestRelease = appReleases[0] || null
  const checkedCount  = appReleases.filter(r => r.status === 'Checked' || r.status === 'Updated').length
  const pendingCount  = appReleases.filter(r => !r.status).length

  const hasMonetData = FEATURES.monet && monetData && Object.keys(monetData.months || {}).length > 0
  const docLinks = [
    { label: 'Figma',            text: app.figma,           url: app.figmaUrl },
    { label: 'HN Bug',           text: app.hnBug,           url: app.hnBugUrl },
    { label: 'Ads Script',       text: app.adsScript,       url: app.adsScriptUrl },
    { label: 'iAP Script',       text: app.iapScript,       url: app.iapScriptUrl },
    { label: 'Metadata',         text: app.metadata,        url: app.metadataUrl },
    { label: 'Task/Bug List',    text: app.taskBugList,     url: app.taskBugListUrl },
    { label: 'Local Noti Script',text: app.localNotiScript, url: app.localNotiScriptUrl },
  ].filter(d => d.text || d.url)

  const RIGHT_TABS = [
    { key: 'activities', label: 'Activities' },
    { key: 'releases',   label: `Releases (${appReleases.length})` },
    { key: 'documents',  label: `Documents (${docLinks.length})` },
    ...(FEATURES.monet ? [{ key: 'monet', label: 'Monet', dot: hasMonetData }] : []),
  ]

  const _platformBg = (platform) => (platform || '').toLowerCase().includes('android') ? '#34a853' : '#007aff'
  const _platformLetter = (platform) => (platform || '').toLowerCase().includes('android') ? 'A' : 'i'

  return ReactDOM.createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl flex flex-col overflow-hidden"
        style={{ width: '96vw', maxWidth: 900, height: '92vh', boxShadow: '0 24px 60px rgba(0,0,0,0.24), 0 6px 20px rgba(0,0,0,0.12)' }}>

        {/* Header — gradient band */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px 16px 0 0' }}>
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 shrink-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                style={{ background: _platformBg(app.platform), opacity: app.freezed ? 0.5 : 1 }}>
                {_platformLetter(app.platform)}
              </div>
              {app.freezed && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧊</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base" style={{ color: '#fff' }}>{app.alpId || '—'}</h2>
                <AppStatusBadge status={app.status} />
                {appActivity?.requestUpdate && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(254,243,199,0.15)', color: '#fcd34d', border: '1px solid rgba(252,211,77,0.3)' }}>⚡ Request Update</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <PlatformBadge platform={app.platform} />
                <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{app.hnId || '—'}</span>
                {app.appLinkUrl && (
                  <a href={app.appLinkUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs hover:underline" style={{ color: '#2dd4bf' }}>Store ↗</a>
                )}
                {app.androidStatus && app.platform?.toLowerCase() !== 'ios' && (() => {
                  const s = app.androidStatus.toLowerCase()
                  const color = s.includes('public') ? '#34d399'
                    : s.includes('review') ? '#fcd34d'
                    : s.includes('testing') ? '#60a5fa'
                    : 'rgba(255,255,255,0.4)'
                  return (
                    <span className="group relative inline-flex items-center">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 hidden group-hover:block text-xs whitespace-nowrap pointer-events-none px-1.5 py-0.5 rounded" style={{ background: '#1e293b', color, border: `1px solid ${color}40` }}>{app.androidStatus}</span>
                    </span>
                  )
                })()}
                {app.storeAccount && app.storeAccount !== '--' && (
                  <button
                    onClick={() => setShowAccountPanel(true)}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>by</span> {app.storeAccount}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Stats inline */}
          <div className="hidden sm:flex items-center gap-5 mr-4">
            {[
              { label: 'Releases', value: appReleases.length },
              { label: 'Latest',   value: latestRelease?.version || '—' },
              { label: 'Roll-out', value: latestRelease?.rollout || '—' },
              { label: 'Reviewed', value: checkedCount },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-semibold" style={{ color: '#fff' }}>{value}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="text-xl shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >✕</button>
        </div>

        {/* Body: 2 columns */}
        <div className="flex-1 overflow-hidden flex" style={{ minHeight: 0 }}>

          {/* Left: Timeline */}
          <div className="overflow-auto border-r border-surface-100 shrink-0" style={{ width: 220 }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Timeline</p>
                <button
                  onClick={() => { onClose(); navigate(`/stats?view=calendar&app=${encodeURIComponent((app.alpId || app.hnId || '').toLowerCase())}`) }}
                  style={{ fontSize: 11, color: '#0d9488', background: 'rgba(13,148,136,0.08)', border: 'none', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,148,136,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(13,148,136,0.08)'}
                >
                  📅 Calendar
                </button>
              </div>
              <VerticalTimeline timeline={timeline} />

              <ReleaseEventSection
                label="Update Request"
                releases={appReleases.filter(r => r.releaseNote?.toLowerCase().includes('update request')).slice().reverse()}
                dot={{ bg: '#fef3c7', border: '#fcd34d', icon: '⚡', color: '#d97706' }}
                prefix="Request"
              />
              <ReleaseEventSection
                label="Live Local Noti"
                releases={appReleases.filter(r => r.releaseNote?.toLowerCase().includes('local noti')).slice().reverse()}
                dot={{ bg: '#d1fae5', border: '#6ee7b7', icon: '🔔', color: '#059669' }}
                prefix="Noti"
              />
            </div>
          </div>

          {/* Right: tab Activities / Phát hành */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-surface-100 shrink-0 px-4">
              {RIGHT_TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="text-xs font-medium px-4 py-3 border-b-2 transition-colors flex items-center gap-1.5"
                  style={{
                    borderColor: tab === t.key ? '#0d9488' : 'transparent',
                    color:       tab === t.key ? '#0d9488' : '#94a3b8',
                  }}>
                  {t.label}
                  {t.dot && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: '#3b82f6', marginTop: '-1px' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {tab === 'activities' && <ActivitiesTab app={app} initialActivity={appActivity} timeline={timeline} latestRelease={latestRelease} />}

              {tab === 'monet' && <MonetTab data={monetData} />}

              {tab === 'documents' && (
                <div style={{ padding: '20px 20px' }}>
                  {docLinks.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Chưa có tài liệu nào</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {docLinks.map((doc, i) => {
                        const DOC_ICON = {
                          'Figma':            { icon: '✦', bg: '#ede9fe', color: '#7c3aed' },
                          'HN Bug':           { icon: '⚠', bg: '#fef3c7', color: '#d97706' },
                          'Ads Script':       { icon: '◈', bg: '#dbeafe', color: '#2563eb' },
                          'iAP Script':       { icon: '◈', bg: '#d1fae5', color: '#059669' },
                          'Metadata':         { icon: '≡', bg: '#f1f5f9', color: '#475569' },
                          'Task/Bug List':    { icon: '✓', bg: '#dcfce7', color: '#16a34a' },
                          'Local Noti Script':{ icon: '◈', bg: '#fce7f3', color: '#db2777' },
                        }
                        const meta = DOC_ICON[doc.label] || { icon: '→', bg: '#f1f5f9', color: '#64748b' }
                        const href = doc.url  // only actual URL, never fall back to display text
                        const isLink = !!href

                        const rowStyle = {
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '11px 14px', borderRadius: 10,
                          background: isLink ? '#f8fafc' : '#fafafa',
                          border: `1px solid ${isLink ? '#e2e8f0' : '#f1f5f9'}`,
                          textDecoration: 'none',
                          cursor: isLink ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          opacity: isLink ? 1 : 0.7,
                        }

                        const inner = (
                          <>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8, background: meta.bg, color: meta.color, fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                              {meta.icon}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{doc.label}</div>
                              <div style={{ fontSize: 13, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.text || href}</div>
                            </div>
                            {isLink ? (
                              <span className="doc-arrow" style={{ flexShrink: 0, color: '#cbd5e1', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </span>
                            ) : (
                              <span style={{ flexShrink: 0, fontSize: 11, color: '#cbd5e1' }}>—</span>
                            )}
                          </>
                        )

                        return isLink ? (
                          <a key={doc.label} href={href} target="_blank" rel="noopener noreferrer" style={rowStyle}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,0.10)'; e.currentTarget.querySelector('.doc-arrow').style.color = '#0d9488' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.querySelector('.doc-arrow').style.color = '#cbd5e1' }}>
                            {inner}
                          </a>
                        ) : (
                          <div key={doc.label} style={rowStyle}>{inner}</div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {tab === 'releases' && (
                <div className="p-4 space-y-2">
                  {appActivity?.requestUpdate && (
                    <div className="rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs font-medium"
                      style={{ background: '#fef3c7', color: '#d97706' }}>
                      ⚡ This app has a pending update request
                    </div>
                  )}
                  {appReleases.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>No releases yet</p>
                  ) : appReleases.map(r => (
                    <div key={r.id} className="rounded-xl border border-surface-100 px-4 py-3 hover:border-surface-200 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#334155' }}>{r.version || '—'}</span>
                          <RolloutBadge rollout={r.rollout} />
                          <StatusBadge status={r.status} />
                          <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{r.releaseDate || '—'}</span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => openEdit(r)}
                            className="text-xs px-2 py-1 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors"
                            style={{ color: '#64748b' }}>✏️ Edit</button>
                          <button onClick={() => openReview(r)}
                            className="text-xs px-2 py-1 rounded-lg text-white transition-colors"
                            style={{ background: '#0d9488' }}>✓ Review</button>
                        </div>
                      </div>
                      {r.releaseNote && (
                        <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{r.releaseNote}</p>
                      )}
                      {r.reviewNotes && (
                        <p className="text-xs mt-1 italic" style={{ color: '#94a3b8' }}>Review: {r.reviewNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Edit Release</h3>
                <div className="flex items-center gap-2 mt-1">
                  <PlatformBadge platform={editModal.platform} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>{editModal.appName || editModal.app}</span>
                </div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Version <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="input w-full text-sm" value={editForm.version} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Roll-out</label>
                <select className="input w-full text-sm" value={editForm.rollout} onChange={e => setEditForm(f => ({ ...f, rollout: e.target.value }))}>
                  {ROLLOUT_OPTS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Release Date</label>
              <input type="date" className="input w-full text-sm" value={editForm.releaseDate} onChange={e => setEditForm(f => ({ ...f, releaseDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Release Note</label>
              <textarea className="input w-full text-sm resize-none" rows={3} value={editForm.releaseNote} onChange={e => setEditForm(f => ({ ...f, releaseNote: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={handleDelete} disabled={editSaving} className="px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50" style={{ color: '#ef4444', border: '1px solid #fecaca' }}>
                🗑 Xoá
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 rounded-xl border border-surface-200 text-sm">Cancel</button>
                <button onClick={handleEdit} disabled={editSaving}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: '#0d9488' }}>{editSaving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Review Release</h3>
                <div className="flex items-center gap-2 mt-1">
                  <PlatformBadge platform={reviewModal.platform} />
                  <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{reviewModal.version}</span>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>{reviewModal.releaseDate}</span>
                </div>
              </div>
              <button onClick={() => setReviewModal(null)} style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Status</label>
                <select className="input w-full text-sm" value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Reviewer</label>
                <select className="input w-full text-sm" value={reviewForm.reviewer} onChange={e => setReviewForm(f => ({ ...f, reviewer: e.target.value }))}>
                  {REVIEWER_OPTIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Check Date</label>
              <input type="date" className="input w-full text-sm" value={reviewForm.lastCheckedDate} onChange={e => setReviewForm(f => ({ ...f, lastCheckedDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Review Notes</label>
              <textarea className="input w-full text-sm resize-none" rows={2} value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setReviewModal(null)} className="px-4 py-2 rounded-xl border border-surface-200 text-sm">Cancel</button>
              <button onClick={handleReview} disabled={reviewSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#0d9488' }}>{reviewSaving ? 'Saving...' : 'Save review'}</button>
            </div>
          </div>
        </div>
      )}

      {showAccountPanel && app.storeAccount && app.storeAccount !== '--' && (
        <StoreAccountSidebar
          account={app.storeAccount}
          apps={apps || []}
          monet={monet || {}}
          onClose={() => setShowAccountPanel(false)}
          onSelectApp={a => { setShowAccountPanel(false); navigate(`/apps?app=${a.id}`) }}
        />
      )}
    </div>,
    document.body
  )
}
