import React, { useState, useMemo, useRef, useEffect } from 'react'
import { PlatformBadge } from '../pages/Dashboard'

export default function AppCombobox({ apps, selectedApp, onSelect, placeholder = 'Tìm app...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q
      ? apps.filter(a => a.alpId.toLowerCase().includes(q) || (a.hnId || '').toLowerCase().includes(q))
      : apps
  }, [apps, query])

  const handleSelect = (app) => { onSelect(app); setQuery(''); setOpen(false) }
  const handleClear  = () => { onSelect(null); setQuery(''); setOpen(true) }

  return (
    <div ref={ref} className="relative">
      {selectedApp ? (
        <div className="input flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PlatformBadge platform={selectedApp.platform} />
            <span className="font-medium text-sm truncate">{selectedApp.alpId}</span>
            {selectedApp.hnId && <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{selectedApp.hnId}</span>}
          </div>
          <button type="button" onClick={handleClear} className="shrink-0 text-xs" style={{ color: '#94a3b8' }}>✕</button>
        </div>
      ) : (
        <input
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      )}
      {open && !selectedApp && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={{ color: '#94a3b8' }}>Không tìm thấy app</div>
          ) : filtered.map(a => (
            <button
              key={a.id}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-50 transition-colors"
              onMouseDown={() => handleSelect(a)}
            >
              <PlatformBadge platform={a.platform} />
              <span className="flex-1 text-sm font-medium">{a.alpId}</span>
              {a.hnId && <span className="text-xs font-mono shrink-0" style={{ color: '#94a3b8' }}>{a.hnId}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
