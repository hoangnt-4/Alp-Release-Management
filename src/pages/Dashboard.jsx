import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { createRelease, updateRelease, deleteRelease } from '../lib/lark'
import { addEvent } from '../lib/activityHistory'
import { REVIEWER_OPTIONS, DEFAULT_REVIEWER, DEFAULT_STATUS } from '../lib/features'
import StatusBadge from '../components/StatusBadge'
import AppCombobox from '../components/AppCombobox'
import AppDetailModal from '../components/AppDetailModal'

const ROLLOUT_OPTIONS = ['--', '5%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '99%', '100%']
const emptyForm = () => ({ app: '', releaseNote: '', version: '', releaseDate: new Date().toISOString().slice(0, 10), rollout: '--' })
const incrementVersion = (ver) => {
  if (!ver) return ''
  const parts = ver.split('.')
  parts[parts.length - 1] = String(parseInt(parts[parts.length - 1] || '0', 10) + 1)
  return parts.join('.')
}

export default function Dashboard() {
  const { releases, apps, appLinkMap, activities, loading, counts, refresh, watchlist, toggleWatchlist, addReleaseHint, addOptimisticRelease } = useReleasesStore()
  const [form, setForm]               = useState(emptyForm())
  const [selectedApp, setSelectedApp] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState(false)

  const openModal  = () => { setForm(emptyForm()); setSelectedApp(null); setModal(true) }
  const closeModal = () => { setModal(false); setSelectedApp(null) }

  // Edit modal
  const [editModal, setEditModal]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm]   = useState({ status: DEFAULT_STATUS, reviewNotes: '', lastCheckedDate: '', reviewer: DEFAULT_REVIEWER })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [detailApp, setDetailApp]       = useState(null)

  // Quick filter
  const [activeFilter, setActiveFilter] = useState('all')

  // Inline note editing
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue,   setNoteValue]   = useState('')
  const startEditNote = (r) => { setEditingNote(r.id); setNoteValue(r.reviewNotes || '') }
  const saveNote = async (r) => {
    if (noteValue === (r.reviewNotes || '')) { setEditingNote(null); return }
    const today = new Date().toISOString().slice(0, 10)
    const patch = {
      reviewNotes: noteValue,
      ...(!r.status          ? { status: DEFAULT_STATUS }   : {}),
      ...(!r.lastCheckedDate ? { lastCheckedDate: today }    : {}),
      ...(!r.reviewer        ? { reviewer: DEFAULT_REVIEWER } : {}),
    }
    await updateRelease(r.id, patch); setEditingNote(null); refresh()
  }

  const openReview = (r) => {
    setReviewForm({ status: r.status || DEFAULT_STATUS, reviewNotes: r.reviewNotes || '', lastCheckedDate: r.lastCheckedDate || new Date().toISOString().slice(0, 10), reviewer: r.reviewer || DEFAULT_REVIEWER })
    setReviewModal(r)
  }
  const handleSaveReview = async () => {
    if (!reviewModal) return
    setReviewSaving(true)
    try { await updateRelease(reviewModal.id, reviewForm); setReviewModal(null); refresh() }
    finally { setReviewSaving(false) }
  }

  const openEditModal = (r) => {
    const matchedApp = apps.find(a => a.hnId === r.hnId || a.alpId?.toLowerCase() === (r.appName || r.app)?.toLowerCase())
    setEditForm({ version: r.version || '', rollout: r.rollout || '--', releaseDate: r.releaseDate || '', releaseNote: r.releaseNote || '' })
    setEditModal({ ...r, platform: r.platform || matchedApp?.platform || '' })
  }

  const handleEdit = async () => {
    if (!editModal) return
    setEditSaving(true)
    try {
      await updateRelease(editModal.id, editForm)
      const appName = editModal.appName || editModal.app || ''
      const FIELDS = { version: 'Version', rollout: 'Roll-out', releaseDate: 'Ngày phát hành', releaseNote: 'Mô tả' }
      for (const [key, label] of Object.entries(FIELDS)) {
        const oldVal = String(editModal[key] || '')
        const newVal = String(editForm[key] || '')
        if (oldVal !== newVal) addEvent({ appId: editModal.hnId || appName, appName, field: key, fieldLabel: label, oldValue: oldVal, newValue: newVal })
      }
      setEditModal(null); refresh()
    }
    finally { setEditSaving(false) }
  }

  const handleDelete = async () => {
    if (!editModal) return
    if (!window.confirm(`Xoá release "${editModal.version || ''}" của ${editModal.appName || editModal.app || ''}?`)) return
    setEditSaving(true)
    try { await deleteRelease(editModal.id); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  // Trend vs last week
  const lastWeekCount = releases.filter(r => {
    if (!r.releaseDate) return false
    const d = (new Date() - new Date(r.releaseDate)) / 86400000
    return d >= 7 && d < 14
  }).length
  const weekTrend = (counts.thisWeek || 0) - lastWeekCount

  const recent = [...releases]
    .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
    .filter(r => {
      if (search && !`${r.appName || r.app} ${r.hnId} ${r.version} ${r.releaseNote}`.toLowerCase().includes(search.toLowerCase())) return false
      if (activeFilter === 'pending') return !r.status
      if (activeFilter === 'checked') return r.status === 'Checked' || r.status === 'Updated'
      if (activeFilter === 'week') return r.releaseDate && (new Date() - new Date(r.releaseDate)) / 86400000 <= 7
      return true
    })
    .slice(0, activeFilter === 'all' ? 15 : 100)

  const handleSelectApp = (app) => {
    setSelectedApp(app)
    const linkId = app ? (appLinkMap[(app.alpId || '').toLowerCase()] || '') : ''
    const latest = app ? getLatestVersion(app) : null
    const nextVersion = incrementVersion(latest?.version || '')
    setForm(f => ({ ...f, app: app?.id || '', hnId: app?.hnId || '', alpId: app?.alpId || '', appLinkId: linkId, version: nextVersion }))
  }

  // Latest version for a given app (by hnId or alpId)
  const getLatestVersion = (app) => {
    if (!app) return null
    const appReleases = releases
      .filter(r =>
        (app.hnId  && (r.hnId || '').toLowerCase() === app.hnId.toLowerCase()) ||
        (app.alpId && (r.appName || r.app || '').toLowerCase() === app.alpId.toLowerCase())
      )
      .filter(r => r.version)
      .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
    return appReleases[0] || null
  }

  const handleAdd = async () => {
    if (!form.app || !form.releaseDate) return
    setSaving(true)
    try {
      const created = await createRelease(form)
      if (created?.id && selectedApp) {
        addReleaseHint(created.id, selectedApp)
        addOptimisticRelease({
          ...created,
          appName:  selectedApp.alpId || selectedApp.hnId || '',
          hnId:     selectedApp.hnId  || '',
          platform: selectedApp.platform || '',
          _appId:   selectedApp.id,
        })
      }
      setForm(emptyForm())
      setSelectedApp(null)
      setModal(false)
      refresh()
    } finally { setSaving(false) }
  }

  const STATS = [
    { label: 'TỔNG PHÁT HÀNH', value: counts.total,    sub: 'tất cả thời gian',  accent: '#94a3b8', numColor: '#0f172a' },
    { label: 'TUẦN NÀY',       value: counts.thisWeek, sub: weekTrend > 0 ? `↑ ${weekTrend} so tuần trước` : weekTrend < 0 ? `↓ ${Math.abs(weekTrend)} so tuần trước` : 'bằng tuần trước', accent: '#3b82f6', numColor: '#2563eb' },
    { label: 'CHỜ REVIEW',     value: counts.pending,  sub: 'chưa có status',    accent: '#f59e0b', numColor: '#d97706' },
    { label: 'ĐÃ CHECKED',     value: counts.checked,  sub: 'checked + updated', accent: '#0d9488', numColor: '#0d9488' },
  ]

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <button
          className="flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: '#0d9488' }}
          onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
          onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
          onClick={openModal}
        >
          + Thêm bản phát hành
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px 18px', borderLeft: `3px solid ${s.accent}`, borderRadius: 0, transition: 'all 0.15s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
          >
            <p style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{s.label}</p>
            <p style={{ fontSize: 30, fontWeight: 800, fontFamily: 'monospace', color: s.numColor, lineHeight: 1 }}>
              {loading ? '—' : s.value}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent releases */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Section header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 0, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
            {[
              { key: 'all',     label: 'Tất cả',      count: counts.total },
              { key: 'pending', label: 'Chờ review',   count: counts.pending, color: '#d97706' },
              { key: 'checked', label: 'Đã checked',   count: counts.checked, color: '#0d9488' },
              { key: 'week',    label: 'Tuần này',     count: counts.thisWeek, color: '#2563eb' },
            ].map((f, i) => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                style={{ padding: '6px 12px', fontSize: 12, fontWeight: activeFilter === f.key ? 700 : 500, border: 'none', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s',
                  background: activeFilter === f.key ? '#0f172a' : '#fff',
                  color: activeFilter === f.key ? '#fff' : (f.color || '#64748b') }}>
                {f.label} <span style={{ opacity: 0.7, fontSize: 11, fontFamily: 'monospace' }}>{loading ? '' : f.count}</span>
              </button>
            ))}
          </div>
          {/* Search + link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 14 14" fill="none">
                <circle cx="6" cy="6" r="4" stroke="#94a3b8" strokeWidth="1.5"/><path d="M9 9L12 12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input style={{ height: 34, paddingLeft: 30, paddingRight: 10, width: 200, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#fff', color: '#0f172a', outline: 'none' }}
                placeholder="Tìm app, version, mô tả..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link to="/history" style={{ fontSize: 13, fontWeight: 600, color: '#0d9488', whiteSpace: 'nowrap', textDecoration: 'none' }}>Xem tất cả →</Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['#', 'Ngày', 'App', 'HN ID', 'Version', 'Roll-out', 'Mô tả', 'Status', 'Review', 'Note', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ padding: '32px 12px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: '32px 12px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>Không có dữ liệu</td></tr>
              ) : recent.map((r, i) => {
                const borderColor = (r.status === 'Checked' || r.status === 'Updated') ? '#0d9488' : !r.status ? '#f59e0b' : '#e2e8f0'
                const platform = typeof r.platform === 'object' ? (r.platform?.text || '') : (r.platform || '')
                const isA = platform.toLowerCase().includes('android')
                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', borderLeft: `3px solid ${borderColor}` }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: '#cbd5e1', whiteSpace: 'nowrap' }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.releaseDate?.slice(5, 10) || '—'}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                        {platform
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: isA ? '#34a853' : '#007aff', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{isA ? 'A' : 'i'}</span>
                          : <span style={{ width: 22, height: 22, borderRadius: 6, background: '#f1f5f9', display: 'inline-block', flexShrink: 0 }} />
                        }
                        <button onClick={() => openEditModal(r)} style={{ fontSize: 13, fontWeight: 400, color: '#0f172a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#0d9488'}
                          onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}>
                          {r.appName || r.app || '—'}
                        </button>
                        {(activities[r.hnId?.toLowerCase()] || activities[(r.appName || r.app)?.toLowerCase()])?.requestUpdate && (
                          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: '#fef3c7', color: '#d97706', fontWeight: 600, flexShrink: 0 }}>⚡</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{r.hnId || '—'}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 400, padding: '3px 8px', borderRadius: 5, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>{r.version || '—'}</span></td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><RolloutBadge rollout={r.rollout} /></td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: '#64748b', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.releaseNote || <span style={{ color: '#e2e8f0' }}>—</span>}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openReview(r)}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#0d9488', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
                        onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}>
                        ✓ Review
                      </button>
                    </td>
                    <td style={{ padding: '7px 10px', minWidth: 130, maxWidth: 180 }}>
                      {editingNote === r.id ? (
                        <input autoFocus value={noteValue} onChange={e => setNoteValue(e.target.value)}
                          onBlur={() => saveNote(r)}
                          onKeyDown={e => { if (e.key === 'Enter') saveNote(r); if (e.key === 'Escape') setEditingNote(null) }}
                          style={{ width: '100%', fontSize: 11, padding: '3px 7px', border: '1px solid #0d9488', borderRadius: 5, outline: 'none', color: '#0f172a', background: '#f0fdfa' }}
                        />
                      ) : (
                        <div onClick={() => startEditNote(r)} style={{ cursor: 'text' }} title="Nhấn để chỉnh sửa note">
                          {r.reviewNotes
                            ? <span style={{ fontSize: 11, color: '#475569', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reviewNotes}</span>
                            : <span style={{ fontSize: 11, color: '#e2e8f0' }}>+ note…</span>}
                          {r.lastCheckedDate && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#cbd5e1', display: 'block' }}>{r.lastCheckedDate}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      <button onClick={() => toggleWatchlist(r.id)} title={watchlist.has(r.id) ? 'Bỏ lưu' : 'Lưu xem sau'}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: `1px solid ${watchlist.has(r.id) ? '#0d9488' : '#e2e8f0'}`, background: watchlist.has(r.id) ? '#f0fdfa' : 'transparent', color: watchlist.has(r.id) ? '#0d9488' : '#cbd5e1', cursor: 'pointer', fontSize: 13, transition: 'all 0.15s' }}
                        onMouseEnter={e => { if (!watchlist.has(r.id)) { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#94a3b8' } }}
                        onMouseLeave={e => { if (!watchlist.has(r.id)) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#cbd5e1' } }}>
                        {watchlist.has(r.id) ? '◉' : '○'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setReviewModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <div>
                <h2 className="font-semibold">Review bản phát hành</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{reviewModal.appName || reviewModal.app} — {reviewModal.version}</p>
              </div>
              <button onClick={() => setReviewModal(null)} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Status review</label>
                <select className="input" value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}>
                  {['', 'Checked', 'Updated', 'Pending Review', 'Checking', 'New'].map(o => <option key={o} value={o}>{o || '— Chưa có —'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày kiểm tra</label>
                <input type="date" className="input" value={reviewForm.lastCheckedDate} onChange={e => setReviewForm(f => ({ ...f, lastCheckedDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Reviewer</label>
                <select className="input" value={reviewForm.reviewer} onChange={e => setReviewForm(f => ({ ...f, reviewer: e.target.value }))}>
                  {REVIEWER_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ghi chú review</label>
                <textarea className="input resize-none" rows={3} value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={() => setReviewModal(null)}>Huỷ</button>
              <button onClick={handleSaveReview} disabled={reviewSaving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#0d9488' }}>
                {reviewSaving ? 'Đang lưu...' : 'Lưu review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <div>
                <h2 className="font-semibold">Chỉnh sửa bản phát hành</h2>
                <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                  <PlatformBadge platform={editModal.platform} />
                  {editModal.appName || editModal.app}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const matchedApp = apps.find(a =>
                      (editModal.hnId && a.hnId === editModal.hnId) ||
                      a.alpId?.toLowerCase() === (editModal.appName || editModal.app)?.toLowerCase()
                    )
                    if (matchedApp) { setEditModal(null); setDetailApp(matchedApp) }
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 hover:bg-surface-50 transition-colors"
                  style={{ color: '#64748b' }}
                >⊞ Chi tiết app</button>
                <button onClick={() => setEditModal(null)} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Version <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="input" placeholder="1.2.3" value={editForm.version} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Roll-out</label>
                  <select className="input" value={editForm.rollout} onChange={e => setEditForm(f => ({ ...f, rollout: e.target.value }))}>
                    {ROLLOUT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày phát hành</label>
                <input type="date" className="input" value={editForm.releaseDate} onChange={e => setEditForm(f => ({ ...f, releaseDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Mô tả</label>
                <textarea className="input resize-none" rows={2} value={editForm.releaseNote} onChange={e => setEditForm(f => ({ ...f, releaseNote: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-t border-surface-200">
              <button onClick={handleDelete} disabled={editSaving} className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: '#ef4444', border: '1px solid #fecaca' }}>
                🗑 Xoá
              </button>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setEditModal(null)}>Huỷ</button>
                <button onClick={handleEdit} disabled={editSaving} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: '#0d9488' }}>
                  {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold">Thêm bản phát hành</h2>
              <button onClick={closeModal} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>App *</label>
                <AppCombobox apps={apps} selectedApp={selectedApp} onSelect={handleSelectApp} placeholder="Tìm app theo tên hoặc HN ID..." />
                {selectedApp && (() => {
                  const latest = getLatestVersion(selectedApp)
                  return (
                    <div className="flex items-center gap-3 mt-1.5 px-1">
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        Platform: <span className="font-medium" style={{ color: '#64748b' }}>{selectedApp.platform || '—'}</span>
                      </span>
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        HN ID: <span className="font-medium font-mono" style={{ color: '#64748b' }}>{selectedApp.hnId || '—'}</span>
                      </span>
                      {latest && (
                        <span className="text-xs" style={{ color: '#94a3b8' }}>
                          Version hiện tại:{' '}
                          <span className="font-mono font-semibold px-1 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#0d9488' }}>
                            {latest.version}
                          </span>
                          <span className="ml-1" style={{ color: '#cbd5e1' }}>({latest.releaseDate})</span>
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Version <span style={{ color: '#ef4444' }}>*</span></label>
                  <input className="input" placeholder="1.2.3" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Roll-out</label>
                  <select className="input" value={form.rollout} onChange={e => setForm(f => ({ ...f, rollout: e.target.value }))}>
                    {ROLLOUT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày phát hành *</label>
                <input type="date" className="input" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Mô tả</label>
                <textarea className="input resize-none" rows={2} placeholder="Mô tả nội dung release..." value={form.releaseNote} onChange={e => setForm(f => ({ ...f, releaseNote: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={closeModal}>Huỷ</button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.app || !form.releaseDate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >{saving ? 'Đang lưu...' : '+ Thêm'}</button>
            </div>
          </div>
        </div>
      )}

      {detailApp && <AppDetailModal app={detailApp} onClose={() => setDetailApp(null)} />}
    </div>
  )
}

export function PlatformBadge({ platform }) {
  const p = typeof platform === 'object' && platform !== null
    ? (platform.text || platform.en_us || '')
    : (platform || '')
  if (!p) return null
  const isIOS = p.toLowerCase().includes('ios')
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{
      background: isIOS ? '#dbeafe' : '#dcfce7',
      color: isIOS ? '#1d4ed8' : '#15803d',
    }}>{p}</span>
  )
}

export function RolloutBadge({ rollout }) {
  if (!rollout || rollout === '--') return <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>--</span>
  const is100 = rollout === '100%'
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-mono font-medium" style={{
      background: is100 ? '#d1fae5' : '#fef3c7',
      color: is100 ? '#065f46' : '#92400e',
    }}>{rollout}</span>
  )
}
