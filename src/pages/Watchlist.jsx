import React from 'react'
import { useReleasesStore } from '../hooks/useReleasesStore'
import StatusBadge from '../components/StatusBadge'
import { PlatformBadge, RolloutBadge } from './Dashboard'

export default function Watchlist() {
  const { releases, loading, watchlist, toggleWatchlist } = useReleasesStore()

  const saved = releases.filter(r => watchlist.has(r.id))

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Xem sau</h1>
        <span className="text-sm" style={{ color: '#94a3b8' }}>{saved.length} bản phát hành</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left">
                {['Ngày', 'App Name', 'Version', 'Roll-out', 'Mô tả', 'Status', 'Reviewer', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-medium" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : saved.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-16 text-center">
                    <div style={{ color: '#94a3b8' }}>
                      <div className="text-3xl mb-2">◉</div>
                      <p className="text-sm font-medium">Chưa có bản phát hành nào</p>
                      <p className="text-xs mt-1">Nhấn "Lưu xem sau" ở trang Lịch sử phát hành để thêm vào đây</p>
                    </div>
                  </td>
                </tr>
              ) : saved.map(r => (
                <tr key={r.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap" style={{ color: '#64748b' }}>{r.releaseDate || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <PlatformBadge platform={r.platform} />
                      <span className="font-medium text-xs">{r.appName || r.app || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{r.version || '—'}</td>
                  <td className="px-3 py-2.5"><RolloutBadge rollout={r.rollout} /></td>
                  <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" style={{ color: '#64748b' }}>{r.releaseNote || '—'}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: '#64748b' }}>{r.reviewer || '—'}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleWatchlist(r.id)}
                      className="text-xs px-2 py-1 rounded-lg border transition-colors"
                      style={{ color: '#ef4444', borderColor: '#fecaca' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '' }}
                    >
                      ✕ Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
