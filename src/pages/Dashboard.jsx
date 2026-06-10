import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { createRelease, updateRelease, deleteRelease } from '../lib/lark'
import StatusBadge from '../components/StatusBadge'
import AppCombobox from '../components/AppCombobox'
import AppDetailModal from '../components/AppDetailModal'

const ROLLOUT_OPTIONS = ['--', '5%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '99%', '100%']
const EMPTY = { app: '', releaseNote: '', version: '', releaseDate: new Date().toISOString().slice(0, 10), rollout: '--' }

export default function Dashboard() {
  const { releases, apps, appLinkMap, activities, loading, counts, refresh, watchlist, toggleWatchlist, addReleaseHint, addOptimisticRelease } = useReleasesStore()
  const [form, setForm]               = useState(EMPTY)
  const [selectedApp, setSelectedApp] = useState(null)
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState(false)

  const openModal  = () => { setForm(EMPTY); setSelectedApp(null); setModal(true) }
  const closeModal = () => { setModal(false); setSelectedApp(null) }

  // Edit modal
  const [editModal, setEditModal]   = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editSaving, setEditSaving] = useState(false)

  // Review modal
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm]   = useState({ status: 'Checked', reviewNotes: '', lastCheckedDate: '', reviewer: 'Hieu' })
  const [reviewSaving, setReviewSaving] = useState(false)
  const [detailApp, setDetailApp]       = useState(null)

  const openReview = (r) => {
    setReviewForm({ status: r.status || 'Checked', reviewNotes: r.reviewNotes || '', lastCheckedDate: r.lastCheckedDate || new Date().toISOString().slice(0, 10), reviewer: r.reviewer || 'Hieu' })
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
    try { await updateRelease(editModal.id, editForm); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  const handleDelete = async () => {
    if (!editModal) return
    if (!window.confirm(`Xoá release "${editModal.version || ''}" của ${editModal.appName || editModal.app || ''}?`)) return
    setEditSaving(true)
    try { await deleteRelease(editModal.id); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  const recent = [...releases]
    .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
    .filter(r => !search || `${r.appName || r.app} ${r.hnId} ${r.version} ${r.releaseNote}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 15)

  const handleSelectApp = (app) => {
    setSelectedApp(app)
    const linkId = app ? (appLinkMap[(app.alpId || '').toLowerCase()] || '') : ''
    setForm(f => ({ ...f, app: app?.id || '', hnId: app?.hnId || '', alpId: app?.alpId || '', appLinkId: linkId }))
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
      setForm(EMPTY)
      setSelectedApp(null)
      setModal(false)
      refresh()
    } finally { setSaving(false) }
  }

  const STATS = [
    { label: 'TỔNG PHÁT HÀNH', value: counts.total,    sub: 'tất cả thời gian', color: '' },
    { label: 'TUẦN NÀY',       value: counts.thisWeek, sub: '7 ngày qua',        color: '' },
    { label: 'CHỜ REVIEW',     value: counts.pending,  sub: 'chưa có status',    color: '#f59e0b' },
    { label: 'ĐÃ CHECKED',     value: counts.checked,  sub: 'checked + updated', color: '#0d9488' },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
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
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold tracking-wide mb-1" style={{ color: '#94a3b8' }}>{s.label}</p>
            <p className="text-3xl font-bold font-mono" style={{ color: s.color || '#1e2235' }}>
              {loading ? '—' : s.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
          <p className="text-sm font-semibold">15 bản phát hành gần nhất</p>
          <div className="flex items-center gap-3">
            <input
              className="input w-48 text-xs py-1.5"
              placeholder="Tìm theo tên app, version, mô tả..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Link to="/history" className="text-sm font-medium" style={{ color: '#0d9488' }}>Xem tất cả →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left">
                {['#', 'Ngày', 'App Name', 'HN ID', 'Version', 'Roll-out', 'Mô tả', 'Status review', 'Review', 'Review Note', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-medium whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-sm" style={{ color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : recent.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-sm" style={{ color: '#94a3b8' }}>Không có dữ liệu</td></tr>
              ) : recent.map((r, i) => (
                <tr key={r.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#94a3b8' }}>{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{r.releaseDate?.slice(0, 10) || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PlatformBadge platform={r.platform} />
                      <button onClick={() => openEditModal(r)} className="font-medium text-xs text-left hover:underline" style={{ color: '#1e2235' }}>{r.appName || r.app || '—'}</button>
                      {(activities[r.hnId?.toLowerCase()] || activities[(r.appName || r.app)?.toLowerCase()])?.requestUpdate && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#fef3c7', color: '#d97706' }}>⚡</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#64748b' }}>{r.hnId || '—'}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-100">{r.version || '—'}</span></td>
                  <td className="px-3 py-2.5"><RolloutBadge rollout={r.rollout} /></td>
                  <td className="px-3 py-2.5 text-xs max-w-[160px] truncate" style={{ color: '#64748b' }}>{r.releaseNote || '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => openReview(r)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-white"
                      style={{ background: '#0d9488' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
                    >✓ Review</button>
                  </td>
                  <td className="px-3 py-2.5 max-w-[160px]">
                    {r.reviewNotes
                      ? <span className="text-xs" style={{ color: '#64748b' }} title={r.reviewNotes}>{r.reviewNotes.length > 40 ? r.reviewNotes.slice(0, 40) + '…' : r.reviewNotes}</span>
                      : <span className="text-xs" style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleWatchlist(r.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-surface-200 whitespace-nowrap transition-colors"
                      style={{ color: watchlist.has(r.id) ? '#0d9488' : '#94a3b8', borderColor: watchlist.has(r.id) ? '#0d9488' : '' }}
                    >{watchlist.has(r.id) ? '◉' : '○'} Lưu xem sau</button>
                  </td>
                </tr>
              ))}
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
                  {['Hieu', 'Hoa Nguyen', 'Tuan Hoang'].map(r => <option key={r} value={r}>{r}</option>)}
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
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
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
