import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useReleasesStore } from '../hooks/useReleasesStore'
import { useLocation, useNavigate } from 'react-router-dom'

// ─── Gantt Chart ──────────────────────────────────────────────────────────────

const MILESTONE_OPTS = [
  { key: 'figmaStart',  label: 'Figma Start' },
  { key: 'figmaEnd',    label: 'Figma End' },
  { key: 'devStart',    label: 'Dev Start' },
  { key: 'testStart',   label: 'Test Start' },
  { key: 'liveFullAds', label: 'Live full ads' },
  { key: 'liveIap',     label: 'Live iAP' },
]

function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function GanttChart({ timelines, apps }) {
  const [startKey, setStartKey] = useState('testStart')
  const [endKey,   setEndKey]   = useState('liveFullAds')

  const { rows, noDataRows } = useMemo(() => {
    const withData = [], noData = []
    apps.forEach(app => {
      const key = app.hnId?.toLowerCase() || app.alpId?.toLowerCase() || ''
      const tl  = timelines[key] || null
      const s   = tl?.[startKey]
      const e   = tl?.[endKey]
      const label = app.alpId || app.hnId || '—'
      const platform = typeof app.platform === 'object' ? app.platform?.text : (app.platform || '')
      if (!s || !e || e <= s) { noData.push({ label, platform }); return }
      withData.push({ label, start: s, end: e, days: diffDays(s, e), platform })
    })
    withData.sort((a, b) => b.days - a.days)
    return { rows: withData, noDataRows: noData }
  }, [timelines, apps, startKey, endKey])

  const maxDays = useMemo(() => Math.max(...rows.map(r => r.days), 1), [rows])

  const selectStyle = {
    padding: '5px 10px', fontSize: 12, borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
    color: '#fff', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
      {/* Dark header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>Gantt — Timeline apps</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{rows.length} apps có data · {noDataRows.length} chưa có</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Start date</span>
              <select style={selectStyle} value={startKey} onChange={e => setStartKey(e.target.value)}>
                {MILESTONE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>→</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>End date</span>
              <select style={selectStyle} value={endKey} onChange={e => setEndKey(e.target.value)}>
                {MILESTONE_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Không có app nào có đủ 2 mốc này</div>
      ) : (
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          {rows.map((r, i) => {
            const isA = r.platform.toLowerCase().includes('android')
            const dc  = isA ? '#34a853' : '#007aff'
            const pct = Math.max((r.days / maxDays) * 100, 2)
            // Color: teal for top 3, brand blue for rest, fading opacity
            const barColor = i < 3
              ? `linear-gradient(90deg, #0d9488 0%, #2dd4bf 100%)`
              : `linear-gradient(90deg, #4361ee 0%, #738ef5 100%)`
            return (
              <div key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '7px 20px', borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* App identity */}
                <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: dc, color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{isA ? 'A' : 'i'}</span>
                  <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                </div>
                {/* Bar track */}
                <div style={{ flex: 1, position: 'relative', height: 26, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', top: 3, bottom: 3, left: 0, borderRadius: 4,
                    background: barColor, width: `${pct}%`, minWidth: 32,
                    display: 'flex', alignItems: 'center', paddingLeft: 10,
                  }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.days} days</span>
                  </div>
                </div>
                {/* Days label */}
                <span style={{ width: 36, flexShrink: 0, textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{r.days}d</span>
              </div>
            )
          })}

          {noDataRows.length > 0 && (
            <>
              <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chưa có data</span>
                <div style={{ flex: 1, borderTop: '1px dashed #e2e8f0' }} />
              </div>
              {noDataRows.map((r, i) => {
                const isA = r.platform.toLowerCase().includes('android')
                const dc  = isA ? '#34a853' : '#007aff'
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '5px 20px', opacity: 0.35 }}>
                    <div style={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: dc, color: '#fff', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{isA ? 'A' : 'i'}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                    </div>
                    <div style={{ flex: 1, height: 20, borderRadius: 4, background: '#f1f5f9' }} />
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
          {MILESTONE_OPTS.find(o => o.key === startKey)?.label} → {MILESTONE_OPTS.find(o => o.key === endKey)?.label}
          {rows.length > 0 && <> · max <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{maxDays}</span> ngày</>}
        </p>
      </div>
    </div>
  )
}

function BarChart({ data, color = '#0d9488', height = 140 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const innerH = height - 36
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height }}>
      {data.map((d, i) => {
        const barH = d.value ? Math.max(6, Math.round((d.value / max) * innerH)) : 0
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: d.value ? '#0f172a' : 'transparent', fontFamily: 'monospace', lineHeight: 1 }}>{d.value}</span>
            <div style={{ width: '100%', borderRadius: '5px 5px 0 0', background: `linear-gradient(180deg, ${color} 0%, ${color}bb 100%)`, height: barH, minHeight: d.value ? 4 : 0, transition: 'height 0.3s' }} />
            <span style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{d.label}</span>
          </div>
        )
      })}
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth="2.5" />)}
        <circle cx={cx} cy={cy} r={r * 0.56} fill="white" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {paths.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#475569' }}>{p.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginLeft: 2, fontFamily: 'monospace' }}>{p.value}</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>({Math.round(p.value / total * 100)}%)</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 140, flexShrink: 0, textAlign: 'right', color: '#475569', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
          <div style={{ flex: 1, borderRadius: 6, overflow: 'hidden', background: '#f1f5f9', height: 10 }}>
            <div style={{ height: '100%', borderRadius: 6, background: color, width: `${(d.value / max) * 100}%`, transition: 'width 0.4s' }} />
          </div>
          <span style={{ width: 28, flexShrink: 0, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#475569', fontSize: 12 }}>{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Release Timeline ─────────────────────────────────────────────────────────

function ReleaseTimeline({ releases, apps }) {
  const [selected, setSelected] = useState(null)
  const [tooltip, setTooltip]   = useState(null) // { appName, date, rels, x, y }

  // All unique sorted dates (recent 40)
  const dates = useMemo(() => {
    const s = [...new Set(releases.filter(r => r.releaseDate).map(r => r.releaseDate))].sort()
    return s.slice(-40)
  }, [releases])

  // Map: appKey -> date -> releases[]
  const releaseMap = useMemo(() => {
    const m = {}
    releases.forEach(r => {
      if (!r.releaseDate) return
      const key = (r.appName || r.app || '').toLowerCase()
      if (!m[key]) m[key] = {}
      if (!m[key][r.releaseDate]) m[key][r.releaseDate] = []
      m[key][r.releaseDate].push(r)
    })
    return m
  }, [releases])

  // Apps that have at least 1 release in the visible dates
  const visibleApps = useMemo(() => {
    const dateSet = new Set(dates)
    return apps.filter(app => {
      const key = (app.alpId || app.hnId || '').toLowerCase()
      const appRels = releaseMap[key] || {}
      return Object.keys(appRels).some(d => dateSet.has(d))
    }).sort((a, b) => (a.alpId || '').localeCompare(b.alpId || ''))
  }, [apps, dates, releaseMap])

  // Group dates by year → month
  const yearGroups = useMemo(() => {
    const years = {}
    dates.forEach((d, i) => {
      const y = d.slice(0, 4)
      const m = d.slice(0, 7)
      if (!years[y]) years[y] = {}
      if (!years[y][m]) years[y][m] = []
      years[y][m].push({ date: d, idx: i })
    })
    return years
  }, [dates])

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthLabel = ym => MONTH_NAMES[parseInt(ym.slice(5, 7), 10) - 1]
  const COL_W = 36

  const handleDotEnter = (e, appName, date, rels) => {
    const rect = e.target.getBoundingClientRect()
    setTooltip({ appName, date, rels, x: rect.left + rect.width / 2, y: rect.top })
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: `${180 + dates.length * COL_W}px` }}>
          {/* Year row */}
          <thead>
            <tr>
              <th style={{ width: 180, minWidth: 180, position: 'sticky', left: 0, zIndex: 3, background: 'var(--color-background-primary)', borderBottom: '1px solid var(--color-border-tertiary)' }} />
              {Object.entries(yearGroups).map(([year, months]) => {
                const count = Object.values(months).reduce((s, d) => s + d.length, 0)
                return (
                  <th key={year} colSpan={count}
                    style={{ width: count * COL_W, fontSize: 11, fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'left', padding: '6px 4px 2px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)' }}>
                    {year}
                  </th>
                )
              })}
            </tr>
            {/* Month row */}
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 3, background: 'var(--color-background-primary)', borderBottom: '1px solid var(--color-border-tertiary)' }} />
              {Object.values(yearGroups).flatMap(months =>
                Object.entries(months).map(([ym, days]) => (
                  <th key={ym} colSpan={days.length}
                    style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-text-secondary)', textAlign: 'left', padding: '2px 4px', borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)' }}>
                    {monthLabel(ym)}
                  </th>
                ))
              )}
            </tr>
            {/* Day row */}
            <tr>
              <th style={{ position: 'sticky', left: 0, zIndex: 3, background: 'var(--color-background-primary)', borderBottom: '1px solid var(--color-border-tertiary)', padding: '4px 12px', textAlign: 'left', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 400 }}>App</th>
              {dates.map(d => {
                const day = d.slice(8)
                const isSelected = selected === d
                return (
                  <th key={d}
                    onClick={() => setSelected(s => s === d ? null : d)}
                    style={{ width: COL_W, fontSize: 11, fontWeight: isSelected ? 600 : 400, textAlign: 'center', padding: '4px 2px', cursor: 'pointer', color: isSelected ? 'white' : 'var(--color-text-secondary)', background: isSelected ? '#0d9488' : 'var(--color-background-primary)', borderRadius: isSelected ? 4 : 0, borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    {day}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {visibleApps.map(app => {
              const key = (app.alpId || app.hnId || '').toLowerCase()
              const appRels = releaseMap[key] || {}
              const platform = (typeof app.platform === 'object' ? app.platform?.text : app.platform) || ''
              const isAndroid = platform.toLowerCase().includes('android')
              const dotColor = isAndroid ? '#34a853' : '#007aff'

              return (
                <tr key={app.id}
                  style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  {/* App name — sticky */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: dotColor, color: 'white', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                        {isAndroid ? 'A' : 'i'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{app.alpId || app.hnId}</span>
                    </div>
                  </td>
                  {/* Dot cells */}
                  {dates.map(d => {
                    const rels = appRels[d]
                    const isSelected = selected === d
                    return (
                      <td key={d} style={{ textAlign: 'center', padding: 0, background: isSelected ? 'rgba(13,148,136,0.06)' : '' }}>
                        {rels ? (
                          <div
                            style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: dotColor, cursor: 'pointer', margin: '0 auto' }}
                            onMouseEnter={e => handleDotEnter(e, app.alpId || app.hnId, d, rels)}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 8,
          transform: 'translate(-50%, -100%)',
          background: 'var(--color-background-primary)',
          border: '0.5px solid var(--color-border-secondary)',
          borderRadius: 8, padding: '8px 12px', fontSize: 12,
          zIndex: 9999, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          minWidth: 160,
        }}>
          <p style={{ fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>{tooltip.appName}</p>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 6 }}>{tooltip.date}</p>
          {tooltip.rels.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--color-background-secondary)', padding: '1px 5px', borderRadius: 4, color: 'var(--color-text-primary)' }}>{r.version || '—'}</span>
              {r.rollout && r.rollout !== '--' && <span style={{ fontSize: 11, color: '#0d9488' }}>{r.rollout}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Release Calendar View ────────────────────────────────────────────────────

function MonthlyBarChart({ appReleases, dotColor }) {
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const monthCounts = useMemo(() => {
    const m = {}
    appReleases.forEach(r => {
      if (!r.releaseDate) return
      const ym = r.releaseDate.slice(0, 7) // "YYYY-MM"
      m[ym] = (m[ym] || 0) + 1
    })
    const sorted = Object.entries(m).sort(([a],[b]) => a.localeCompare(b))
    return sorted.map(([ym, count]) => ({
      ym,
      label: MONTH_NAMES[parseInt(ym.slice(5,7),10)-1] + ' ' + ym.slice(2,4),
      count,
    }))
  }, [appReleases])

  if (monthCounts.length === 0) return null

  const maxCount = Math.max(...monthCounts.map(m => m.count))
  const BAR_H = 120
  const BAR_W = 44
  const GAP   = 8

  return (
    <div style={{ margin:'8px 16px 8px',border:'1px solid var(--color-border-secondary)',borderRadius:8,background:'var(--color-background-primary)',padding:'14px 16px 12px',flexShrink:0 }}>
      <p style={{ fontSize:11,fontWeight:500,color:'var(--color-text-secondary)',marginBottom:16,letterSpacing:'0.02em' }}>Số release theo tháng</p>
      <div style={{ overflowX:'auto' }}>
        <div style={{ display:'flex',alignItems:'flex-end',gap:GAP,paddingBottom:2,minWidth: monthCounts.length * (BAR_W + GAP) }}>
          {monthCounts.map(({ ym, label, count }) => {
            const h = maxCount > 0 ? Math.max(6, Math.round((count / maxCount) * BAR_H)) : 6
            return (
              <div key={ym} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,width:BAR_W }}>
                <span style={{ fontSize:11,fontWeight:700,color:dotColor }}>{count}</span>
                <div style={{ width:'100%',height:h,borderRadius:'5px 5px 0 0',background:dotColor,opacity:0.9 }} />
                <span style={{ fontSize:10,color:'var(--color-text-secondary)',whiteSpace:'nowrap',marginTop:2 }}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const MILESTONE_NODES = [
  { key: 'figmaStart',  label: 'Figma Start',  color: '#a78bfa' },
  { key: 'figmaEnd',    label: 'Figma End',     color: '#7c3aed' },
  { key: 'devStart',    label: 'Dev Start',     color: '#60a5fa' },
  { key: 'testStart',   label: 'Test Start',    color: '#34d399' },
  { key: 'liveFullAds', label: 'Live Full Ads', color: '#fb923c' },
  { key: 'liveIap',     label: 'Live iAP',      color: '#f43f5e' },
]

// Infer milestone dates from release notes (UI only, DB unchanged)
const NOTE_INFER = [
  { key: 'liveFullAds', match: /version ads/i },
  { key: 'liveIap',     match: /version iap/i },
]

function HorizontalMilestoneTimeline({ timeline, refDate, appReleases = [] }) {
  if (!timeline) return null
  const cutoff = refDate || new Date().toISOString().slice(0, 10)

  // Build inferred dates from release notes (only fill if DB value missing)
  const inferred = {}
  NOTE_INFER.forEach(({ key, match }) => {
    if (timeline?.[key]) return // already set in DB
    const hit = appReleases
      .filter(r => r.releaseDate && match.test(r.releaseNote || ''))
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))[0]
    if (hit) inferred[key] = hit.releaseDate
  })

  const nodes = MILESTONE_NODES.map(m => ({
    ...m,
    date:       timeline?.[m.key] || inferred[m.key] || '',
    isInferred: !timeline?.[m.key] && !!inferred[m.key],
  }))
  const hasAny = nodes.some(n => n.date)
  if (!hasAny) return null
  return (
    <div style={{ margin:'8px 16px 12px', border:'1px solid var(--color-border-secondary)', borderRadius:8, background:'var(--color-background-secondary)', padding:'14px 20px 10px' }}>
      <p style={{ fontSize:10, fontWeight:600, color:'var(--color-text-secondary)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>Milestone Timeline</p>
      <div style={{ position:'relative', display:'flex', alignItems:'flex-start' }}>
        {/* connecting line */}
        <div style={{ position:'absolute', top:10, left:10, right:10, height:2, background:'var(--color-border-secondary)', zIndex:0 }} />
        {nodes.map((node, i) => {
          const isDone    = !!node.date && node.date <= cutoff  // milestone đã đạt tính đến ngày được chọn
          const isFuture  = !!node.date && node.date > cutoff  // có ngày nhưng chưa đến (tính từ ngày được chọn)
          return (
            <div key={node.key} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative', zIndex:1 }}>
              <div style={{
                width:20, height:20, borderRadius:'50%',
                border: isDone
                  ? `2px ${node.isInferred ? 'dashed' : 'solid'} ${node.color}`
                  : isFuture ? `2px dashed ${node.color}66` : '2px solid var(--color-border-secondary)',
                background: isDone ? (node.isInferred ? 'var(--color-background-primary)' : node.color) : 'var(--color-background-primary)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                boxShadow: isDone && !node.isInferred ? `0 0 0 3px ${node.color}22` : 'none',
              }}>
                {isDone && !node.isInferred && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>✓</span>}
                {isDone && node.isInferred  && <span style={{ width:8, height:8, borderRadius:'50%', background: node.color, display:'block' }} />}
                {!isDone && isFuture        && <span style={{ width:6, height:6, borderRadius:'50%', background: node.color + '66', display:'block' }} />}
              </div>
              <p style={{ fontSize:10, fontWeight:500, color: isDone ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', marginTop:6, textAlign:'center', lineHeight:1.3 }}>{node.label}</p>
              {isDone
                ? <p style={{ fontSize:9, fontFamily:'var(--font-mono)', color: node.isInferred ? node.color + 'aa' : node.color, marginTop:2, textAlign:'center' }}
                    title={node.isInferred ? 'Suy ra từ release note' : undefined}>{node.date}{node.isInferred ? ' *' : ''}</p>
                : isFuture
                  ? <p style={{ fontSize:9, fontFamily:'var(--font-mono)', color: node.color + '99', marginTop:2, textAlign:'center' }}>{node.date}</p>
                  : <p style={{ fontSize:9, color:'var(--color-border-secondary)', marginTop:2 }}>—</p>
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_BADGE_STYLE = {
  'Checked':        { bg: 'rgba(13,148,136,0.12)', color: '#0d9488' },
  'Updated':        { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  'Pending Review': { bg: 'rgba(245,158,11,0.12)', color: '#b45309' },
}

const CAL_LAST_APP_KEY = 'rm_calendar_last_app'

function ReleaseCalendarView({ releases, apps, timelines }) {
  const location = useLocation()
  const navigate = useNavigate()
  // URL param takes priority, else restore last viewed app from localStorage
  const initApp  = new URLSearchParams(location.search).get('app')
    || localStorage.getItem(CAL_LAST_APP_KEY)
    || ''

  const [selectedApp, setSelectedApp] = useState(() =>
    initApp ? apps.find(a => (a.alpId || a.hnId || '').toLowerCase() === initApp.toLowerCase()) || null : null
  )
  const [search,   setSearch]   = useState(initApp)
  const [showDrop, setShowDrop] = useState(false)
  const [selDate,  setSelDate]  = useState(null)
  const [tooltip,  setTooltip]  = useState(null)
  const inputRef  = useRef(null)
  const tableWrap = useRef(null)

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const monthLabel  = ym => MONTH_NAMES[parseInt(ym.slice(5,7),10)-1]
  const COL_W = 36

  const uniqueApps = useMemo(() => {
    const seen = new Set()
    return apps.filter(a => {
      const k = (a.alpId || a.hnId || a.id || '').toLowerCase()
      if (seen.has(k)) return false; seen.add(k); return true
    })
  }, [apps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return uniqueApps.filter(a => !q || (a.alpId||'').toLowerCase().includes(q) || (a.hnId||'').toLowerCase().includes(q)).slice(0, 20)
  }, [search, uniqueApps])

  const selectApp = (app) => {
    const key = (app.alpId || app.hnId || '').toLowerCase()
    localStorage.setItem(CAL_LAST_APP_KEY, key)
    setSelectedApp(app)
    setSearch(app.alpId || app.hnId || '')
    setShowDrop(false)
    setSelDate(null)
    navigate(`/stats?view=calendar&app=${encodeURIComponent(key)}`, { replace: true })
  }

  const appTimeline = useMemo(() => {
    if (!selectedApp || !timelines) return null
    const key = (selectedApp.hnId || selectedApp.alpId || '').toLowerCase()
    return timelines[key] || null
  }, [selectedApp, timelines])

  const appReleases = useMemo(() => {
    if (!selectedApp) return []
    const key   = (selectedApp.alpId || selectedApp.hnId || '').toLowerCase()
    const hnKey = (selectedApp.hnId || '').toLowerCase()
    return releases
      .filter(r => r.releaseDate && (
        (r.appName || r.app || '').toLowerCase() === key ||
        (r.hnId || '').toLowerCase() === hnKey
      ))
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
  }, [selectedApp, releases])

  const dates = useMemo(() => [...new Set(appReleases.map(r => r.releaseDate))], [appReleases])
  const dateMap = useMemo(() => {
    const m = {}
    appReleases.forEach(r => {
      if (!m[r.releaseDate]) m[r.releaseDate] = []
      m[r.releaseDate].push(r)
    })
    return m
  }, [appReleases])

  const yearGroups = useMemo(() => {
    const years = {}
    dates.forEach(d => {
      const y = d.slice(0,4), mo = d.slice(0,7)
      if (!years[y]) years[y] = {}
      if (!years[y][mo]) years[y][mo] = []
      years[y][mo].push(d)
    })
    return years
  }, [dates])

  const dateYearIndex = useMemo(() => {
    const order = [...new Set(dates.map(d => d.slice(0,4)))]
    const m = {}
    dates.forEach(d => { m[d] = order.indexOf(d.slice(0,4)) })
    return m
  }, [dates])

  const dc      = selectedApp ? ((typeof selectedApp.platform === 'object' ? selectedApp.platform?.text : selectedApp.platform)||'').toLowerCase().includes('android') ? '#34a853' : '#007aff' : '#007aff'
  const isA     = dc === '#34a853'

  useEffect(() => {
    if (!selectedApp || dates.length === 0) return
    setSelDate(dates[dates.length - 1])
    requestAnimationFrame(() => { if (tableWrap.current) tableWrap.current.scrollLeft = tableWrap.current.scrollWidth })
  }, [selectedApp?.id])

  const colStyle = (d, idx, isSel) => {
    const yIdx = dateYearIndex[d], isEvenY = yIdx % 2 === 0
    const isFirstOfY = idx === 0 || dates[idx-1].slice(0,4) !== d.slice(0,4)
    const nextD = dates[idx+1], isLastOfY = !nextD || nextD.slice(0,4) !== d.slice(0,4)
    return {
      bg:          isSel ? 'rgba(13,148,136,0.08)' : isEvenY ? '' : 'var(--color-background-secondary)',
      borderLeft:  isFirstOfY ? '2px solid var(--color-border-secondary)' : '1px solid var(--color-border-tertiary)',
      borderRight: (idx < dates.length-1 && isLastOfY) ? '2px solid var(--color-border-secondary)' : undefined,
      hdrBg:       isSel ? '#0d9488' : isEvenY ? 'var(--color-background-primary)' : 'var(--color-background-secondary)',
    }
  }

  const handleDotEnter = (e, date, rels) => {
    const r = e.target.getBoundingClientRect()
    setTooltip({ date, rels, x: r.left + r.width/2, y: r.top })
  }

  const selRels = selDate ? (dateMap[selDate] || []) : []

  return (
    <div style={{ fontFamily:'var(--font-sans)', display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Search bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 10, flexShrink: 0 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M9 9L12 12" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            style={{ width: 260, height: 38, paddingLeft: 36, paddingRight: 14, border: `1.5px solid ${showDrop ? '#0d9488' : '#e2e8f0'}`, borderRadius: 10, background: '#fff', color: '#0f172a', fontSize: 13, outline: 'none', boxShadow: showDrop ? '0 0 0 3px rgba(13,148,136,0.10)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.15s' }}
            placeholder="Tìm app theo tên hoặc HN ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 160)}
          />
          {showDrop && filtered.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, minWidth: 280, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              {filtered.map(a => {
                const aIsA = ((typeof a.platform === 'object' ? a.platform?.text : a.platform)||'').toLowerCase().includes('android')
                const adc  = aIsA ? '#34a853' : '#007aff'
                const isSel = (a.alpId||a.hnId||'').toLowerCase() === (selectedApp ? (selectedApp.alpId||selectedApp.hnId||'').toLowerCase() : '')
                return (
                  <div key={a.id} onMouseDown={() => selectApp(a)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: isSel ? '#f0fdfa' : '' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#f0fdfa' : '' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: adc, color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{aIsA ? 'A' : 'i'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{a.alpId||a.hnId}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{a.hnId}</p>
                    </div>
                    {isSel && <span style={{ fontSize: 12, color: '#0d9488', fontWeight: 700 }}>✓</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected app chip */}
        {selectedApp && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 6px', borderRadius: 20, background: `${dc}12`, border: `1.5px solid ${dc}30` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: dc, color: '#fff', fontSize: 10, fontWeight: 700 }}>{isA ? 'A' : 'i'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: dc, whiteSpace: 'nowrap' }}>{selectedApp.alpId||selectedApp.hnId}</span>
              <button onMouseDown={() => { setSelectedApp(null); setSearch(''); setSelDate(null); navigate('/stats?view=calendar', { replace: true }) }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: `${dc}25`, border: 'none', cursor: 'pointer', color: dc, fontSize: 12, padding: 0, fontWeight: 700 }}>×</button>
            </div>
            {dates.length > 0 && <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>{dates.length} releases</span>}
          </>
        )}
      </div>

      {/* Empty */}
      {!selectedApp && (
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text-secondary)',fontSize:13 }}>
          Chọn app để xem lịch sử release
        </div>
      )}
      {selectedApp && dates.length === 0 && (
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text-secondary)',fontSize:13 }}>Không có release nào</div>
      )}

      {/* Table */}
      {selectedApp && dates.length > 0 && (
        <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
          <div ref={tableWrap} style={{ overflowX:'auto',overflowY:'auto',flex:1,margin:'12px 16px 0',border:'1px solid var(--color-border-secondary)',borderRadius:10,overflow:'auto' }}>
            <table style={{ borderCollapse:'collapse',tableLayout:'fixed',minWidth:`${180+dates.length*COL_W}px`,width:'100%' }}>
              <thead style={{ position:'sticky',top:0,zIndex:4 }}>
                <tr>
                  <th style={{ width:180,minWidth:180,position:'sticky',left:0,zIndex:5,background:'var(--color-background-primary)',borderBottom:'1px solid var(--color-border-secondary)',borderRight:'2px solid var(--color-border-secondary)' }} />
                  {Object.entries(yearGroups).map(([year, months], yIdx, arr) => {
                    const count = Object.values(months).reduce((s,d)=>s+d.length,0)
                    const isEvenY = yIdx % 2 === 0
                    return (
                      <th key={year} colSpan={count}
                        style={{ fontSize:11,fontWeight:700,color:'var(--color-text-primary)',textAlign:'left',padding:'5px 8px 3px',
                          borderBottom:'1px solid var(--color-border-secondary)',
                          borderLeft:'2px solid var(--color-border-secondary)',
                          borderRight: yIdx < arr.length-1 ? '2px solid var(--color-border-secondary)' : undefined,
                          background: isEvenY ? 'var(--color-background-primary)' : 'var(--color-background-secondary)' }}>
                        {year}
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  <th style={{ position:'sticky',left:0,zIndex:5,background:'var(--color-background-primary)',borderBottom:'1px solid var(--color-border-tertiary)',borderRight:'2px solid var(--color-border-secondary)' }} />
                  {Object.entries(yearGroups).flatMap(([, months], yIdx, arr) => {
                    const isEvenY = yIdx % 2 === 0
                    const mArr = Object.entries(months)
                    return mArr.map(([ym, days], mIdx) => (
                      <th key={ym} colSpan={days.length}
                        style={{ fontSize:11,fontWeight:400,color:'var(--color-text-secondary)',textAlign:'left',padding:'2px 5px',
                          borderBottom:'1px solid var(--color-border-tertiary)',
                          borderLeft: mIdx===0 ? '2px solid var(--color-border-secondary)' : '1px solid var(--color-border-tertiary)',
                          borderRight: (yIdx<arr.length-1 && mIdx===mArr.length-1) ? '2px solid var(--color-border-secondary)' : undefined,
                          background: isEvenY ? 'var(--color-background-primary)' : 'var(--color-background-secondary)' }}>
                        {monthLabel(ym)}
                      </th>
                    ))
                  })}
                </tr>
                <tr>
                  <th style={{ position:'sticky',left:0,zIndex:5,background:'var(--color-background-primary)',borderBottom:'1px solid var(--color-border-secondary)',borderRight:'2px solid var(--color-border-secondary)',padding:'3px 12px',textAlign:'left',fontSize:11,color:'var(--color-text-secondary)',fontWeight:400 }}>
                    <span style={{ fontSize:10,opacity:0.6 }}>{dates.length} ngày release</span>
                  </th>
                  {dates.map((d, idx) => {
                    const isSel = selDate === d, isLast = idx === dates.length-1
                    const cs = colStyle(d, idx, false)
                    return (
                      <th key={d} onClick={() => setSelDate(s => s===d ? null : d)}
                        style={{ width:COL_W,fontSize:11,fontWeight:isSel?600:400,textAlign:'center',padding:'3px 1px',cursor:'pointer',
                          color: isSel ? 'white' : isLast ? '#0d9488' : 'var(--color-text-secondary)',
                          background: isSel ? '#0d9488' : cs.hdrBg,
                          borderBottom:'1px solid var(--color-border-secondary)',
                          borderLeft: cs.borderLeft, borderRight: cs.borderRight }}>
                        {d.slice(8)}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ position:'sticky',left:0,zIndex:2,background:'var(--color-background-primary)',padding:'8px 12px',whiteSpace:'nowrap',borderRight:'2px solid var(--color-border-secondary)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                      <span style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:22,height:22,borderRadius:6,background:dc,color:'white',fontSize:10,fontWeight:700,flexShrink:0 }}>{isA?'A':'i'}</span>
                      <div>
                        <p style={{ fontSize:12,fontWeight:500,color:'var(--color-text-primary)',margin:0,lineHeight:1.3 }}>{selectedApp.alpId||selectedApp.hnId}</p>
                        <p style={{ fontSize:10,color:'var(--color-text-secondary)',margin:0,lineHeight:1.3 }}>{dates.length} releases</p>
                      </div>
                    </div>
                  </td>
                  {dates.map((d, idx) => {
                    const rels = dateMap[d] || [], isSel = selDate === d
                    const cs = colStyle(d, idx, isSel)
                    return (
                      <td key={d} onClick={() => setSelDate(s => s===d ? null : d)}
                        style={{ textAlign:'center',padding:0,cursor:'pointer',background:cs.bg,borderLeft:cs.borderLeft,borderRight:cs.borderRight }}>
                        {rels.length > 0
                          ? <div style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:isSel?'#0d9488':dc,margin:'9px auto' }}
                              onMouseEnter={e => handleDotEnter(e, d, rels)} onMouseLeave={() => setTooltip(null)} />
                          : <div style={{ height:26 }} />}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monthly release bar chart */}
          <MonthlyBarChart appReleases={appReleases} dotColor={dc} />

          {selDate && selRels.length > 0 && (
            <div style={{ margin: '0 16px 8px', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ padding: '9px 14px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: dc, color: '#fff', fontSize: 10, fontWeight: 700 }}>{isA ? 'A' : 'i'}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Update Details</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#2dd4bf', fontWeight: 700 }}>{selDate}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{selRels.length} bản</span>
              </div>
              <div style={{ background: '#fff' }}>
                {selRels.map((r, i) => {
                  const sbStyle = r.status ? (STATUS_BADGE_STYLE[r.status] || { bg: '#f1f5f9', color: '#64748b' }) : null
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i > 0 ? '1px solid #f8fafc' : 'none' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', minWidth: 60 }}>{r.version || '—'}</span>
                      {r.rollout && r.rollout !== '--' && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309', whiteSpace: 'nowrap', fontWeight: 600 }}>{r.rollout}</span>}
                      {r.releaseNote && <span style={{ fontSize: 12, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.releaseNote}</span>}
                      {r.status && sbStyle && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sbStyle.bg, color: sbStyle.color, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, border: `1px solid ${sbStyle.color}30` }}>{r.status}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Horizontal Milestone Timeline */}
          <HorizontalMilestoneTimeline timeline={appTimeline} refDate={selDate} appReleases={appReleases} />
        </div>
      )}

      {tooltip && (
        <div style={{ position:'fixed',left:tooltip.x,top:tooltip.y-10,transform:'translate(-50%,-100%)',background:'var(--color-background-primary)',border:'0.5px solid var(--color-border-secondary)',borderRadius:8,padding:'8px 12px',fontSize:12,zIndex:9999,pointerEvents:'none',boxShadow:'0 4px 16px rgba(0,0,0,0.15)',minWidth:130 }}>
          <p style={{ fontSize:10,color:'var(--color-text-secondary)',marginBottom:3 }}>{tooltip.date}</p>
          {tooltip.rels.map((r,i) => (
            <div key={i} style={{ display:'flex',gap:6,alignItems:'center',marginTop:2 }}>
              <span style={{ fontFamily:'var(--font-mono)',fontSize:11,background:'var(--color-background-secondary)',padding:'1px 5px',borderRadius:4,color:'var(--color-text-primary)' }}>{r.version||'—'}</span>
              {r.rollout && r.rollout!=='--' && <span style={{ fontSize:11,color:'#0d9488' }}>{r.rollout}</span>}
              {r.releaseNote && <span style={{ fontSize:11,color:'var(--color-text-secondary)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.releaseNote}</span>}
            </div>
          ))}
        </div>
      )}
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

  if (loading) return <div className="p-3 md:p-6 text-sm" style={{ color: '#94a3b8' }}>Đang tải...</div>

  if (view === 'gantt') {
    return (
      <div style={{ padding: '24px' }}>
        <GanttChart timelines={timelines} apps={apps} />
      </div>
    )
  }

  if (view === 'calendar') {
    return <ReleaseCalendarView releases={releases} apps={apps} timelines={timelines} />
  }

  const CardHeader = ({ label, accent }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <span style={{ display: 'inline-block', width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
    </div>
  )

  return (
    <div style={{ padding: '24px 24px', maxWidth: 1200 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Thống kê</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{releases.length} releases · {apps.length} apps</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {/* Releases by month */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CardHeader label="Phát hành theo tháng (12 tháng gần nhất)" accent="#0d9488" />
          {byMonth.length
            ? <BarChart data={byMonth} height={155} />
            : <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>Không có dữ liệu</p>}
        </div>

        {/* By status */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CardHeader label="Phân bổ theo status" accent="#3b82f6" />
          <DonutChart slices={byStatus} size={140} />
        </div>

        {/* Platform */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CardHeader label="Nền tảng (iOS vs Android)" accent="#34a853" />
          <DonutChart slices={byPlatform} size={140} />
        </div>

        {/* Top apps by releases */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <CardHeader label="Top 10 app nhiều bản phát hành nhất" accent="#0d9488" />
          {topApps.length
            ? <HBarChart data={topApps} />
            : <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>Không có dữ liệu</p>}
        </div>

        {/* Top request update */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', gridColumn: 'span 2' }}>
          <CardHeader label="Top 10 app có Request Update nhiều nhất" accent="#d97706" />
          {topRequestApps.length
            ? <HBarChart data={topRequestApps} color="#d97706" />
            : <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>Không có dữ liệu</p>}
        </div>
      </div>
    </div>
  )
}
