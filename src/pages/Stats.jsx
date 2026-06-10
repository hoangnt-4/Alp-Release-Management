import React, { useMemo, useState } from 'react'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { useLocation } from 'react-router-dom'

// ─── Gantt Chart ──────────────────────────────────────────────────────────────

const MILESTONE_OPTS = [
  { key: 'figmaStart',  label: 'Figma Start' },
  { key: 'figmaEnd',    label: 'Figma End' },
  { key: 'devStart',    label: 'Dev Start' },
  { key: 'testStart',   label: 'Test Start' },
  { key: 'liveFullAds', label: 'Live full ads' },
  { key: 'liveIap',     label: 'Live iAP' },
]

const BAR_COLOR = '#4f72f5'

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function GanttChart({ timelines, apps }) {
  const [startKey, setStartKey] = useState('testStart')
  const [endKey,   setEndKey]   = useState('liveFullAds')

  // Build rows with data (both milestones present), and no-data rows
  const { rows, noDataRows } = useMemo(() => {
    const withData = [], noData = []
    apps.forEach(app => {
      const key = app.hnId?.toLowerCase() || app.alpId?.toLowerCase() || ''
      const tl  = timelines[key] || null
      const s   = tl?.[startKey]
      const e   = tl?.[endKey]
      const label = app.alpId || app.hnId || '—'
      if (!s || !e || e <= s) { noData.push({ label }); return }
      withData.push({ label, start: s, end: e, days: diffDays(s, e) })
    })
    withData.sort((a, b) => b.days - a.days) // longest first
    return { rows: withData, noDataRows: noData }
  }, [timelines, apps, startKey, endKey])

  const maxDays = useMemo(() => Math.max(...rows.map(r => r.days), 1), [rows])

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold">Gantt — Timeline apps</p>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span style={{ color: '#64748b' }}>Start date</span>
            <select className="input text-xs py-1" value={startKey} onChange={e => setStartKey(e.target.value)}>
              {MILESTONE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#64748b' }}>End date</span>
            <select className="input text-xs py-1" value={endKey} onChange={e => setEndKey(e.target.value)}>
              {MILESTONE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Không có app nào có đủ 2 mốc này</p>
      ) : (
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="space-y-1" style={{ minWidth: 480 }}>
            {/* Apps with data */}
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="shrink-0 text-right truncate" style={{ width: 140, color: '#475569' }}>{r.label}</div>
                <div className="relative flex-1 h-6 rounded" style={{ background: '#f1f5f9' }}>
                  <div
                    className="absolute top-0.5 bottom-0.5 left-0 rounded flex items-center px-2 gap-2"
                    style={{ width: `${(r.days / maxDays) * 100}%`, background: BAR_COLOR, minWidth: 28 }}
                  >
                    <span className="text-white text-xs font-semibold shrink-0">{r.days} days</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Divider */}
            {noDataRows.length > 0 && (
              <div className="flex items-center gap-2 pt-2 pb-1">
                <div className="shrink-0" style={{ width: 140 }} />
                <div className="flex-1 border-t border-dashed" style={{ borderColor: '#e2e8f0' }} />
              </div>
            )}

            {/* Apps without data */}
            {noDataRows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs opacity-40">
                <div className="shrink-0 text-right truncate" style={{ width: 140, color: '#94a3b8' }}>{r.label}</div>
                <div className="flex-1 h-6 rounded" style={{ background: '#f1f5f9' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: '#94a3b8' }}>
        {rows.length} app có data · {noDataRows.length} chưa có · {MILESTONE_OPTS.find(o => o.key === startKey)?.label} → {MILESTONE_OPTS.find(o => o.key === endKey)?.label}
      </p>
    </div>
  )
}

function BarChart({ data, color = '#0d9488', height = 120 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1 h-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs font-mono font-semibold" style={{ color: '#64748b' }}>{d.value || ''}</span>
          <div
            className="w-full rounded-t transition-all duration-300"
            style={{ height: `${(d.value / max) * (height - 28)}px`, background: color, minHeight: d.value ? 4 : 0 }}
          />
          <span className="text-xs truncate w-full text-center" style={{ color: '#94a3b8', fontSize: 10 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ slices, size = 140 }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (!total) return <div className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Không có dữ liệu</div>
  const r = 46, cx = size / 2, cy = size / 2
  let cumAngle = -Math.PI / 2
  const paths = slices.map(s => {
    const a = (s.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    const x2 = cx + r * Math.cos(cumAngle + a)
    const y2 = cy + r * Math.sin(cumAngle + a)
    const large = a > Math.PI ? 1 : 0
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    const path = { d, color: s.color, label: s.label, value: s.value }
    cumAngle += a
    return path
  })
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />)}
        <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e2235">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: p.color }} />
            <span style={{ color: '#64748b' }}>{p.label}</span>
            <span className="font-semibold ml-1">{p.value}</span>
            <span style={{ color: '#94a3b8' }}>({Math.round(p.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PieChart({ slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (!total) return <div className="text-sm text-center py-8" style={{ color: '#94a3b8' }}>Không có dữ liệu</div>
  const size = 220, cx = size / 2, cy = size / 2, r = 95
  let cumAngle = -Math.PI / 2
  const paths = slices.map(s => {
    const a = (s.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    const x2 = cx + r * Math.cos(cumAngle + a)
    const y2 = cy + r * Math.sin(cumAngle + a)
    const large = a > Math.PI ? 1 : 0
    const path = { d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: s.color, label: s.label, value: s.value }
    cumAngle += a
    return path
  })
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2" />)}
      </svg>
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: p.color }} />
            <span style={{ color: '#64748b' }}>{p.label}</span>
            <span className="font-semibold">{p.value}</span>
            <span style={{ color: '#94a3b8' }}>({Math.round(p.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HBarChart({ data, color = '#0d9488', max: maxProp }) {
  const max = maxProp || Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-32 truncate text-right shrink-0" style={{ color: '#64748b' }}>{d.label}</span>
          <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="w-6 text-right font-mono" style={{ color: '#94a3b8' }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Stats() {
  const { releases, apps, timelines, loading } = useReleasesStore()
  const location = useLocation()
  const view = new URLSearchParams(location.search).get('view') || 'stats'

  const byMonth = useMemo(() => {
    const map = {}
    releases.forEach(r => {
      if (!r.releaseDate) return
      const m = r.releaseDate.slice(0, 7) // YYYY-MM
      map[m] = (map[m] || 0) + 1
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([k, v]) => ({ label: k.slice(2).replace('-', '/'), value: v })) // YY/MM label
  }, [releases])

  const byStatus = useMemo(() => {
    const COLORS = { 'Checked': '#0d9488', 'Updated': '#3b82f6', 'Pending Review': '#f59e0b', '': '#e2e8f0' }
    const LABELS = { '': 'Chưa có status' }
    const map = {}
    releases.forEach(r => { const s = r.status || ''; map[s] = (map[s] || 0) + 1 })
    return Object.entries(map).map(([s, v]) => ({ label: LABELS[s] || s, value: v, color: COLORS[s] || '#94a3b8' }))
  }, [releases])

  const byPlatform = useMemo(() => {
    const map = {}
    releases.forEach(r => { const p = r.platform || 'Other'; map[p] = (map[p] || 0) + 1 })
    const COLORS = { iOS: '#93c5fd', Android: '#4ade80', Other: '#c4b5fd' }
    return Object.entries(map).map(([p, v]) => ({ label: p, value: v, color: COLORS[p] || '#94a3b8' }))
  }, [releases])

  const topApps = useMemo(() => {
    const map = {}
    releases.forEach(r => { const a = r.appName || r.app || 'Unknown'; map[a] = (map[a] || 0) + 1 })
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
  }, [releases])

  const topRequestApps = useMemo(() => {
    const map = {}
    releases
      .filter(r => r.releaseNote?.toLowerCase().includes('update request'))
      .forEach(r => { const a = r.appName || r.app || 'Unknown'; map[a] = (map[a] || 0) + 1 })
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
  }, [releases])

  if (loading) return <div className="p-6 text-sm" style={{ color: '#94a3b8' }}>Đang tải...</div>

  if (view === 'gantt') {
    return (
      <div className="p-6">
        <GanttChart timelines={timelines} apps={apps} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-semibold">Thống kê</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4">Phát hành theo tháng (12 tháng gần nhất)</p>
          {byMonth.length ? <BarChart data={byMonth} height={150} /> : <p className="text-sm py-8 text-center" style={{ color: '#94a3b8' }}>Không có dữ liệu</p>}
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4">Phân bổ theo status</p>
          <DonutChart slices={byStatus} size={130} />
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4">Nền tảng (iOS vs Android)</p>
          <PieChart slices={byPlatform} />
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4">Top 10 app nhiều bản phát hành nhất</p>
          {topApps.length ? <HBarChart data={topApps} /> : <p className="text-sm py-8 text-center" style={{ color: '#94a3b8' }}>Không có dữ liệu</p>}
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4">Top 10 app có Request Update nhiều nhất</p>
          {topRequestApps.length
            ? <HBarChart data={topRequestApps} color="#d97706" />
            : <p className="text-sm py-8 text-center" style={{ color: '#94a3b8' }}>Không có dữ liệu</p>}
        </div>
      </div>
    </div>
  )
}
