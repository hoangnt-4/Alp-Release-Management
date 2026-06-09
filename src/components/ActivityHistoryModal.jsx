import React, { useState, useMemo } from 'react'
import { getHistory, clearHistory, TRACKED_FIELDS } from '../lib/activityHistory'

const FIELD_OPTS = Object.entries(TRACKED_FIELDS).map(([k, v]) => ({ value: k, label: v }))

function formatTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function ValueChip({ value, field }) {
  if (value === '' || value === 'false' || value === 'undefined') {
    return <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: '#f1f5f9', color: '#94a3b8' }}>—</span>
  }
  if (field === 'requestUpdate') {
    const on = value === 'true'
    return (
      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ background: on ? '#fef3c7' : '#f1f5f9', color: on ? '#d97706' : '#94a3b8' }}>
        {on ? '⚡ On' : 'Off'}
      </span>
    )
  }
  if (field === 'iap') {
    const on = value === 'true' || value === '1'
    return (
      <span className="text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ background: on ? '#dcfce7' : '#f1f5f9', color: on ? '#16a34a' : '#94a3b8' }}>
        {on ? 'Live' : 'No'}
      </span>
    )
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
      style={{ background: '#f0fdf4', color: '#0d9488' }}>{value}</span>
  )
}

export default function ActivityHistoryModal({ onClose }) {
  const [search, setSearch]     = useState('')
  const [filterField, setFilterField] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [, forceUpdate] = useState(0)

  const history = useMemo(() => getHistory().reverse(), [])
  const q = search.toLowerCase()

  const filtered = useMemo(() => history.filter(e => {
    if (filterField && e.field !== filterField) return false
    if (q && !(
      (e.appName || '').toLowerCase().includes(q) ||
      (e.appId   || '').toLowerCase().includes(q) ||
      (e.fieldLabel || '').toLowerCase().includes(q) ||
      (e.oldValue || '').toLowerCase().includes(q) ||
      (e.newValue || '').toLowerCase().includes(q)
    )) return false
    return true
  }), [history, filterField, q])

  const handleClear = () => {
    clearHistory()
    setConfirmClear(false)
    forceUpdate(n => n + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="rounded-2xl shadow-2xl flex flex-col" style={{ background: '#fff', width: 720, maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div>
            <p className="font-semibold text-sm">📋 Lịch sử thay đổi Activities</p>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{filtered.length} sự kiện</p>
          </div>
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Xoá tất cả?</span>
                <button onClick={handleClear}
                  className="text-xs px-2.5 py-1.5 rounded-lg font-medium text-white"
                  style={{ background: '#ef4444' }}>Xoá</button>
                <button onClick={() => setConfirmClear(false)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200"
                  style={{ color: '#64748b' }}>Huỷ</button>
              </>
            ) : (
              <button onClick={() => setConfirmClear(true)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-surface-200 hover:bg-surface-50"
                style={{ color: '#94a3b8' }}>Xoá lịch sử</button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-100 text-sm"
              style={{ color: '#64748b' }}>✕</button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-surface-100 flex gap-2">
          <input
            className="input text-xs py-1.5 flex-1"
            placeholder="Tìm theo app, field, giá trị..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input text-xs py-1.5 w-40" value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="">Tất cả field</option>
            {FIELD_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>
              {history.length === 0
                ? 'Chưa có lịch sử. Dữ liệu sẽ được ghi khi bạn làm mới Activities.'
                : 'Không có kết quả'}
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f8fafc' }} className="border-b border-surface-100">
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>Thời gian</th>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>App</th>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>Field</th>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>Trước</th>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>Sau</th>
                  <th className="px-4 py-2.5 text-left font-semibold" style={{ color: '#64748b' }}>Nguồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: '#94a3b8' }}>
                      {formatTs(e.ts)}
                    </td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: '#1e293b' }}>
                      {e.appName || e.appId || '—'}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: '#64748b' }}>
                      {e.fieldLabel || e.field}
                    </td>
                    <td className="px-4 py-2.5">
                      <ValueChip value={e.oldValue} field={e.field} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ValueChip value={e.newValue} field={e.field} />
                    </td>
                    <td className="px-4 py-2.5">
                      {e.source === 'lark'
                        ? <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#dbeafe', color: '#1d4ed8' }}>Lark</span>
                        : <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#f0fdf4', color: '#0d9488' }}>App</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
