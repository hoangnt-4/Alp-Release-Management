import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { updateRelease, createRelease } from '../lib/lark'
import StatusBadge from '../components/StatusBadge'
import AppCombobox from '../components/AppCombobox'
import ImportModal from '../components/ImportModal'
import { PlatformBadge, RolloutBadge } from './Dashboard'
import clsx from 'clsx'

const STATUS_OPTS = ['', 'Checked', 'Updated', 'Pending Review']
const ROLLOUT_OPTS = ['', '--', '1%', '5%', '10%', '20%', '50%', '99%', '100%']
const EMPTY_FORM  = { app: '', releaseNote: '', version: '', releaseDate: new Date().toISOString().slice(0, 10), rollout: '--' }

function sortRows(rows, key, dir) {
  if (!key) return rows
  return [...rows].sort((a, b) => {
    const av = a[key] || '', bv = b[key] || ''
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })
}

export default function History() {
  const { releases, apps, loading, refresh, watchlist, toggleWatchlist } = useReleasesStore()

  const [filter, setFilter] = useState({ search: '', status: '', platform: '', rollout: '', dateFrom: '', dateTo: '' })
  const [sort, setSort]     = useState({ key: 'releaseDate', dir: 'desc' })
  const [page, setPage]     = useState(1)
  const PER = 20

  const [reviewModal, setReviewModal] = useState(null)
  const [reviewForm, setReviewForm]   = useState({ status: '', reviewNotes: '', lastCheckedDate: '' })
  const [saving, setSaving]           = useState(false)

  const [addModal, setAddModal]       = useState(false)
  const [addForm, setAddForm]         = useState(EMPTY_FORM)
  const [selectedApp, setSelectedApp] = useState(null)
  const [addSaving, setAddSaving]     = useState(false)

  const [editModal, setEditModal]       = useState(null)
  const [editForm, setEditForm]         = useState({})
  const [editSaving, setEditSaving]     = useState(false)

  const [importModal, setImportModal]   = useState(false)

  const openAddModal = () => { setAddForm(EMPTY_FORM); setSelectedApp(null); setAddModal(true) }

  const openEditModal = (r) => {
    // Resolve platform from apps list if release record doesn't have it
    const matchedApp = apps.find(a =>
      a.hnId === r.hnId ||
      a.alpId === (r.appName || r.app) ||
      a.alpId?.toLowerCase() === (r.appName || r.app)?.toLowerCase()
    )
    const resolvedPlatform = r.platform || matchedApp?.platform || ''
    setEditForm({ version: r.version || '', rollout: r.rollout || '--', releaseDate: r.releaseDate || '', releaseNote: r.releaseNote || '' })
    setEditModal({ ...r, platform: resolvedPlatform })
  }

  const handleEdit = async () => {
    if (!editModal) return
    setEditSaving(true)
    try { await updateRelease(editModal.id, editForm); setEditModal(null); refresh() }
    finally { setEditSaving(false) }
  }

  const handleSelectApp = (app) => {
    setSelectedApp(app)
    setAddForm(f => ({ ...f, app: app?.id || '' }))
  }

  const handleAdd = async () => {
    if (!addForm.app || !addForm.releaseDate) return
    setAddSaving(true)
    try { await createRelease(addForm); setAddModal(false); setAddForm(EMPTY_FORM); setSelectedApp(null); refresh() }
    finally { setAddSaving(false) }
  }

  const setF = (k, v) => { setFilter(f => ({ ...f, [k]: v })); setPage(1) }

  const filtered = useMemo(() => {
    const q = filter.search.toLowerCase()
    return releases.filter(r => {
      if (filter.status   && r.status !== filter.status) return false
      if (filter.platform && !r.platform?.toLowerCase().includes(filter.platform.toLowerCase())) return false
      if (filter.rollout  && r.rollout !== filter.rollout) return false
      if (filter.dateFrom && r.releaseDate && r.releaseDate < filter.dateFrom) return false
      if (filter.dateTo   && r.releaseDate && r.releaseDate > filter.dateTo)   return false
      if (q && !`${r.appName || r.app || ''} ${r.hnId || ''} ${r.version || ''} ${r.releaseNote || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [releases, filter])

  const sorted    = useMemo(() => sortRows(filtered, sort.key, sort.dir), [filtered, sort])
  const totalPages = Math.ceil(sorted.length / PER)
  const paged     = sorted.slice((page - 1) * PER, page * PER)

  const toggleSort = (key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))
  const SortIcon = ({ k }) => sort.key === k ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''

  const openReview = (r) => {
    setReviewForm({ status: r.status || '', reviewNotes: r.reviewNotes || '', lastCheckedDate: r.lastCheckedDate || new Date().toISOString().slice(0, 10) })
    setReviewModal(r)
  }

  const handleSaveReview = async () => {
    if (!reviewModal) return
    setSaving(true)
    try {
      await updateRelease(reviewModal.id, reviewForm)
      setReviewModal(null)
      refresh()
    } finally { setSaving(false) }
  }

  const hasFilter = filter.search || filter.status || filter.platform || filter.rollout || filter.dateFrom || filter.dateTo
  const clearFilter = () => { setFilter({ search: '', status: '', platform: '', rollout: '', dateFrom: '', dateTo: '' }); setPage(1) }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lịch sử phát hành</h1>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-surface-200 hover:bg-surface-50 transition-colors"
            style={{ color: '#64748b' }}
            onClick={() => setImportModal(true)}
          >
            ↑ Import Excel
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#0d9488' }}
            onClick={openAddModal}>
            + Thêm bản phát hành
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        <input className="input w-48 text-xs py-1.5" placeholder="Tìm app, version, mô tả..." value={filter.search} onChange={e => setF('search', e.target.value)} />
        <select className="input w-36 text-xs py-1.5" value={filter.status} onChange={e => setF('status', e.target.value)}>
          <option value="">Tất cả status</option>
          {STATUS_OPTS.filter(Boolean).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-36 text-xs py-1.5" value={filter.platform} onChange={e => setF('platform', e.target.value)}>
          <option value="">Tất cả nền tảng</option>
          <option>iOS</option><option>Android</option>
        </select>
        <select className="input w-28 text-xs py-1.5" value={filter.rollout} onChange={e => setF('rollout', e.target.value)}>
          <option value="">Tất cả roll-out</option>
          {ROLLOUT_OPTS.filter(Boolean).map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="date" className="input w-36 text-xs py-1.5" value={filter.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
        <input type="date" className="input w-36 text-xs py-1.5" value={filter.dateTo} onChange={e => setF('dateTo', e.target.value)} />
        {hasFilter && (
          <button className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 hover:bg-surface-100 transition-colors" onClick={clearFilter}>Xoá filter</button>
        )}
        <span className="ml-auto text-xs" style={{ color: '#94a3b8' }}>{filtered.length} bản phát hành</span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left">
                {[
                  { label: '#',             key: null },
                  { label: 'Ngày',          key: 'releaseDate' },
                  { label: 'App Name',      key: 'appName' },
                  { label: 'HN ID',         key: 'hnId' },
                  { label: 'Version',       key: 'version' },
                  { label: 'Roll-out',      key: 'rollout' },
                  { label: 'Mô tả',         key: null },
                  { label: 'Status review', key: 'status' },
                  { label: 'Review',        key: null },
                  { label: 'Review Note',   key: null },
                  { label: '',              key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className={clsx('px-3 py-2.5 text-xs font-medium whitespace-nowrap select-none', key && 'cursor-pointer hover:text-surface-800')}
                    style={{ color: '#94a3b8' }}
                    onClick={() => key && toggleSort(key)}
                  >
                    {label}{key && <SortIcon k={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>Không có kết quả</td></tr>
              ) : paged.map((r, i) => (
                <tr key={r.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#94a3b8' }}>{(page - 1) * PER + i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{r.releaseDate || '—'}</td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <div className="flex items-start gap-1.5">
                      <PlatformBadge platform={r.platform} />
                      <button
                        onClick={() => openEditModal(r)}
                        className="font-medium text-xs leading-relaxed text-left hover:underline"
                        style={{ color: '#1e2235' }}
                      >{r.appName || r.app || '—'}</button>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#64748b' }}>{r.hnId || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-100">{r.version || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5"><RolloutBadge rollout={r.rollout} /></td>
                  <td className="px-3 py-2.5 text-xs max-w-[160px] truncate" style={{ color: '#64748b' }}>{r.releaseNote || '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => openReview(r)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-white transition-colors"
                      style={{ background: '#0d9488' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0f766e'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0d9488'}
                    >
                      ✓ Review
                    </button>
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    {r.reviewNotes
                      ? <span className="text-xs" style={{ color: '#64748b' }} title={r.reviewNotes}>{r.reviewNotes.length > 50 ? r.reviewNotes.slice(0, 50) + '…' : r.reviewNotes}</span>
                      : <span className="text-xs" style={{ color: '#cbd5e1' }}>—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleWatchlist(r.id)}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-surface-200 transition-colors whitespace-nowrap"
                      style={{ color: watchlist.has(r.id) ? '#0d9488' : '#94a3b8', borderColor: watchlist.has(r.id) ? '#0d9488' : '' }}
                    >
                      {watchlist.has(r.id) ? '◉' : '○'} Lưu xem sau
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-200 flex items-center justify-between">
            <span className="text-xs" style={{ color: '#94a3b8' }}>Trang {page} / {totalPages} ({filtered.length} kết quả)</span>
            <div className="flex gap-1">
              <button className="btn-secondary text-xs py-1 px-3" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              <button className="btn-secondary text-xs py-1 px-3" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>

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
              <button onClick={() => setEditModal(null)} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Version</label>
                  <input className="input" placeholder="1.2.3" value={editForm.version} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Roll-out</label>
                  <select className="input" value={editForm.rollout} onChange={e => setEditForm(f => ({ ...f, rollout: e.target.value }))}>
                    {['--','1%','5%','10%','20%','50%','99%','100%'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày phát hành</label>
                <input type="date" className="input" value={editForm.releaseDate} onChange={e => setEditForm(f => ({ ...f, releaseDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Mô tả</label>
                <textarea className="input resize-none" rows={3} value={editForm.releaseNote} onChange={e => setEditForm(f => ({ ...f, releaseNote: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={() => setEditModal(null)}>Huỷ</button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >{editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={e => e.target === e.currentTarget && (setAddModal(false), setSelectedApp(null))}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold">Thêm bản phát hành</h2>
              <button onClick={() => { setAddModal(false); setSelectedApp(null) }} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>App *</label>
                <AppCombobox apps={apps} selectedApp={selectedApp} onSelect={handleSelectApp} />
                {selectedApp && (
                  <div className="flex items-center gap-3 mt-1.5 px-1">
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      Platform: <span className="font-medium" style={{ color: '#64748b' }}>{selectedApp.platform || '—'}</span>
                    </span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>
                      HN ID: <span className="font-medium font-mono" style={{ color: '#64748b' }}>{selectedApp.hnId || '—'}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Version</label>
                  <input className="input" placeholder="1.2.3" value={addForm.version} onChange={e => setAddForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Roll-out</label>
                  <select className="input" value={addForm.rollout} onChange={e => setAddForm(f => ({ ...f, rollout: e.target.value }))}>
                    {['--','1%','5%','10%','20%','50%','99%','100%'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày phát hành *</label>
                <input type="date" className="input" value={addForm.releaseDate} onChange={e => setAddForm(f => ({ ...f, releaseDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Mô tả</label>
                <textarea className="input resize-none" rows={2} placeholder="Mô tả nội dung release..." value={addForm.releaseNote} onChange={e => setAddForm(f => ({ ...f, releaseNote: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={() => { setAddModal(false); setSelectedApp(null) }}>Huỷ</button>
              <button
                onClick={handleAdd}
                disabled={addSaving || !addForm.app || !addForm.releaseDate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >{addSaving ? 'Đang lưu...' : '+ Thêm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <ImportModal
          apps={apps}
          onClose={() => setImportModal(false)}
          onDone={() => { setImportModal(false); refresh() }}
        />
      )}

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
                  {STATUS_OPTS.map(o => <option key={o} value={o}>{o || '— Chưa có —'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ngày kiểm tra</label>
                <input type="date" className="input" value={reviewForm.lastCheckedDate} onChange={e => setReviewForm(f => ({ ...f, lastCheckedDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#64748b' }}>Ghi chú review</label>
                <textarea className="input resize-none" rows={3} placeholder="crash-free >99%, UI đúng design..." value={reviewForm.reviewNotes} onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={() => setReviewModal(null)}>Huỷ</button>
              <button
                onClick={handleSaveReview}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >{saving ? 'Đang lưu...' : 'Lưu review'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
