import React, { useMemo, useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useReleasesStore } from '../hooks/useReleasesStore'
import AppDetailModal from '../components/AppDetailModal'
import StoreAccountSidebar from '../components/StoreAccountSidebar'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONET_LAST_APP_KEY = 'rm_monet_last_app'

function fmtYM(ym) {
  // "202604" → "04/2026"
  return `${ym.slice(4, 6)}/${ym.slice(0, 4)}`
}

function fmtInstall(v) {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

function fmtCR(v) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(2)}%`
}

// ─── Bar Chart (install) ──────────────────────────────────────────────────────
function InstallBarChart({ sorted }) {
  const [hov, setHov] = useState(null)
  const vals = sorted.map(d => d.install).filter(v => v != null)
  if (!vals.length) return <p className="text-sm text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu</p>

  const maxV = Math.max(...vals)
  const BAR_MIN_W = 28, GAP = 10
  const n = sorted.length
  const BAR_W = Math.max(BAR_MIN_W, Math.min(64, (720 - GAP * (n - 1)) / n))
  const chartW = n * BAR_W + (n - 1) * GAP
  const CHART_H = 220
  const PAD = { t: 24, b: 44, l: 0 }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <svg
        viewBox={`0 0 ${chartW} ${CHART_H}`}
        width={Math.max(chartW, 400)}
        height={CHART_H}
        style={{ display: 'block', minWidth: Math.max(chartW, 400) }}
      >
        {sorted.map((d, i) => {
          if (d.install == null) return null
          const bh = Math.max(4, ((d.install / maxV) * (CHART_H - PAD.t - PAD.b)))
          const x = i * (BAR_W + GAP)
          const y = CHART_H - PAD.b - bh
          const isHov = hov === i
          const color = isHov ? '#0d9488' : '#2dd4bf'
          return (
            <g key={d.ym}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={x} y={y} width={BAR_W} height={bh} rx={4} fill={color} />
              {isHov && (
                <text x={x + BAR_W / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0d9488">
                  {fmtInstall(d.install)}
                </text>
              )}
              {!isHov && (
                <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="rgba(100,116,139,0.7)">
                  {fmtInstall(d.install)}
                </text>
              )}
              <text x={x + BAR_W / 2} y={CHART_H - PAD.b + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {fmtYM(d.ym)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── CR Line Chart ────────────────────────────────────────────────────────────
function CRLineChart({ sorted }) {
  const [hov, setHov] = useState(null)
  // Work in percentage units (0–100) throughout
  const crPct = sorted.map(d => d.cr != null ? d.cr * 100 : null)
  const crVals = crPct.filter(v => v != null)
  if (!crVals.length) return <p className="text-sm text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu</p>

  const rawMin = Math.min(...crVals)
  const rawMax = Math.max(...crVals)
  const pad    = Math.max((rawMax - rawMin) * 0.4, 2) // at least 2pp padding
  const minCR  = Math.max(0, rawMin - pad)
  const maxCR  = rawMax + pad

  const n = sorted.length
  const W = Math.max(480, n * 80), H = 240
  const PAD = { t: 28, b: 44, l: 56, r: 24 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const scX = i => PAD.l + (n < 2 ? innerW / 2 : (i / (n - 1)) * innerW)
  const scY = v => PAD.t + innerH - ((v - minCR) / ((maxCR - minCR) || 1)) * innerH

  const pts = sorted
    .map((d, i) => crPct[i] != null ? { x: scX(i), y: scY(crPct[i]), pct: crPct[i], d } : null)
    .filter(Boolean)

  const pathD = pts.length > 1
    ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    : null

  const areaD = pathD
    ? `${pathD} L${pts[pts.length - 1].x},${PAD.t + innerH} L${pts[0].x},${PAD.t + innerH} Z`
    : null

  // 5 evenly-spaced Y ticks in percentage
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: minCR + t * (maxCR - minCR),
    y: PAD.t + innerH * (1 - t),
  }))

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
        {/* Grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="rgba(226,232,240,0.7)" strokeWidth={1} />
            <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">
              {t.v.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Area fill */}
        {areaD && <path d={areaD} fill="rgba(45,212,191,0.10)" />}

        {/* Line */}
        {pathD && <path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}

        {/* Dots + labels */}
        {pts.map((p, i) => {
          const prev = pts[i - 1]
          const diff = prev != null ? p.pct - prev.pct : null
          const up   = diff != null && diff > 0
          const dn   = diff != null && diff < 0
          return (
            <g key={i}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={p.x} cy={p.y} r={hov === i ? 6 : 4.5} fill={hov === i ? '#0d9488' : '#2dd4bf'} stroke="white" strokeWidth={2} />
              {/* Value label above dot */}
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fontWeight={600}
                fill={up ? '#22c55e' : dn ? '#f43f5e' : '#2dd4bf'}>
                {p.pct.toFixed(2)}%
              </text>
              {/* MoM arrow + diff */}
              {diff != null && (
                <text x={p.x} y={p.y - 22} textAnchor="middle" fontSize={9} fill={up ? '#22c55e' : dn ? '#f43f5e' : '#94a3b8'}>
                  {up ? '▲' : dn ? '▼' : '—'} {Math.abs(diff).toFixed(1)}pp
                </text>
              )}
              {/* X label */}
              <text x={p.x} y={H - PAD.b + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {fmtYM(p.d.ym)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Dual chart (Ads tab — install bars + CR line overlay) ───────────────────
// ─── Mock ads data (replace with real Lark data later) ───────────────────────
// ─── Mock ads data (replace with real Lark data later) ───────────────────────
// Each unit has metrics per month: requests, matchRate, matchedReq, showRate, impressions, ctr, clicks
const MK = (req, mr, imp, ctr) => ({ requests: req, matchRate: mr, matchedReq: Math.round(req * mr / 100), showRate: Math.round(imp / (req * mr / 100) * 100 * 10) / 10, impressions: imp, ctr, clicks: Math.round(imp * ctr / 100) })
// MK with some missing fields (null = chưa có data)
const MKp = (req, mr, imp, ctr, missing = []) => { const d = MK(req, mr, imp, ctr); missing.forEach(k => { d[k] = null }); return d }

// ─── File import helpers ──────────────────────────────────────────────────────
function parseViNum(s) {
  if (s == null) return null
  const c = String(s).replace('%', '').trim()
  if (!c || c === '—' || c === '-') return null
  // Vietnamese: dot = thousands sep, comma = decimal sep
  return c.includes(',')
    ? parseFloat(c.replace(/\./g, '').replace(',', '.'))
    : parseFloat(c.replace(/\./g, ''))
}
const TYPE_NORM_MAP = {
  'app_open': 'App Open', 'app open': 'App Open', 'appopen': 'App Open',
  'interstitial': 'Interstitial',
  'native': 'Native',
  'banner': 'Banner',
  'rewarded': 'Rewarded', 'reward': 'Rewarded',
}
function normalizeAdType(t) {
  return TYPE_NORM_MAP[t.toLowerCase()] || (t.charAt(0).toUpperCase() + t.slice(1))
}
function detectAdType(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('inter')) return 'Interstitial'
  if (n.includes('banner')) return 'Banner'
  if (n.includes('reward')) return 'Rewarded'
  if (n.includes('open')) return 'App Open'
  if (n.includes('native')) return 'Native'
  return 'Other'
}
function rowsToInternal(rows, fallbackMonth) {
  const monthSet = new Set(rows.map(r => r._month).filter(Boolean))
  if (!monthSet.size && fallbackMonth) monthSet.add(fallbackMonth)
  const months = [...monthSet].sort()
  const unitMap = {}
  rows.forEach(r => {
    const name = r.ad_unit || r.name || ''
    if (!unitMap[name]) unitMap[name] = {
      name,
      type: r.type ? normalizeAdType(r.type) : detectAdType(name),
      data: {},
    }
    const mo = r._month || fallbackMonth || '__pending__'
    unitMap[name].data[mo] = {
      requests: r.requests ?? null, matchRate: r.match_rate ?? null,
      matchedReq: r.matched_requests ?? null, showRate: r.show_rate ?? null,
      impressions: r.impressions ?? null, ctr: r.ctr ?? null, clicks: r.clicks ?? null,
    }
  })
  return { months, units: Object.values(unitMap) }
}
function parseAdsJson(text, fallbackMonth) {
  const arr = JSON.parse(text)
  const rows = (Array.isArray(arr) ? arr : [arr]).map(r => ({ ...r, _month: r.month || null }))
  return rowsToInternal(rows, fallbackMonth)
}
const CSV_HDR = {
  'Đơn vị quảng cáo': 'ad_unit', 'Yêu cầu': 'requests', 'Tỷ lệ so khớp': 'match_rate',
  'Số yêu cầu đã khớp': 'matched_requests', 'Tỷ lệ hiển thị': 'show_rate',
  'Số lượt hiển thị': 'impressions', 'CTR': 'ctr', 'Số lượt nhấp': 'clicks',
  'Ad unit': 'ad_unit', 'Requests': 'requests', 'Match rate': 'match_rate',
  'Matched requests': 'matched_requests', 'Show rate': 'show_rate',
  'Impressions': 'impressions', 'Clicks': 'clicks',
}
function parseAdsCsv(text, fallbackMonth) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ','
  const raw = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const hdrs = raw.map(h => CSV_HDR[h] || h.toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    hdrs.forEach((h, i) => { row[h] = vals[i] })
    ;['requests','match_rate','matched_requests','show_rate','impressions','ctr','clicks'].forEach(k => {
      row[k] = parseViNum(row[k])
    })
    row._month = row.month || row.date || null
    return row
  }).filter(r => r.ad_unit)
  return rowsToInternal(rows, fallbackMonth)
}

const MOCK_ADS_BY_APP = {
  default: { months: [], units: [] },
}

const TYPE_COLOR  = { Interstitial: '#6366f1', Native: '#22c55e', 'App Open': '#f59e0b', Rewarded: '#ec4899' }
const MONTH_COLORS = ['#2dd4bf', '#60a5fa', '#f97316', '#a78bfa', '#fb7185']

// "202604" → "04/2026" | "20260510" → "10/05"
function fmtAdPeriod(key) {
  if (key.length === 8) return `${key.slice(6,8)}/${key.slice(4,6)}`
  return `${key.slice(4,6)}/${key.slice(0,4)}`
}
// Always return "MM/YYYY" regardless of key length
function fmtAdMonth(key) {
  return `${key.slice(4,6)}/${key.slice(0,4)}`
}

const ADS_METRICS = [
  { key: 'requests',    label: 'Yêu cầu',        fmt: v => v?.toLocaleString() ?? '—',               isPercent: false },
  { key: 'matchRate',   label: 'Tỷ lệ so khớp',  fmt: v => v != null ? `${v.toFixed(1)}%` : '—',    isPercent: true  },
  { key: 'matchedReq',  label: 'Yêu cầu khớp',   fmt: v => v?.toLocaleString() ?? '—',               isPercent: false },
  { key: 'impressions', label: 'Lượt hiển thị',   fmt: v => v?.toLocaleString() ?? '—',               isPercent: false },
  { key: 'showRate',    label: 'Tỷ lệ hiển thị',  fmt: v => v != null ? `${v.toFixed(1)}%` : '—',    isPercent: true  },
  { key: 'ctr',         label: 'CTR',             fmt: v => v != null ? `${v.toFixed(2)}%` : '—',    isPercent: true  },
  { key: 'clicks',      label: 'Số lượt nhấp',    fmt: v => v?.toLocaleString() ?? '—',               isPercent: false },
]

function AdsHorizBarChart({ units, months, metricKey, filterType }) {
  const [hovUnit, setHovUnit] = useState(null)
  const metric = ADS_METRICS.find(m => m.key === metricKey)
  const filtered = filterType === 'all' ? units : units.filter(u => u.type === filterType)
  const allVals = filtered.flatMap(u => months.map(m => u.data[m]?.[metricKey] ?? 0))
  const maxVal = Math.max(...allVals, 1)

  const BAR_H = 16, BAR_GAP = 3, GROUP_GAP = 10
  const ROW_H = months.length * (BAR_H + BAR_GAP) + GROUP_GAP
  const maxNameLen = Math.max(...filtered.map(u => u.name.length), 10)
  const LEFT_W = Math.min(Math.max(maxNameLen * 6.5 + 24, 140), 240)
  const RIGHT_PAD = 72, SVG_W = 640
  const innerW = SVG_W - LEFT_W - RIGHT_PAD
  // truncate label to fit LEFT_W
  const truncLabel = (s) => {
    const maxCh = Math.floor((LEFT_W - 24) / 6.5)
    return s.length > maxCh ? s.slice(0, maxCh - 1) + '…' : s
  }
  const totalH = filtered.length * ROW_H + 8

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${SVG_W} ${totalH}`} width="100%" height={totalH} style={{ minWidth: SVG_W, display: 'block' }}>
        {filtered.map((unit, ui) => {
          const y0 = ui * ROW_H + 4
          const isHov = hovUnit === unit.name
          const tc = TYPE_COLOR[unit.type] || '#94a3b8'
          const midY = y0 + (months.length * (BAR_H + BAR_GAP)) / 2 - BAR_GAP / 2
          return (
            <g key={unit.name} onMouseEnter={() => setHovUnit(unit.name)} onMouseLeave={() => setHovUnit(null)}>
              {isHov && <rect x={0} y={y0 - 2} width={SVG_W} height={ROW_H - GROUP_GAP + 4} rx={4} fill="#f8fafc" />}
              <circle cx={8} cy={midY} r={4} fill={tc} />
              <text x={18} y={midY + 4} fontSize={11} fill={isHov ? '#0f172a' : '#475569'} fontWeight={isHov ? 600 : 400}>
                <title>{unit.name}</title>
                {truncLabel(unit.name)}
              </text>
              {months.map((m, mi) => {
                const val = unit.data[m]?.[metricKey] ?? 0
                const bw = (val / maxVal) * innerW
                const by = y0 + mi * (BAR_H + BAR_GAP)
                return (
                  <g key={m}>
                    <rect x={LEFT_W} y={by} width={Math.max(bw, 2)} height={BAR_H} rx={3} fill={MONTH_COLORS[mi]} opacity={isHov ? 1 : 0.82} />
                    {val > 0 && <text x={LEFT_W + bw + 5} y={by + BAR_H / 2 + 4} fontSize={10} fill="#64748b">{metric.fmt(val)}</text>}
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function AdsTableView({ units, months, filterType }) {
  const [col0W, setCol0W]     = useState(180)
  const [sortKey, setSortKey] = useState(null)   // null | 'name' | metric key
  const [sortDir, setSortDir] = useState('desc')

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const baseFiltered = filterType === 'all' ? units : units.filter(u => u.type === filterType)
  const filtered = useMemo(() => {
    if (!sortKey) return baseFiltered
    return [...baseFiltered].sort((a, b) => {
      let va, vb
      if (sortKey === 'name') {
        va = a.name; vb = b.name
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      // sum across months (nulls = 0 for sorting)
      va = months.reduce((s, m) => s + (a.data[m]?.[sortKey] ?? 0), 0)
      vb = months.reduce((s, m) => s + (b.data[m]?.[sortKey] ?? 0), 0)
      return sortDir === 'asc' ? va - vb : vb - va
    })
  }, [baseFiltered, sortKey, sortDir, months])

  const startResize = (e) => {
    e.preventDefault()
    const startX = e.clientX, startW = col0W
    const onMove = (ev) => setCol0W(Math.max(80, startW + ev.clientX - startX))
    const onUp   = ()   => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const thStyle = (align = 'right') => ({
    padding: '7px 10px', fontSize: 11, fontWeight: 600, color: '#64748b',
    background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
    textAlign: align, whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
  })
  const tdStyle = (align = 'right', isLast = false) => ({
    padding: '7px 10px', fontSize: 12, textAlign: align,
    borderBottom: isLast ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
  })
  return (
    <div style={{ overflowX: 'auto', maxHeight: 460, overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: col0W }} />
        </colgroup>
        <thead>
          <tr>
            {/* Col 0: sortable name + resize handle */}
            <th style={{ ...thStyle('left'), position: 'sticky', top: 0, left: 0, zIndex: 2, width: col0W, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSort('name')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Đơn vị quảng cáo
                  {sortKey === 'name' && <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </span>
                <span onMouseDown={e => { e.stopPropagation(); startResize(e) }}
                  style={{ width: 4, cursor: 'col-resize', alignSelf: 'stretch', background: '#cbd5e1', borderRadius: 2, marginLeft: 6, flexShrink: 0 }} />
              </div>
            </th>
            <th style={thStyle()}>Tháng</th>
            {ADS_METRICS.map(m => (
              <th key={m.key} style={{ ...thStyle(), cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(m.key)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {m.label}
                  {sortKey === m.key
                    ? <span style={{ fontSize: 10, color: '#3b82f6' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    : <span style={{ fontSize: 10, color: '#cbd5e1' }}>⇅</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((unit, ui) => {
            const tc = TYPE_COLOR[unit.type] || '#94a3b8'
            const rowBg = ui % 2 === 0 ? '#ffffff' : '#fafafa'
            return months.map((mo, mi) => {
              const d = unit.data[mo] || {}
              const isLast = mi === months.length - 1
              return (
                <tr key={unit.name + mo} style={{ background: rowBg }}>
                  {mi === 0 && (
                    <td rowSpan={months.length} style={{
                      ...tdStyle('left', true),
                      verticalAlign: 'middle',
                      borderRight: '1px solid #e2e8f0',
                      background: rowBg,
                      position: 'sticky', left: 0,
                      overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tc, flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={unit.name}>{unit.name}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle(), ...(isLast && { borderBottom: '2px solid #cbd5e1' }), color: MONTH_COLORS[mi % MONTH_COLORS.length], fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {fmtAdPeriod(mo)}
                    {mo.length === 8 && (
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>{fmtAdMonth(mo)}</div>
                    )}
                  </td>
                  {ADS_METRICS.map(met => (
                    <td key={met.key} style={{ ...tdStyle(), ...(isLast && { borderBottom: '2px solid #cbd5e1' }), color: met.isPercent ? '#6366f1' : '#0f172a' }}>
                      {met.fmt(d[met.key])}
                    </td>
                  ))}
                </tr>
              )
            })
          })}
        </tbody>
      </table>
    </div>
  )
}

function AdsUploader({ onData, onClear, hasData, uploadMeta, existingMonths = [] }) {
  const [open, setOpen]           = useState(false)
  const [dragging, setDragging]   = useState(false)
  const [pendingData, setPending] = useState(null)
  const [dateInput, setDateInput] = useState('')
  const [error, setError]         = useState(null)
  const inputRef = useRef(null)

  const close = () => { setOpen(false); setPending(null); setDateInput(''); setError(null) }

  const processFile = async (file) => {
    setError(null); setPending(null)
    try {
      const text = await file.text()
      const ext  = file.name.split('.').pop().toLowerCase()
      let parsed
      if      (ext === 'json') parsed = parseAdsJson(text, null)
      else if (ext === 'csv')  parsed = parseAdsCsv(text, null)
      else { setError('Chỉ hỗ trợ .json hoặc .csv'); return }
      if (!parsed.months.length) {
        setPending({ parsed, filename: file.name, rows: parsed.units.length })
      } else {
        onData(parsed, { filename: file.name, rows: parsed.units.length, months: parsed.months })
        close()
      }
    } catch (e) { setError(`Lỗi parse: ${e.message}`) }
  }

  const confirmDate = () => {
    if (!dateInput) { setError('Vui lòng chọn ngày'); return }
    if (!pendingData) return
    // input type="date" gives YYYY-MM-DD → convert to YYYYMMDD
    const mo = dateInput.replace(/-/g, '')
    const updated = {
      months: [mo],
      units: pendingData.parsed.units.map(u => ({
        ...u,
        data: Object.fromEntries(Object.entries(u.data).map(([k, v]) => [k === '__pending__' ? mo : k, v])),
      })),
    }
    onData(updated, { filename: pendingData.filename, rows: pendingData.rows, months: [mo] })
    close()
  }

  const modal = open && ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)' }} />
      {/* Dialog */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 9999, width: 420, background: '#fff', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Import dữ liệu Ads</p>
          <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Drop zone */}
        {!pendingData && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            style={{
              border: `2px dashed ${dragging ? '#0d9488' : '#cbd5e1'}`, borderRadius: 10,
              padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#f0fdfa' : '#f8fafc', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
            <div style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Kéo thả hoặc click để upload</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>.json · .csv (AdMob export)</div>
            <a href="/ads_template.json" download="ads_template.json"
              onClick={e => e.stopPropagation()}
              style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#0d9488', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, border: '1px solid #99f6e4', background: '#f0fdfa' }}>
              ↓ Tải file mẫu JSON
            </a>
            <input ref={inputRef} type="file" accept=".json,.csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) processFile(f); e.target.value = '' }} />
          </div>
        )}

        {/* Date input when month is missing */}
        {pendingData && (
          <div style={{ padding: '14px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 10px' }}>
              <b>{pendingData.filename}</b> ({pendingData.rows} units) — không có ngày/tháng.
            </p>
            <p style={{ fontSize: 12, color: '#92400e', margin: '0 0 10px', fontWeight: 500 }}>Nhập kỳ báo cáo:</p>
            {(() => {
              const mo = dateInput.replace(/-/g, '')
              const isExisting = mo.length >= 6 && existingMonths.includes(mo)
              return (
                <>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} autoFocus
                      style={{ flex: 1, padding: '7px 10px', border: `1px solid ${isExisting ? '#fbbf24' : '#fde68a'}`, borderRadius: 6, fontSize: 12, outline: 'none', background: '#fff' }}
                      onKeyDown={e => e.key === 'Enter' && confirmDate()}
                    />
                    <button onClick={confirmDate}
                      style={{ padding: '7px 16px', background: isExisting ? '#f59e0b' : '#0d9488', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                      {isExisting ? 'Cập nhật' : 'OK'}
                    </button>
                  </div>
                  {isExisting && (
                    <p style={{ fontSize: 11, color: '#b45309', marginTop: 6, marginBottom: 0 }}>
                      ↻ Kỳ này đã có dữ liệu — sẽ cập nhật thay vì tạo mới
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 10, marginBottom: 0 }}>{error}</p>}
      </div>
    </>,
    document.body
  )

  // ── Trigger button (shown in controls row) ──
  if (hasData && uploadMeta) return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 11 }}>
        <span style={{ color: '#15803d' }}>📂 <b>{uploadMeta.filename}</b> · {uploadMeta.months.map(fmtAdPeriod).join(', ')}</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      {modal}
    </>
  )

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ↑ Import
      </button>
      {modal}
    </>
  )
}

function AdsChart({ appKey }) {
  const [dbData,     setDbData]     = useState(null)   // loaded from Supabase
  const [dbLoading,  setDbLoading]  = useState(false)
  const [dbError,    setDbError]    = useState(null)
  const [saveStatus,   setSaveStatus]   = useState(null)   // null | 'saving' | 'saved' | 'error'
  const [uploadedData, setUploadedData] = useState(null)
  const [uploadMeta,   setUploadMeta]   = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [deleteMonths,   setDeleteMonths]   = useState([])  // selected months to delete
  const [deleteStatus,   setDeleteStatus]   = useState(null) // null | 'deleting' | 'done' | 'error'

  // Load from Supabase whenever appKey changes
  useEffect(() => {
    if (!appKey) return
    setDbData(null); setDbError(null); setUploadedData(null); setUploadMeta(null)
    setDbLoading(true)
    fetch(`/api/ads?app_key=${encodeURIComponent(appKey)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => {
        if (!d || !Array.isArray(d.units)) throw new Error('Invalid response')
        setDbData(d); setDbLoading(false)
      })
      .catch(e => { setDbError(e.message); setDbLoading(false) })
  }, [appKey])

  const emptyData = MOCK_ADS_BY_APP.default
  const data = uploadedData || dbData || emptyData
  const { months, units } = data
  const [filterType, setFilterType] = useState('all')
  const [metricKey,  setMetricKey]  = useState('requests')
  const [viewMode,   setViewMode]   = useState('chart')

  const types = [...new Set(units.map(u => u.type))]

  // Merge uploaded data into existing dbData (upsert by month)
  const mergeIntoDb = (existing, parsed) => {
    const mergedMonths = [...new Set([...(existing?.months || []), ...parsed.months])].sort()
    const unitMap = {}
    for (const u of (existing?.units || [])) unitMap[u.name] = { ...u, data: { ...u.data } }
    for (const u of parsed.units) {
      if (!unitMap[u.name]) {
        unitMap[u.name] = { name: u.name, type: u.type, data: {} }
      } else {
        unitMap[u.name].type = u.type  // update type nếu thay đổi
      }
      Object.assign(unitMap[u.name].data, u.data)
    }
    return { months: mergedMonths, units: Object.values(unitMap) }
  }

  const handleData = (parsed, meta) => {
    setUploadedData(parsed)
    setUploadMeta(meta)
    const isUpdate = parsed.months.some(m => dbData?.months?.includes(m))
    setSaveStatus('saving')
    fetch('/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: appKey, units: parsed.units }),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => {
        if (d.ok) {
          setSaveStatus(isUpdate ? 'updated' : 'saved')
          setDbData(mergeIntoDb(dbData, parsed))
          setUploadedData(null)
          setUploadMeta(null)
          setTimeout(() => setSaveStatus(null), 3000)
        } else {
          setSaveStatus('error')
        }
      })
      .catch(() => setSaveStatus('error'))
  }

  const toggleDeleteMonth = (m) =>
    setDeleteMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const handleDelete = () => {
    if (!deleteMonths.length) return
    setDeleteStatus('deleting')
    fetch('/api/ads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: appKey, months: deleteMonths }),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => {
        if (d.ok) {
          // Remove deleted months from local state
          const remaining = (dbData?.months || []).filter(m => !deleteMonths.includes(m))
          setDbData({
            months: remaining,
            units: (dbData?.units || []).map(u => ({
              ...u,
              data: Object.fromEntries(Object.entries(u.data).filter(([k]) => !deleteMonths.includes(k))),
            })),
          })
          setUploadedData(null); setUploadMeta(null)
          setSaveStatus(null); setDeleteStatus('done')
          setConfirmDelete(false); setDeleteMonths([])
          setTimeout(() => setDeleteStatus(null), 3000)
        } else { setDeleteStatus('error') }
      })
      .catch(() => setDeleteStatus('error'))
  }

  const openDeleteModal = () => {
    setDeleteMonths([...(dbData?.months || [])])  // pre-select all
    setDeleteStatus(null)
    setConfirmDelete(true)
  }

  const deleteModal = confirmDelete && ReactDOM.createPortal(
    <>
      <div onClick={() => setConfirmDelete(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 9999, width: 380, background: '#fff', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0f172a' }}>🗑️ Xoá dữ liệu Ads</p>
          <button onClick={() => setConfirmDelete(false)}
            style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>Chọn tháng muốn xoá:</p>

        {/* Month checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {(dbData?.months || []).map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${deleteMonths.includes(m) ? '#fca5a5' : '#e2e8f0'}`, background: deleteMonths.includes(m) ? '#fff5f5' : '#f8fafc' }}>
              <input type="checkbox" checked={deleteMonths.includes(m)} onChange={() => toggleDeleteMonth(m)}
                style={{ width: 16, height: 16, accentColor: '#ef4444', cursor: 'pointer' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{fmtAdPeriod(m)}</span>
              {m.length === 8 && <span style={{ fontSize: 11, color: '#94a3b8' }}>({fmtAdMonth(m)})</span>}
            </label>
          ))}
        </div>

        {/* Select all / none */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setDeleteMonths([...(dbData?.months || [])])}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Chọn tất cả</button>
          <button onClick={() => setDeleteMonths([])}
            style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Bỏ chọn</button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setConfirmDelete(false)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Huỷ
          </button>
          <button onClick={handleDelete} disabled={!deleteMonths.length || deleteStatus === 'deleting'}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!deleteMonths.length || deleteStatus === 'deleting') ? 0.5 : 1 }}>
            {deleteStatus === 'deleting' ? 'Đang xoá…' : `Xoá ${deleteMonths.length} tháng`}
          </button>
        </div>
        {deleteStatus === 'error' && <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>Xoá thất bại — thử lại</p>}
      </div>
    </>,
    document.body
  )

  const hasDbData = !!(dbData?.months?.length)

  const uploaderProps = {
    hasData: !!uploadedData, uploadMeta,
    existingMonths: dbData?.months || [],
    onData: handleData,
    onClear: () => { setUploadedData(null); setUploadMeta(null); setSaveStatus(null) },
  }

  if (dbLoading) return (
    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
      <p style={{ fontSize: 13, margin: 0 }}>Đang tải dữ liệu Ads…</p>
    </div>
  )

  return (
    <div>
      {/* Row 1: View toggle + Import */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {[{ v: 'chart', label: '▦ Biểu đồ' }, { v: 'table', label: '⊞ Bảng' }].map(({ v, label }) => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: viewMode === v ? '#0d9488' : '#fff', color: viewMode === v ? '#fff' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>
        {saveStatus === 'saving'  && <span style={{ fontSize: 11, color: '#94a3b8' }}>💾 Đang lưu…</span>}
        {saveStatus === 'saved'   && <span style={{ fontSize: 11, color: '#16a34a' }}>✓ Đã lưu vào Supabase</span>}
        {saveStatus === 'updated' && <span style={{ fontSize: 11, color: '#0d9488' }}>↻ Đã cập nhật dữ liệu</span>}
        {saveStatus === 'error'   && <span style={{ fontSize: 11, color: '#ef4444' }}>⚠ Lưu thất bại</span>}
        {deleteStatus === 'done' && <span style={{ fontSize: 11, color: '#16a34a' }}>✓ Đã xoá</span>}
        {dbError && !saveStatus  && <span style={{ fontSize: 11, color: '#f59e0b' }} title={dbError}>⚠ Không kết nối được Supabase</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasDbData && (
            <button onClick={openDeleteModal}
              style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              ⚙ Quản lý dữ liệu
            </button>
          )}
          <AdsUploader {...uploaderProps} />
        </div>
      </div>
      {deleteModal}

      {/* Row 2: Type filter chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {['all', ...types].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: '1px solid',
              background: filterType === t ? (t === 'all' ? '#0d9488' : TYPE_COLOR[t]) : 'transparent',
              color: filterType === t ? '#fff' : (t === 'all' ? '#64748b' : TYPE_COLOR[t]),
              borderColor: t === 'all' ? (filterType === t ? '#0d9488' : '#e2e8f0') : `${TYPE_COLOR[t]}80`,
            }}>
            {t === 'all' ? 'Tất cả' : t}
          </button>
        ))}
      </div>

      {/* Metric tabs (chart mode only) */}
      {viewMode === 'chart' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, overflowX: 'auto', paddingBottom: 2, flexWrap: 'wrap' }}>
          {ADS_METRICS.map(m => (
            <button key={m.key} onClick={() => setMetricKey(m.key)}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: metricKey === m.key ? 600 : 400, cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap',
                background: metricKey === m.key ? '#eff6ff' : 'transparent',
                color: metricKey === m.key ? '#3b82f6' : '#64748b',
                borderColor: metricKey === m.key ? '#bfdbfe' : '#e2e8f0',
              }}>
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!months.length && (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
          <p style={{ fontSize: 13, margin: 0 }}>Chưa có dữ liệu — nhấn <b>↑ Import</b> để upload file</p>
        </div>
      )}

      {!!months.length && <>
        {/* Period legend */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          {months.map((m, i) => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: MONTH_COLORS[i % MONTH_COLORS.length] }} />
              <span style={{ fontWeight: 600 }}>{fmtAdPeriod(m)}</span>
              {m.length === 8 && <span style={{ fontSize: 10, color: '#94a3b8' }}>({fmtAdMonth(m)})</span>}
            </div>
          ))}
        </div>

        {viewMode === 'chart'
          ? <AdsHorizBarChart units={units} months={months} metricKey={metricKey} filterType={filterType} />
          : <AdsTableView     units={units} months={months} filterType={filterType} />
        }
      </>}
    </div>
  )
}

// ─── placeholder (kept for compile, not used) ────────────────────────────────
function _AdsChartOld({ sorted }) {
  const instVals = sorted.map(d => d.install).filter(v => v != null)
  const crVals   = sorted.map(d => d.cr).filter(v => v != null)
  if (!instVals.length && !crVals.length) return <p className="text-sm text-center py-10" style={{ color: '#94a3b8' }}>Chưa có dữ liệu</p>

  const n = sorted.length
  const W = Math.max(480, n * 60), H = 260
  const PAD = { t: 28, b: 44, l: 56, r: 56 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const instMax = instVals.length ? Math.max(...instVals) * 1.15 : 1
  const crMax = crVals.length ? Math.max(...crVals) * 100 * 1.3 : 100
  const BAR_W = Math.min(40, innerW / n * 0.6)

  const scX = i => PAD.l + (innerW / n) * i + (innerW / n) / 2
  const scYInst = v => PAD.t + innerH - (v / instMax) * innerH
  const scYCR = v => PAD.t + innerH - (v / crMax) * innerH

  const crPts = sorted
    .map((d, i) => d.cr != null ? { x: scX(i), y: scYCR(d.cr * 100), d } : null)
    .filter(Boolean)
  const crPath = crPts.length > 1 ? crPts.map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') : null

  const yInstTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: instMax * t,
    y: PAD.t + innerH * (1 - t),
  }))
  const yCRTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: crMax * t,
    y: PAD.t + innerH * (1 - t),
  }))

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#60a5fa' }} />
          Install (trục trái)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
          <span style={{ display: 'inline-block', width: 28, height: 2, background: '#f59e0b', borderRadius: 2 }} />
          CR % (trục phải)
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ minWidth: W }}>
        {/* Grid */}
        {yInstTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="rgba(241,245,249,0.5)" strokeWidth={1} />
            <text x={PAD.l - 6} y={t.y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{fmtInstall(t.v)}</text>
          </g>
        ))}
        {yCRTicks.map((t, i) => (
          <text key={i} x={W - PAD.r + 6} y={t.y + 4} textAnchor="start" fontSize={10} fill="#f59e0b">
            {t.v.toFixed(1)}%
          </text>
        ))}

        {/* Install bars */}
        {sorted.map((d, i) => {
          if (d.install == null) return null
          const bh = Math.max(4, (d.install / instMax) * innerH)
          const x = scX(i) - BAR_W / 2
          const y = PAD.t + innerH - bh
          const isHov = hov === i
          return (
            <g key={d.ym}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect x={x} y={y} width={BAR_W} height={bh} rx={3} fill={isHov ? '#3b82f6' : '#60a5fa'} opacity={0.85} />
              <text x={scX(i)} y={H - PAD.b + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">{fmtYM(d.ym)}</text>
              {isHov && (
                <text x={scX(i)} y={y - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#3b82f6">
                  {fmtInstall(d.install)}
                </text>
              )}
            </g>
          )
        })}

        {/* CR line */}
        {crPath && <path d={crPath} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinejoin="round" />}
        {crPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hov === i ? 5 : 3.5} fill={hov === i ? '#f59e0b' : '#fcd34d'} stroke="white" strokeWidth={1.5} />
        ))}
      </svg>
    </div>
  )
}

// ─── Monthly data table ───────────────────────────────────────────────────────
function MonthTable({ sorted, activeTab }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border-secondary)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Tháng</th>
            {(activeTab !== 'cr') && <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Install</th>}
            {(activeTab !== 'install') && <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>Convert Rate</th>}
            {(activeTab !== 'install') && <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: 12 }}>MoM CR</th>}
          </tr>
        </thead>
        <tbody>
          {[...sorted].reverse().map((d, i, arr) => {
            const prev = arr[i + 1]
            const crChange = d.cr != null && prev?.cr != null
              ? ((d.cr - prev.cr) / (prev.cr || 1)) * 100
              : null
            const crUp = crChange != null && crChange > 0
            const crDn = crChange != null && crChange < 0
            return (
              <tr key={d.ym}
                style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '9px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{fmtYM(d.ym)}</td>
                {(activeTab !== 'cr') && (
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                    {fmtInstall(d.install)}
                  </td>
                )}
                {(activeTab !== 'install') && (
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#2dd4bf' }}>
                    {fmtCR(d.cr)}
                  </td>
                )}
                {(activeTab !== 'install') && (
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12 }}>
                    {crChange != null ? (
                      <span style={{ color: crUp ? '#22c55e' : crDn ? '#f43f5e' : '#94a3b8', fontWeight: 500 }}>
                        {crUp ? '▲' : crDn ? '▼' : '—'} {Math.abs(crChange).toFixed(1)}%
                      </span>
                    ) : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Overview table (all apps) ────────────────────────────────────────────────
function OverviewTable({ monetMap, apps, onSelectApp }) {
  const [sortKey, setSortKey] = useState('lastInstall')
  const [sortDir, setSortDir] = useState('desc')

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 }

  const rows = useMemo(() => {
    const base = apps
      .map(app => {
        const key = (app.alpId || app.hnId || '').toLowerCase()
        const data = monetMap[key] || monetMap[app.hnId?.toLowerCase()] || null
        if (!data || !Object.keys(data.months || {}).length) return null
        const sorted = Object.entries(data.months).sort(([a],[b]) => a.localeCompare(b))
        const last = sorted[sorted.length - 1]
        const prev = sorted[sorted.length - 2]
        const lastCR = last?.[1]?.cr
        const prevCR = prev?.[1]?.cr
        const crChange = lastCR != null && prevCR != null
          ? ((lastCR - prevCR) / (prevCR || 1)) * 100 : null
        return {
          app, key,
          priority: data.priority,
          lastYm: last?.[0],
          lastInstall: last?.[1]?.install,
          lastCR,
          prevCR,
          crChange,
          nMonths: sorted.length,
        }
      })
      .filter(Boolean)

    return [...base].sort((a, b) => {
      let av, bv
      if (sortKey === 'app')         { av = (a.app.alpId || a.app.hnId || '').toLowerCase(); bv = (b.app.alpId || b.app.hnId || '').toLowerCase() }
      else if (sortKey === 'priority') { av = PRIORITY_ORDER[a.priority] ?? 9; bv = PRIORITY_ORDER[b.priority] ?? 9 }
      else if (sortKey === 'lastYm')   { av = a.lastYm || ''; bv = b.lastYm || '' }
      else if (sortKey === 'lastInstall') { av = a.lastInstall ?? -1; bv = b.lastInstall ?? -1 }
      else if (sortKey === 'lastCR')   { av = a.lastCR ?? -1; bv = b.lastCR ?? -1 }
      else if (sortKey === 'crChange') { av = a.crChange ?? -999; bv = b.crChange ?? -999 }
      else if (sortKey === 'nMonths')  { av = a.nMonths; bv = b.nMonths }
      else { av = 0; bv = 0 }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [monetMap, apps, sortKey, sortDir])

  if (!rows.length) return <p className="text-sm text-center py-16" style={{ color: '#94a3b8' }}>Chưa có dữ liệu Monet</p>

  const PRIORITY_COLOR = { 'High': '#f43f5e', 'Medium': '#f59e0b', 'Low': '#94a3b8' }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: '#cbd5e1', marginLeft: 3, fontSize: 10 }}>↕</span>
    return <span style={{ color: '#0d9488', marginLeft: 3, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const TH = ({ col, align = 'right', children }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        textAlign: align, padding: '9px 12px', fontSize: 12,
        color: sortKey === col ? '#0d9488' : '#64748b',
        fontWeight: sortKey === col ? 600 : 500,
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        position: 'sticky', top: 0, background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0', zIndex: 2,
      }}
    >
      {children}<SortIcon col={col} />
    </th>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <TH col="app" align="left">App</TH>
            <TH col="priority" align="left">Priority</TH>
            <TH col="lastYm">Tháng gần nhất</TH>
            <TH col="lastInstall">Install</TH>
            <TH col="lastCR">CR</TH>
            <TH col="crChange">MoM CR</TH>
            <TH col="nMonths" align="center">Tháng có data</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isA = ((typeof r.app.platform === 'object' ? r.app.platform?.text : r.app.platform) || '').toLowerCase().includes('android')
            const dc = isA ? '#34a853' : '#007aff'
            const crUp = r.crChange != null && r.crChange > 0
            const crDn = r.crChange != null && r.crChange < 0
            return (
              <tr key={r.key}
                onClick={() => onSelectApp(r.app)}
                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ padding: '9px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: dc, color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{isA ? 'A' : 'i'}</span>
                    <span style={{ fontWeight: 500, color: '#0f172a' }}>{r.app.alpId || r.app.hnId}</span>
                    {r.app.hnId && r.app.alpId && <span style={{ fontSize: 11, color: '#94a3b8' }}>{r.app.hnId}</span>}
                  </div>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  {r.priority ? (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${PRIORITY_COLOR[r.priority] || '#94a3b8'}22`, color: PRIORITY_COLOR[r.priority] || '#94a3b8', fontWeight: 600 }}>
                      {r.priority}
                    </span>
                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                  {r.lastYm ? fmtYM(r.lastYm) : '—'}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#0f172a', fontWeight: 500 }}>
                  {fmtInstall(r.lastInstall)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#2dd4bf', fontWeight: 500 }}>
                  {fmtCR(r.lastCR)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontSize: 12 }}>
                  {r.crChange != null ? (
                    <span style={{ color: crUp ? '#22c55e' : crDn ? '#f43f5e' : '#94a3b8', fontWeight: 600 }}>
                      {crUp ? '▲' : crDn ? '▼' : '—'} {Math.abs(r.crChange).toFixed(1)}%
                    </span>
                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                  {r.nMonths}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Monet() {
  const { apps, monet: monetMap, loading } = useReleasesStore()
  const [selectedApp, setSelectedApp] = useState(null)
  const [search, setSearch]       = useState('')
  const [showDrop, setShowDrop]   = useState(false)
  const [tab, setTab]             = useState('install') // 'install' | 'cr' | 'ads'
  const [detailApp, setDetailApp]         = useState(null)
  const [showAccountPanel, setShowAccountPanel] = useState(false)
  const inputRef = useRef(null)

  // Restore last viewed app
  useEffect(() => {
    if (apps.length === 0) return
    const lastKey = localStorage.getItem(MONET_LAST_APP_KEY)
    if (!lastKey || selectedApp) return
    const found = apps.find(a => (a.alpId || a.hnId || '').toLowerCase() === lastKey.toLowerCase())
    if (found) {
      setSelectedApp(found)
      setSearch(found.alpId || found.hnId || '')
    }
  }, [apps])

  const uniqueApps = useMemo(() => {
    // Deduplicate by record id first, then by alpId key
    const seenId  = new Set()
    const seenKey = new Set()
    return apps.filter(a => {
      if (seenId.has(a.id)) return false
      seenId.add(a.id)
      const k = (a.alpId || a.hnId || '').toLowerCase()
      if (seenKey.has(k)) return false
      seenKey.add(k)
      return true
    })
  }, [apps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? uniqueApps.filter(a =>
          (a.alpId || '').toLowerCase().includes(q) || (a.hnId || '').toLowerCase().includes(q)
        )
      : uniqueApps  // show all when no query
    return list.slice(0, 30)
  }, [search, uniqueApps])

  const selectApp = (app) => {
    const key = (app.alpId || app.hnId || '').toLowerCase()
    localStorage.setItem(MONET_LAST_APP_KEY, key)
    setSelectedApp(app)
    setSearch(app.alpId || app.hnId || '')
    setShowDrop(false)
  }

  const monetData = useMemo(() => {
    if (!selectedApp) return null
    const key = (selectedApp.alpId || selectedApp.hnId || '').toLowerCase()
    return monetMap[key] || monetMap[selectedApp.hnId?.toLowerCase()] || null
  }, [selectedApp, monetMap])

  const sorted = useMemo(() => {
    if (!monetData?.months) return []
    return Object.entries(monetData.months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, vals]) => ({
        ym,
        install: vals.install ?? null,
        cr: vals.cr ?? null,
      }))
  }, [monetData])

  // Summary stats
  const summary = useMemo(() => {
    if (!sorted.length) return null
    const instVals = sorted.map(d => d.install).filter(v => v != null)
    const crVals   = sorted.map(d => d.cr).filter(v => v != null)
    // Use last month that actually HAS install data (not necessarily the latest month)
    const lastInst = [...sorted].reverse().find(d => d.install != null)?.install
    const lastCR   = [...sorted].reverse().find(d => d.cr != null)?.cr
    return {
      latestInstall: lastInst,
      avgInstall:    instVals.length ? instVals.reduce((s, v) => s + v, 0) / instVals.length : null,
      latestCR:      lastCR,
      avgCR:         crVals.length ? crVals.reduce((s, v) => s + v, 0) / crVals.length : null,
      nMonths:       sorted.length,
    }
  }, [sorted])

  const isA  = selectedApp ? ((typeof selectedApp.platform === 'object' ? selectedApp.platform?.text : selectedApp.platform) || '').toLowerCase().includes('android') : false
  const dc   = isA ? '#34a853' : '#007aff'

  const TABS = [
    { key: 'install', label: 'Active User' },
    { key: 'cr',      label: 'Convert Rate' },
    { key: 'ads',     label: 'Ads' },
    { key: 'note',    label: 'Note' },
  ]

  const PRIORITY_COLOR = { 'High': '#f43f5e', 'Medium': '#f59e0b', 'Low': '#94a3b8' }

  if (loading) return <div className="p-6 text-sm" style={{ color: '#94a3b8' }}>Đang tải...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-sans)' }}>

      {/* Top bar: search */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0, zIndex: 200, position: 'relative', background: 'var(--color-background-primary)' }}>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          {/* Search icon */}
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="#94a3b8" strokeWidth="1.5"/>
            <path d="M10.5 10.5L13 13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            style={{
              width: '100%', height: 44,
              paddingLeft: 40, paddingRight: selectedApp ? 100 : 14,
              border: `1.5px solid ${showDrop ? '#0d9488' : 'var(--color-border-secondary)'}`,
              borderRadius: 10,
              background: 'var(--color-background-primary)',
              color: 'var(--color-text-primary)',
              fontSize: 14,
              outline: 'none',
              boxShadow: showDrop ? '0 0 0 3px rgba(13,148,136,0.12)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            placeholder="Find any app..."
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDrop(true) }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 160)}
          />
          {/* Clear / selected chip inside input */}
          {selectedApp && !showDrop && (
            <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 5, padding: '2px 6px 2px 4px', borderRadius: 20, background: `${dc}18`, border: `1px solid ${dc}30` }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4, background: dc, color: 'white', fontSize: 9, fontWeight: 700 }}>{isA ? 'A' : 'i'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: dc, whiteSpace: 'nowrap', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedApp.alpId || selectedApp.hnId}</span>
              <button
                onMouseDown={() => { setSelectedApp(null); setSearch(''); setShowDrop(false); localStorage.removeItem(MONET_LAST_APP_KEY) }}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.12)', border: 'none', cursor: 'pointer', color: dc, fontSize: 11, padding: 0 }}>×</button>
            </div>
          )}

          {/* Dropdown */}
          {showDrop && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 300, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, maxHeight: 320, overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '48px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="18" cy="18" r="11" stroke="#cbd5e1" strokeWidth="2"/>
                    <path d="M26 26L34 34" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Không tìm thấy app</p>
                </div>
              ) : (
                filtered.map(a => {
                  const aIsA = ((typeof a.platform === 'object' ? a.platform?.text : a.platform) || '').toLowerCase().includes('android')
                  const adc  = aIsA ? '#34a853' : '#007aff'
                  const isSel = a.id === selectedApp?.id
                  const hasData = !!(monetMap[(a.alpId||'').toLowerCase()] || monetMap[(a.hnId||'').toLowerCase()])
                  return (
                    <div key={a.id} onMouseDown={() => selectApp(a)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: isSel ? 'var(--color-background-secondary)' : '', borderRadius: 4 }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-background-secondary)' }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: adc, color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{aIsA ? 'A' : 'i'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>{a.alpId || a.hnId}</p>
                        {a.hnId && a.alpId && <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>{a.hnId}</p>}
                      </div>
                      {hasData && <span style={{ fontSize: 10, color: '#2dd4bf', flexShrink: 0 }}>● data</span>}
                      {isSel && <span style={{ fontSize: 13, color: '#0d9488', flexShrink: 0 }}>✓</span>}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedApp ? (
          /* ── Overview: all apps table ── */
          <div className="p-3 md:p-5">
            <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Tổng quan Monet</p>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Nhấn vào hàng để xem chi tiết</span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <OverviewTable monetMap={monetMap} apps={uniqueApps} onSelectApp={selectApp} />
              </div>
            </div>
          </div>
        ) : (
          /* ── App detail view ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* App header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: dc, color: 'white', fontSize: 16, fontWeight: 700 }}>{isA ? 'A' : 'i'}</span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{selectedApp.alpId || selectedApp.hnId}</p>
                  {selectedApp.hnId && selectedApp.alpId && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{selectedApp.hnId}</p>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selectedApp.status && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: selectedApp.status === 'RUNNING' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: selectedApp.status === 'RUNNING' ? '#22c55e' : '#94a3b8', fontWeight: 600 }}>
                    {selectedApp.status}
                  </span>
                )}
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${dc}18`, color: dc, fontWeight: 600 }}>{isA ? 'Android' : 'iOS'}</span>
                {monetData?.priority && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${PRIORITY_COLOR[monetData.priority] || '#94a3b8'}18`, color: PRIORITY_COLOR[monetData.priority] || '#94a3b8', fontWeight: 600 }}>
                    {monetData.priority}
                  </span>
                )}
              </div>

              {/* Store Account badge — clickable */}
              {selectedApp.storeAccount && selectedApp.storeAccount !== '--' && (
                <button
                  onClick={() => setShowAccountPanel(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-secondary)', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                >
                  <span style={{ color: '#94a3b8', fontWeight: 400 }}>by</span> {selectedApp.storeAccount}
                </button>
              )}

              {/* Detail button */}
              <button
                onClick={() => setDetailApp(selectedApp)}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'var(--color-background-secondary)', border: '1px solid var(--color-border-secondary)', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                Chi tiết app <span style={{ fontSize: 14 }}>→</span>
              </button>
            </div>

            {/* Summary cards */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)' }}>
                {[
                  { label: 'Active User tháng gần nhất', value: fmtInstall(summary.latestInstall), color: '#2dd4bf' },
                  { label: 'Trung bình Active User', value: fmtInstall(summary.avgInstall != null ? Math.round(summary.avgInstall) : null), color: '#60a5fa' },
                  { label: 'CR tháng gần nhất', value: fmtCR(summary.latestCR), color: '#fb923c' },
                  { label: 'Trung bình CR', value: fmtCR(summary.avgCR), color: '#a78bfa' },
                  { label: 'Số tháng có data', value: String(summary.nMonths), color: '#94a3b8' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'var(--color-background-primary)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--color-border-secondary)' }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{c.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)' }}>{c.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-secondary)', paddingLeft: 20, background: 'var(--color-background-primary)', flexShrink: 0 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    padding: '10px 18px',
                    fontSize: 13,
                    fontWeight: tab === t.key ? 600 : 400,
                    color: tab === t.key ? '#0d9488' : 'var(--color-text-secondary)',
                    background: 'none',
                    border: 'none',
                    borderBottom: tab === t.key ? '2px solid #0d9488' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Chart area */}
            <div style={{ padding: '20px 20px 0' }}>
                {tab === 'install' && (sorted.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu Monet cho app này</div>
                  : <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Monthly active</p>
                    <InstallBarChart sorted={sorted} />
                  </>
                )}
                {tab === 'ads' && (
                  <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Ads requests theo tháng</p>
                    <AdsChart appKey={(selectedApp?.alpId || selectedApp?.hnId || '').toLowerCase()} />
                  </>
                )}
                {tab === 'cr' && (sorted.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Chưa có dữ liệu Monet cho app này</div>
                  : <>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Convert Rate theo tháng</p>
                    <CRLineChart sorted={sorted} />
                  </>
                )}
                {tab === 'note' && (() => {
                  const appKey = (selectedApp?.alpId || selectedApp?.hnId || '').toLowerCase()
                  const monetNote = monetMap[appKey]?.note
                  return (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 12 }}>Note</p>
                      {monetNote ? (
                        <div style={{
                          fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.7,
                          whiteSpace: 'pre-wrap', background: 'var(--color-background-secondary)',
                          border: '1px solid var(--color-border-secondary)', borderRadius: 8,
                          padding: '12px 14px',
                        }}>
                          {monetNote}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Chưa có note — thêm vào bảng Monet cột "Note"</p>
                      )}
                    </div>
                  )
                })()}
            </div>

            {/* Data table */}
            {sorted.length > 0 && tab !== 'ads' && tab !== 'note' && (
              <div className="mx-4 md:mx-5 my-4 card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--color-border-secondary)' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>Chi tiết theo tháng</p>
                </div>
                <MonthTable sorted={sorted} activeTab={tab} />
              </div>
            )}

          </div>
        )}
      </div>

      {detailApp && <AppDetailModal app={detailApp} onClose={() => setDetailApp(null)} />}

      {showAccountPanel && selectedApp?.storeAccount && (
        <StoreAccountSidebar
          account={selectedApp.storeAccount}
          apps={uniqueApps}
          monet={monetMap}
          onClose={() => setShowAccountPanel(false)}
          onSelectApp={selectApp}
        />
      )}
    </div>
  )
}
