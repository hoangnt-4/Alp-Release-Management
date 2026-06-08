import React, { useState, useMemo } from 'react'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { PlatformBadge } from './Dashboard'

export default function Apps() {
  const { apps, loading } = useReleasesStore()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return apps
    return apps.filter(a =>
      a.alpId.toLowerCase().includes(q) ||
      (a.hnId || '').toLowerCase().includes(q) ||
      (a.platform || '').toLowerCase().includes(q) ||
      (a.appLink || '').toLowerCase().includes(q)
    )
  }, [apps, search])

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => a.alpId.localeCompare(b.alpId)),
    [filtered]
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Apps</h1>
        <span className="text-sm" style={{ color: '#94a3b8' }}>{filtered.length} apps</span>
      </div>

      <div className="card p-3">
        <input
          className="input w-72 text-xs py-1.5"
          placeholder="Tìm theo Alp ID, HN ID, Platform..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50 text-left">
                {['#', 'Alp ID', 'HN ID', 'Platform', 'App Link'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-xs font-medium" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200">
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-sm" style={{ color: '#94a3b8' }}>Không có kết quả</td></tr>
              ) : sorted.map((a, i) => (
                <tr key={a.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#94a3b8' }}>{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-xs">{String(a.alpId || '') || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: '#64748b' }}>{String(a.hnId || '') || '—'}</td>
                  <td className="px-3 py-2.5"><PlatformBadge platform={String(typeof a.platform === 'object' ? (a.platform?.text || '') : (a.platform || ''))} /></td>
                  <td className="px-3 py-2.5 text-xs">
                    {a.appLinkUrl ? (
                      <a href={String(a.appLinkUrl)} target="_blank" rel="noopener noreferrer"
                        className="hover:underline truncate block max-w-[280px]"
                        style={{ color: '#0d9488' }}>
                        {String(a.appLink || a.appLinkUrl)}
                      </a>
                    ) : a.appLink ? (
                      <span className="truncate block max-w-[280px]" style={{ color: '#64748b' }}>{String(a.appLink)}</span>
                    ) : (
                      <span style={{ color: '#cbd5e1' }}>—</span>
                    )}
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
