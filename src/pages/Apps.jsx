import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { useLocation } from 'react-router-dom'
import AppDetailModal from '../components/AppDetailModal'
import StoreAccountSidebar from '../components/StoreAccountSidebar'
import { FEATURES } from '../lib/features'

const STATUS_STYLES = {
  RUNNING:     { bg: '#dcfce7', color: '#166534' },
  PENDING:     { bg: '#fef9c3', color: '#854d0e' },
  UNPUBLISHED: { bg: '#f1f5f9', color: '#475569' },
  ABANDONED:   { bg: '#fee2e2', color: '#991b1b' },
  NEW:         { bg: '#e0f2fe', color: '#0369a1' },
  'UI FIGMA':  { bg: '#ede9fe', color: '#6d28d9' },
  'WAIT ASSIGN': { bg: '#fce7f3', color: '#9d174d' },
  CODING:      { bg: '#d1fae5', color: '#065f46' },
  REMOVED:     { bg: '#f1f5f9', color: '#64748b' },
}

export function AppStatusBadge({ status }) {
  if (!status) return null
  const s = STATUS_STYLES[status.toUpperCase()] || { bg: '#f1f5f9', color: '#475569' }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
      style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

const MILESTONES = [
  { key: 'figmaStart',  label: 'Figma',    color: '#a78bfa' },
  { key: 'devStart',    label: 'Dev',      color: '#60a5fa' },
  { key: 'testStart',   label: 'Test',     color: '#34d399' },
  { key: 'liveFullAds', label: 'Live Ads', color: '#fb923c' },
  { key: 'liveIap',     label: 'Live iAP', color: '#f43f5e' },
]

function MiniTimeline({ tl }) {
  if (!tl) return <span className="text-xs" style={{ color: '#cbd5e1' }}>—</span>

  // Find latest completed milestone
  let latest = null
  for (const m of [...MILESTONES].reverse()) {
    if (tl[m.key]) { latest = m; break }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dots */}
      <div className="flex items-center gap-1">
        {MILESTONES.map(m => (
          <div key={m.key}
            title={`${m.label}${tl[m.key] ? ': ' + tl[m.key] : ''}`}
            className="w-2 h-2 rounded-full"
            style={{ background: tl[m.key] ? m.color : '#e2e8f0' }}
          />
        ))}
      </div>
      {/* Current stage */}
      {latest && (
        <span className="text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: latest.color + '20', color: latest.color }}>
          {latest.label}
        </span>
      )}
    </div>
  )
}

function MultiSelectDropdown({ label, options, selected, setSelected }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const toggle = (v) => setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  const rect = btnRef.current?.getBoundingClientRect()
  const displayLabel = selected.length === 0 ? label : `${label} (${selected.length})`
  return (
    <div className="shrink-0" ref={btnRef}>
      <button
        className="input text-xs py-1 px-2 flex items-center gap-1"
        style={{ width: 120, justifyContent: 'space-between', background: selected.length ? '#f0fdf4' : '', borderColor: selected.length ? '#0d9488' : '', color: selected.length ? '#0d9488' : '' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{displayLabel}</span><span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && ReactDOM.createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: (rect?.bottom ?? 0) + 4, left: rect?.left ?? 0, zIndex: 9999, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', minWidth: 160, overflow: 'hidden' }}>
            {options.map(({ value, label: optLabel }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#1e293b' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} style={{ accentColor: '#0d9488' }} />
                {optLabel}
              </label>
            ))}
            {selected.length > 0 && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                <button style={{ fontSize: 11, color: '#ef4444' }} onClick={() => { setSelected([]); setOpen(false) }}>Xoá chọn</button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

function ConfigNotiDropdown({ filterConfigNoti, setFilterConfigNoti, configOpts, showOpts, localNotiOpts }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const toggle = (type, value) => setFilterConfigNoti(prev => {
    const exists = prev.some(f => f.type === type && f.value === value)
    return exists ? prev.filter(f => !(f.type === type && f.value === value)) : [...prev, { type, value }]
  })
  const isChecked = (type, value) => filterConfigNoti.some(f => f.type === type && f.value === value)
  const groups = [
    { label: 'Config Intro', type: 'config', opts: configOpts },
    { label: 'Show Intro',   type: 'show',   opts: showOpts },
    { label: 'Local Noti',   type: 'noti',   opts: localNotiOpts },
  ]
  const label = filterConfigNoti.length === 0 ? 'Config & Noti' : `Config & Noti (${filterConfigNoti.length})`
  const rect = btnRef.current?.getBoundingClientRect()
  return (
    <div className="shrink-0" ref={btnRef}>
      <button
        className="input text-xs py-1 px-2 flex items-center gap-1"
        style={{ width: 148, justifyContent: 'space-between', background: filterConfigNoti.length ? '#f0fdf4' : '', borderColor: filterConfigNoti.length ? '#0d9488' : '', color: filterConfigNoti.length ? '#0d9488' : '' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{label}</span><span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && ReactDOM.createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'fixed', top: (rect?.bottom ?? 0) + 4, left: rect?.left ?? 0, zIndex: 9999, background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', minWidth: 200, overflow: 'hidden' }}>
            {groups.map(g => (
              <div key={g.label}>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, background: '#f8fafc', color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{g.label}</div>
                {g.opts.map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: '#1e293b' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <input type="checkbox" checked={isChecked(g.type, v)} onChange={() => toggle(g.type, v)} style={{ accentColor: '#0d9488' }} />
                    {v}
                  </label>
                ))}
              </div>
            ))}
            <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{filterConfigNoti.length} đã chọn</span>
              {filterConfigNoti.length > 0 && (
                <button style={{ fontSize: 11, color: '#ef4444' }} onClick={() => { setFilterConfigNoti([]); setOpen(false) }}>Xoá chọn</button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export default function Apps() {
  const { apps, timelines, activities, monet, loading } = useReleasesStore()
  const location = useLocation()
  const urlStatus = new URLSearchParams(location.search).get('status') || ''

  const [search, setSearch]                 = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterTimeline, setFilterTimeline] = useState('')
  const [filterStatus, setFilterStatus]     = useState(urlStatus)
  const [filterRequest, setFilterRequest]   = useState(false)
  const [filterCrash, setFilterCrash]       = useState(false)
  const [filterConfigNoti, setFilterConfigNoti] = useState([]) // [{type:'show'|'config'|'noti', value}]
  const [filterIap, setFilterIap]               = useState('')
  const [filterFlag, setFilterFlag]             = useState([])
  // compat aliases (keep filter logic working)
  const filterShow      = ''
  const filterConfig    = ''
  const filterLocalNoti = ''

  // Sync filterStatus when URL changes (sidebar sub-tab click)
  useEffect(() => { setFilterStatus(urlStatus) }, [urlStatus])
  const [sort, setSort] = useState({ key: 'hnId', dir: 'asc' })
  const toggleSort = useCallback((key) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' })), [])
  const [detailApp, setDetailApp] = useState(null)
  const [accountSidebar, setAccountSidebar] = useState(null) // store account name string

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return apps.filter(a => {
      if (q && !(
        a.alpId.toLowerCase().includes(q) ||
        (a.hnId || '').toLowerCase().includes(q) ||
        (a.platform || '').toLowerCase().includes(q) ||
        (a.appLink || '').toLowerCase().includes(q)
      )) return false
      if (filterPlatform) {
        const p = typeof a.platform === 'object' ? (a.platform?.text || '') : (a.platform || '')
        if (!p.toLowerCase().includes(filterPlatform.toLowerCase())) return false
      }
      if (filterStatus) {
        const s = (a.status || '').toUpperCase()
        if (s !== filterStatus.toUpperCase()) return false
      }
      if (filterTimeline) {
        const tl = timelines[a.hnId?.toLowerCase()] || timelines[a.alpId?.toLowerCase()]
        if (filterTimeline === 'none'  && tl) return false
        if (filterTimeline === 'none'  && !tl) return true
        if (!tl) return false
        if (filterTimeline === 'figma' && !(tl.figmaStart && !tl.devStart)) return false
        if (filterTimeline === 'dev'   && !(tl.devStart && !tl.testStart)) return false
        if (filterTimeline === 'test'  && !(tl.testStart && !tl.liveFullAds && !tl.liveIap)) return false
        if (filterTimeline === 'live_ads' && !tl.liveFullAds) return false
        if (filterTimeline === 'live_iap' && !tl.liveIap) return false
      }
      if (filterRequest) {
        const act = activities[a.hnId?.toLowerCase()] || activities[a.alpId?.toLowerCase()]
        if (!act?.requestUpdate) return false
      }
      if (filterCrash) {
        const act = activities[a.hnId?.toLowerCase()] || activities[a.alpId?.toLowerCase()]
        if (!act?.fixCrashes) return false
      }
      if (filterConfigNoti.length > 0 || filterIap !== '') {
        const act = activities[a.hnId?.toLowerCase()] || activities[a.alpId?.toLowerCase()]
        if (filterConfigNoti.length > 0) {
          // must match at least one selected item per type group (OR within group, AND across groups)
          const showSel   = filterConfigNoti.filter(f => f.type === 'show')
          const configSel = filterConfigNoti.filter(f => f.type === 'config')
          const notiSel   = filterConfigNoti.filter(f => f.type === 'noti')
          if (showSel.length   > 0 && !showSel.some(f   => (act?.show      || '') === f.value)) return false
          if (configSel.length > 0 && !configSel.some(f => (act?.config    || '') === f.value)) return false
          if (notiSel.length   > 0 && !notiSel.some(f   => (act?.localNoti || '') === f.value)) return false
        }
        if (filterIap === 'live' && !act?.iap)  return false
        if (filterIap === 'no'   &&  act?.iap)  return false
      }
      if (filterFlag.includes('ad2')     && !a.ad2)          return false
      if (filterFlag.includes('noMedia') && !a.nativeNoMedia) return false
      if (filterFlag.includes('freezed') && !a.freezed)       return false
      return true
    })
  }, [apps, search, filterPlatform, filterTimeline, filterStatus, filterRequest, filterCrash, filterConfigNoti, filterIap, filterFlag, timelines, activities])

  // Unique option values from activities
  const actList = useMemo(() => Object.values(activities), [activities])
  const showOpts      = useMemo(() => [...new Set(actList.map(a => a.show).filter(Boolean))].sort(), [actList])
  const configOpts    = useMemo(() => [...new Set(actList.map(a => a.config).filter(Boolean))].sort(), [actList])
  const localNotiOpts = useMemo(() => [...new Set(actList.map(a => a.localNoti).filter(Boolean))].sort(), [actList])

  const sorted = useMemo(() => {
    const getTlStage = (a) => {
      const tl = timelines[a.hnId?.toLowerCase()] || timelines[a.alpId?.toLowerCase()]
      if (!tl) return ''
      if (tl.liveIap || tl.liveFullAds) return 'live'
      if (tl.testStart) return 'test'
      if (tl.devStart)  return 'dev'
      if (tl.figmaStart) return 'figma'
      return ''
    }
    return [...filtered].sort((a, b) => {
      let av = '', bv = ''
      if (sort.key === 'alpId')    { av = a.alpId || ''; bv = b.alpId || '' }
      if (sort.key === 'hnId')     { av = a.hnId  || ''; bv = b.hnId  || '' }
      if (sort.key === 'platform') { av = a.platform || ''; bv = b.platform || '' }
      if (sort.key === 'status')   { av = a.status  || ''; bv = b.status  || '' }
      if (sort.key === 'timeline') { av = getTlStage(a);   bv = getTlStage(b) }
      const cmp = av.localeCompare(bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sort, timelines])

  const getTl = (a) =>
    timelines[a.hnId?.toLowerCase()] || timelines[a.alpId?.toLowerCase()] || null

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Apps</h1>
          <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{filtered.length} / {apps.length} apps</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card px-2.5 py-2 flex flex-nowrap gap-1.5 items-center overflow-x-auto">
        <input
          className="input text-xs py-1 px-2 shrink-0"
          style={{ width: 168 }}
          placeholder="Tìm theo Alp ID, HN ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input text-xs py-1 px-2 shrink-0" style={{ width: 130 }} value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">Tất cả platform</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
        </select>
        <select className="input text-xs py-1 px-2 shrink-0" style={{ width: 148 }} value={filterTimeline} onChange={e => setFilterTimeline(e.target.value)}>
          <option value="">Tất cả giai đoạn</option>
          <option value="none">Chưa có timeline</option>
          <option value="figma">Figma</option>
          <option value="dev">Dev</option>
          <option value="test">Testing</option>
          <option value="live_ads">Live Full Ads</option>
          <option value="live_iap">Live iAP</option>
        </select>
        <select className="input text-xs py-1 px-2 shrink-0" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tất cả status</option>
          <option value="NEW">NEW</option>
          <option value="UI FIGMA">UI FIGMA</option>
          <option value="WAIT ASSIGN">WAIT ASSIGN</option>
          <option value="CODING">CODING</option>
          <option value="RUNNING">RUNNING</option>
          <option value="PENDING">PENDING</option>
          <option value="REMOVED">REMOVED</option>
          <option value="UNPUBLISHED">UNPUBLISHED</option>
          <option value="ABANDONED">ABANDONED</option>
        </select>
        {/* Config & Noti multi-select */}
        <ConfigNotiDropdown
          filterConfigNoti={filterConfigNoti}
          setFilterConfigNoti={setFilterConfigNoti}
          configOpts={configOpts}
          showOpts={showOpts}
          localNotiOpts={localNotiOpts}
        />
        {/* Flags */}
        <MultiSelectDropdown
          label="Flags"
          options={[{ value: 'ad2', label: 'Ad 2' }, { value: 'noMedia', label: 'Native no media' }, { value: 'freezed', label: 'Freezed' }]}
          selected={filterFlag}
          setSelected={setFilterFlag}
        />
        {/* iAP */}
        <select className="input text-xs py-1 px-2 shrink-0" style={{ width: 80 }} value={filterIap} onChange={e => setFilterIap(e.target.value)}>
          <option value="">iAP</option>
          <option value="live">Live</option>
          <option value="no">No</option>
        </select>
        <button
          className="text-xs px-2 py-1 rounded-lg border transition-colors font-medium shrink-0 whitespace-nowrap"
          style={filterRequest ? { background: '#fef3c7', color: '#d97706', borderColor: '#fcd34d' } : { borderColor: '#e2e8f0', color: '#64748b' }}
          onClick={() => setFilterRequest(v => !v)}
        >⚡ Request Update</button>
        <button
          className="text-xs px-2 py-1 rounded-lg border transition-colors font-medium shrink-0 whitespace-nowrap"
          style={filterCrash ? { background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' } : { borderColor: '#e2e8f0', color: '#64748b' }}
          onClick={() => setFilterCrash(v => !v)}
        >🔴 Crash</button>
        {(search || filterPlatform || filterTimeline || filterStatus || filterRequest || filterCrash || filterConfigNoti.length || filterIap || filterFlag.length) && (
          <button
            className="text-xs px-2 py-1 rounded-lg border border-surface-200 hover:bg-surface-100 shrink-0 whitespace-nowrap"
            style={{ color: '#64748b' }}
            onClick={() => { setSearch(''); setFilterPlatform(''); setFilterTimeline(''); setFilterStatus(''); setFilterRequest(false); setFilterCrash(false); setFilterConfigNoti([]); setFilterIap(''); setFilterFlag([]) }}
          >Xoá filter</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 text-left" style={{ background: '#f8fafc' }}>
                {[
                  { label: '#',          key: null },
                  { label: 'App',        key: 'alpId' },
                  { label: 'HN ID',      key: 'hnId' },
                  { label: 'Local Noti', key: null },
                  { label: 'Status',     key: 'status' },
                  { label: 'Timeline',   key: 'timeline' },
                  { label: 'Store',      key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-semibold select-none ${key ? 'cursor-pointer hover:text-slate-700' : ''}`}
                    style={{ color: sort.key === key ? '#0d9488' : '#64748b' }}
                    onClick={() => key && toggleSort(key)}
                  >
                    {label}
                    {key && sort.key === key && (
                      <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>Đang tải...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: '#94a3b8' }}>Không có kết quả</td></tr>
              ) : sorted.map((a, i) => {
                const tl = getTl(a)
                const platform = typeof a.platform === 'object' ? (a.platform?.text || '') : (a.platform || '')
                const act = activities[a.hnId?.toLowerCase()] || activities[a.alpId?.toLowerCase()]
                return (
                  <tr
                    key={a.id}
                    className="cursor-pointer transition-colors"
                    style={{ ':hover': {} }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => setDetailApp(a)}
                  >
                    <td className="px-4 py-3 font-mono text-xs w-10" style={{ color: '#94a3b8' }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative w-7 h-7 shrink-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: platform.toLowerCase().includes('android') ? '#34a853' : '#007aff', opacity: a.freezed ? 0.45 : 1 }}>
                            {platform.toLowerCase().includes('android') ? 'A' : 'i'}
                          </div>
                          {a.freezed && (
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1 }}>🧊</span>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs" style={{ color: '#1e293b' }}>
                            {String(a.alpId || '') || '—'}
                          </span>
                        </div>
                        {FEATURES.monet && (() => { const m = monet[a.alpId?.toLowerCase()] || monet[a.hnId?.toLowerCase()]; return m && Object.keys(m.months || {}).length > 0 })() && (
                          <span className="group relative inline-flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3b82f6' }} />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 hidden group-hover:block text-xs whitespace-nowrap pointer-events-none" style={{ color: '#64748b' }}>Monet</span>
                          </span>
                        )}
                        {act?.fixCrashes && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{ background: '#fee2e2', color: '#dc2626' }}>🔴 Crash</span>
                        )}
                        {act?.requestUpdate && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{ background: '#fef3c7', color: '#d97706' }}>⚡ Request</span>
                        )}
                        {a.freezed && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0"
                            style={{ background: '#eff6ff', color: '#3b82f6' }}>🧊 Freezed</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: '#64748b' }}>
                      {String(a.hnId || '') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const LOCAL_NOTI_BADGE = {
                          'Live':          { bg: '#dcfce7', color: '#16a34a', label: '🔔 Live' },
                          'Required':      { bg: '#fef3c7', color: '#b45309', label: '🔔 Required' },
                          'Ready for Dev': { bg: '#dbeafe', color: '#1d4ed8', label: '🔔 Ready for Dev' },
                          'Writing':       { bg: '#e0f2fe', color: '#0369a1', label: '🔔 Writing' },
                          'Coding':        { bg: '#ede9fe', color: '#6d28d9', label: '🔔 Coding' },
                        }
                        const s = LOCAL_NOTI_BADGE[act?.localNoti]
                        return s
                          ? <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                          : <span style={{ color: '#cbd5e1' }}>—</span>
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <AppStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <MiniTimeline tl={tl} />
                    </td>
                    <td className="px-4 py-3 text-xs" onClick={e => e.stopPropagation()}>
                      {a.appLinkUrl ? (
                        <a href={String(a.appLinkUrl)} target="_blank" rel="noopener noreferrer"
                          className="hover:underline truncate block max-w-[200px]"
                          style={{ color: '#0d9488' }}>
                          {String(a.appLink || a.appLinkUrl)}
                        </a>
                      ) : a.appLink ? (
                        <span className="truncate block max-w-[200px]" style={{ color: '#94a3b8' }}>{String(a.appLink)}</span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailApp && (
        <AppDetailModal app={detailApp} onClose={() => setDetailApp(null)} />
      )}

      {accountSidebar && (
        <StoreAccountSidebar
          account={accountSidebar}
          apps={apps || []}
          onClose={() => setAccountSidebar(null)}
          onSelectApp={a => { setAccountSidebar(null); setDetailApp(a) }}
        />
      )}
    </div>
  )
}
