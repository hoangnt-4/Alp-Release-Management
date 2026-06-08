import React, { useEffect, useState, useCallback } from 'react'
import { getReleases, createRelease, updateRelease, deleteRelease, getApps } from '../lib/lark'
import StatusBadge from '../components/StatusBadge'
import clsx from 'clsx'

const ROLLOUT_OPTIONS = ['--', '1%', '5%', '10%', '20%', '50%', '99%', '100%']
const STATUS_OPTIONS  = ['', 'Checked', 'Updated', 'Pending Review']
const REVIEWER_OPTIONS = ['Tuan Hoang', 'Hieu', 'Hoa']

const EMPTY_FORM = {
  releaseDate: new Date().toISOString().slice(0, 10),
  app: '',
  version: '',
  rollout: '--',
  releaseNote: '',
  status: '',
  reviewer: '',
  lastCheckedDate: '',
  reviewNotes: '',
}

export default function Releases() {
  const [releases, setReleases] = useState([])
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // null | 'add' | record
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState({ status: '', platform: '', search: '' })
  const [page, setPage]         = useState(1)
  const PER_PAGE = 20

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getReleases({ pageSize: 500 }), getApps()])
      .then(([r, a]) => {
        setReleases(r.records || [])
        setApps(a.records || [])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setForm(EMPTY_FORM); setModal('add') }
  const openEdit = (r) => {
    setForm({
      releaseDate:     r.releaseDate || '',
      app:             r.app || '',
      version:         r.version || '',
      rollout:         r.rollout || '--',
      releaseNote:     r.releaseNote || '',
      status:          r.status || '',
      reviewer:        r.reviewer || '',
      lastCheckedDate: r.lastCheckedDate || '',
      reviewNotes:     r.reviewNotes || '',
    })
    setModal(r)
  }

  const handleSave = async () => {
    if (!form.app || !form.releaseDate) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await createRelease(form)
      } else {
        await updateRelease(modal.id, form)
      }
      setModal(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Xoá bản phát hành này?')) return
    await deleteRelease(id)
    load()
  }

  // Filter
  const filtered = releases.filter(r => {
    if (filter.status && r.status !== filter.status) return false
    if (filter.platform && r.platform !== filter.platform) return false
    if (filter.search) {
      const q = filter.search.toLowerCase()
      if (!((r.appName || r.app || '').toLowerCase().includes(q) ||
            (r.version || '').toLowerCase().includes(q))) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paginated  = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Releases</h1>
          <p className="text-sm text-surface-800/50">{filtered.length} bản phát hành</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Thêm</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          className="input w-48"
          placeholder="Tìm app, version..."
          value={filter.search}
          onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1) }}
        />
        <select className="input w-36" value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1) }}>
          <option value="">Tất cả status</option>
          {['Checked','Updated','Pending Review'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-32" value={filter.platform} onChange={e => { setFilter(f => ({ ...f, platform: e.target.value })); setPage(1) }}>
          <option value="">Tất cả nền tảng</option>
          <option>iOS</option>
          <option>Android</option>
        </select>
        {(filter.search || filter.status || filter.platform) && (
          <button className="btn-ghost text-xs" onClick={() => setFilter({ status: '', platform: '', search: '' })}>✕ Xoá filter</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left">
                {['Ngày','App','HN ID','Version','Roll-out','Release Note','Status','Reviewer',''].map(h => (
                  <th key={h} className="px-3 py-2.5 font-medium text-surface-800/60 whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-surface-800/40">Đang tải...</td></tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-surface-800/40">Không có kết quả</td></tr>
              )}
              {paginated.map(r => (
                <tr key={r.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs text-surface-800/60 whitespace-nowrap">{r.releaseDate?.slice(5) || '—'}</td>
                  <td className="px-3 py-2.5 font-medium max-w-[160px] truncate">{r.appName || r.app}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-surface-800/50">{r.hnId || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.version || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={clsx('font-mono text-xs px-1.5 py-0.5 rounded',
                      r.rollout === '100%' ? 'bg-emerald-100 text-emerald-700' :
                      r.rollout && r.rollout !== '--' ? 'bg-amber-100 text-amber-700' : 'text-surface-800/40'
                    )}>{r.rollout || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-surface-800/60 max-w-[200px] truncate">{r.releaseNote || '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-surface-800/60">{r.reviewer || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="btn-ghost text-xs py-1 px-2">✎</button>
                      <button onClick={() => handleDelete(r.id)} className="btn-ghost text-xs py-1 px-2 hover:text-rose-500">✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-200 flex items-center justify-between text-sm">
            <span className="text-surface-800/50 text-xs">Trang {page} / {totalPages}</span>
            <div className="flex gap-1">
              <button className="btn-secondary text-xs py-1 px-3" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              <button className="btn-secondary text-xs py-1 px-3" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
              <h2 className="font-semibold">{modal === 'add' ? 'Thêm bản phát hành' : 'Chỉnh sửa'}</h2>
              <button onClick={() => setModal(null)} className="text-surface-800/40 hover:text-surface-800 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Ngày phát hành *</label>
                  <input type="date" className="input" value={form.releaseDate} onChange={e => setForm(f => ({ ...f, releaseDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Version</label>
                  <input className="input" placeholder="1.0.7" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-800/60 mb-1 block">App *</label>
                <select className="input" value={form.app} onChange={e => setForm(f => ({ ...f, app: e.target.value }))}>
                  <option value="">— Chọn app —</option>
                  {apps.map(a => <option key={a.id} value={a.alpId}>{a.alpId} ({a.platform})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Roll-out</label>
                  <select className="input" value={form.rollout} onChange={e => setForm(f => ({ ...f, rollout: e.target.value }))}>
                    {ROLLOUT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o || '— Chưa có —'}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-800/60 mb-1 block">Release Note</label>
                <input className="input" placeholder="Fix crash, update SDK..." value={form.releaseNote} onChange={e => setForm(f => ({ ...f, releaseNote: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Reviewer</label>
                  <select className="input" value={form.reviewer} onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))}>
                    <option value="">— Chọn —</option>
                    {REVIEWER_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-800/60 mb-1 block">Last Checked Date</label>
                  <input type="date" className="input" value={form.lastCheckedDate} onChange={e => setForm(f => ({ ...f, lastCheckedDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-surface-800/60 mb-1 block">Review Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="crash-free >99..." value={form.reviewNotes} onChange={e => setForm(f => ({ ...f, reviewNotes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-200">
              <button className="btn-secondary" onClick={() => setModal(null)}>Huỷ</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.app || !form.releaseDate}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
