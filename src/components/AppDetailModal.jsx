import React, { useEffect, useState } from 'react'
import { updateActivity, updateRelease, deleteRelease } from '../lib/lark'
import { addEvent } from '../lib/activityHistory'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { PlatformBadge, RolloutBadge } from '../pages/Dashboard'
import StatusBadge from './StatusBadge'
import { AppStatusBadge } from '../pages/Apps'

const STATUS_OPTS   = ['', 'Checked', 'Updated', 'Pending Review', 'Checking', 'New']
const ROLLOUT_OPTS  = ['--', '20%', '30%', '40%', '50%', '99%', '100%']

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

function IapBadge({ value }) {
  if (value) return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#d1fae5', color: '#065f46' }}>Live</span>
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

function LinkRow({ index, value, saving, onSave }) {
  const [input, setInput]     = useState(value || '')
  const [editing, setEditing] = useState(false)

  useEffect(() => { setInput(value || '') }, [value])

  const handleSave = async () => { await onSave(input.trim()); setEditing(false) }

  return (
    <div className={`px-4 py-3 ${index > 0 ? 'border-t border-surface-100' : ''}`}>
      {index > 0 && <p className="text-xs mb-1.5 font-medium" style={{ color: '#94a3b8' }}>#{index + 1}</p>}
      {editing ? (
        <div className="flex gap-2">
          <input
            className="input text-xs flex-1"
            placeholder="https://..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button onClick={handleSave} disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ background: '#0d9488' }}>{saving ? '...' : 'Lưu'}</button>
          <button onClick={() => { setEditing(false); setInput(value || '') }}
            className="px-3 py-1.5 rounded-lg text-xs border border-surface-200">Huỷ</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {value
            ? <a href={value} target="_blank" rel="noopener noreferrer"
                className="text-xs truncate flex-1 hover:underline" style={{ color: '#0d9488' }}>{value}</a>
            : <span className="text-xs flex-1" style={{ color: '#cbd5e1' }}>Chưa có link</span>
          }
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
        <p className="text-xs font-medium" style={{ color: '#64748b' }}>Link Request</p>
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
          saving={saving}
          onSave={val => onSaveLink(field, val)}
        />
      ))}
    </div>
  )
}

function ActivitiesTab({ app, initialActivity, timeline }) {
  const [activity, setActivity] = useState(initialActivity || null)
  const [loading, setLoading]   = useState(!initialActivity)
  const [saving, setSaving]     = useState(false)

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

  const handleToggleRequest = async () => {
    if (!activity) return
    setSaving(true)
    try {
      const newVal = !activity.requestUpdate
      await updateActivity(activity.id, { requestUpdate: newVal })
      addEvent({
        appId:    app.alpId || app.hnId,
        appName:  app.alpId || app.hnId,
        field:    'requestUpdate',
        oldValue: activity.requestUpdate,
        newValue: newVal,
      })
      setActivity(a => ({ ...a, requestUpdate: newVal }))
    } finally { setSaving(false) }
  }

  const handleSaveLink = async (field, val) => {
    if (!activity) return
    setSaving(true)
    try {
      await updateActivity(activity.id, { [field]: val })
      setActivity(a => ({ ...a, [field]: val }))
    } finally { setSaving(false) }
  }

  if (loading) return <p className="text-xs text-center py-10" style={{ color: '#94a3b8' }}>Đang tải...</p>
  if (!activity) return <p className="text-xs text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu Activities</p>

  return (
    <div className="space-y-3 p-5">
      {/* Feature status */}
      <div className="rounded-xl border border-surface-100 overflow-hidden">
        {[
          { label: 'Show Intro',  value: activity.show,      type: 'select' },
          { label: 'Config Show', value: activity.config,    type: 'select' },
          { label: 'Local Noti',  value: activity.localNoti, type: 'noti'   },
          { label: 'iAP',         value: activity.iap || !!timeline?.liveIap, type: 'iap' },
        ].map(({ label, value, type }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-surface-100 last:border-0">
            <span className="text-xs font-medium" style={{ color: '#64748b' }}>{label}</span>
            {type === 'noti' ? <LocalNotiBadge value={value} /> : type === 'iap' ? <IapBadge value={value} /> : <SelectBadge value={value} />}
          </div>
        ))}
      </div>

      {/* Request Update toggle */}
      <div className="rounded-xl border border-surface-100 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium" style={{ color: '#1e293b' }}>Request Update</p>
          {activity.requestUpdate && (
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#f59e0b' }}>⚡ Đang có request update</p>
          )}
        </div>
        <button
          onClick={handleToggleRequest}
          disabled={saving}
          className="relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50"
          style={{ background: activity.requestUpdate ? '#0d9488' : '#e2e8f0' }}
        >
          <span className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: activity.requestUpdate ? '22px' : '2px' }} />
        </button>
      </div>

      {/* Link Requests */}
      {(() => {
        const initCount = Math.max(1, LINK_FIELDS.reduce((acc, f, i) => activity[f] ? i + 1 : acc, 1))
        return <LinkRequestsBlock activity={activity} saving={saving} onSaveLink={handleSaveLink} initCount={initCount} />
      })()}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AppDetailModal({ app, onClose }) {
  const { releases, refresh, timelines, activities } = useReleasesStore()
  const [tab, setTab] = useState('activities')

  const tlKey = app.hnId?.toLowerCase() || app.alpId?.toLowerCase() || ''
  const actKey = app.hnId?.toLowerCase() || app.alpId?.toLowerCase() || ''
  const timeline    = timelines[tlKey] || null
  const appActivity = activities[actKey] || null

  // Edit modal
  const [editModal, setEditModal]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal]   = useState(null)
  const [reviewForm, setReviewForm]     = useState({ status: 'Checked', reviewNotes: '', lastCheckedDate: '', reviewer: 'Hieu' })
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
    setReviewForm({ status: r.status || 'Checked', reviewNotes: r.reviewNotes || '', lastCheckedDate: r.lastCheckedDate || new Date().toISOString().slice(0, 10), reviewer: r.reviewer || 'Hieu' })
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

  const RIGHT_TABS = [
    { key: 'activities', label: 'Activities' },
    { key: 'releases',   label: `Releases (${appReleases.length})` },
  ]

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 900, height: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: '#0d9488' }}>
              {(app.alpId || '?')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base">{app.alpId || '—'}</h2>
                <AppStatusBadge status={app.status} />
                {appActivity?.requestUpdate && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fef3c7', color: '#d97706' }}>⚡ Request Update</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <PlatformBadge platform={app.platform} />
                <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{app.hnId || '—'}</span>
                {app.appLinkUrl && (
                  <a href={app.appLinkUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs hover:underline" style={{ color: '#0d9488' }}>Store ↗</a>
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
                <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{value}</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="text-xl shrink-0" style={{ color: '#94a3b8' }}>✕</button>
        </div>

        {/* Body: 2 columns */}
        <div className="flex-1 overflow-hidden flex" style={{ minHeight: 0 }}>

          {/* Left: Timeline */}
          <div className="overflow-auto border-r border-surface-100 shrink-0" style={{ width: 220 }}>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase mb-4" style={{ color: '#94a3b8', letterSpacing: '0.05em' }}>Timeline</p>
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
                  className="text-xs font-medium px-4 py-3 border-b-2 transition-colors"
                  style={{
                    borderColor: tab === t.key ? '#0d9488' : 'transparent',
                    color:       tab === t.key ? '#0d9488' : '#94a3b8',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {tab === 'activities' && <ActivitiesTab app={app} initialActivity={appActivity} timeline={timeline} />}

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
                  {['Hieu', 'Hoa Nguyen', 'Tuan Hoang'].map(r => <option key={r}>{r}</option>)}
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
    </div>
  )
}
