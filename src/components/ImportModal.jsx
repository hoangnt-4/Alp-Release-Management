import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createRelease, updateRelease } from '../lib/lark'

// Extract HN ID from strings like "App564 - Note Taker (iOS)" → "App564"
function extractHnId(appNameStr) {
  if (!appNameStr) return ''
  const m = String(appNameStr).match(/^(App\d+[A-Z]*\d*)/i)
  return m ? m[1] : String(appNameStr).split(/\s*[-–]\s*/)[0].trim()
}

// Normalize roll-out value
const VALID_ROLLOUTS = new Set(['--','20%','30%','40%','50%','99%','100%'])

function normalizeRollout(v) {
  if (v === null || v === undefined || v === '' || v === '--' || v === '-') return '--'
  // Excel stores percentage cells as decimals: 0.5 = 50%, 0.2 = 20%
  if (typeof v === 'number' && v > 0 && v <= 1) {
    const pct = `${Math.round(v * 100)}%`
    if (VALID_ROLLOUTS.has(pct)) return pct
    return '--'
  }
  const s = String(v).trim().replace(/\s+/g, '')
  // Exact match
  if (VALID_ROLLOUTS.has(s)) return s
  // Add % if missing
  const withPct = s.endsWith('%') ? s : `${parseFloat(s)}%`
  if (VALID_ROLLOUTS.has(withPct)) return withPct
  // Value not in valid set → return '--' to avoid wrong mapping
  return '--'
}

// Normalize date: Excel serial OR string
function normalizeDate(v) {
  if (!v) return ''
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
  }
  const s = String(v).trim()
  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, '-')
  // try Date parse
  const d = new Date(s)
  if (!isNaN(d)) return d.toISOString().slice(0, 10)
  return s
}

// Find best matching column header
function findCol(headers, ...candidates) {
  for (const c of candidates) {
    const found = headers.find(h => h && String(h).toLowerCase().includes(c.toLowerCase()))
    if (found) return found
  }
  return null
}

export default function ImportModal({ apps, releases = [], onClose, onDone }) {
  const [mode, setMode]       = useState('import') // import | update
  const [step, setStep]       = useState('upload') // upload | preview | importing | done
  const [rows, setRows]       = useState([])
  const [error, setError]     = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] })
  const fileRef = useRef()

  // Build lookup for existing releases: "date|version" → record (for update mode)
  const existingMap = {}
  for (const r of releases) {
    if (r.releaseDate && r.version) {
      const key = `${r.releaseDate}|${r.version}`
      if (!existingMap[key]) existingMap[key] = []
      existingMap[key].push(r)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (!data.length) { setError('File không có dữ liệu.'); return }

        const headers = Object.keys(data[0])

        // Map columns
        const colDate     = findCol(headers, 'Release Date', 'Date', 'Ngày')
        const colApp      = findCol(headers, 'App Name', 'App', 'Tên app')
        const colVersion  = findCol(headers, 'Version', 'Ver')
        const colRollout  = findCol(headers, 'Roll-out', 'Rollout', 'Roll')
        const colDesc     = findCol(headers, 'Description', 'Release Note', 'Mô tả', 'Note', 'Des')
        const colChecked  = findCol(headers, 'Last Checked', 'Checked Date')
        const colStatus   = findCol(headers, 'Status')
        const colReviewNotes = findCol(headers, 'Review Notes', 'Review Note')

        // Build app lookup by hnId
        const byHnId = {}
        apps.forEach(a => { if (a.hnId) byHnId[a.hnId.toLowerCase()] = a })

        // Forward-fill app name (handles merged cells / blank rows under same app)
        let lastAppName = ''
        const parsed = data
          .map((row, idx) => {
            const rawAppName = String(row[colApp] || '').trim() || lastAppName
            if (rawAppName) lastAppName = rawAppName
            const hnId       = extractHnId(rawAppName)
            const matched    = byHnId[hnId.toLowerCase()] || null

            const releaseDate = normalizeDate(colDate ? row[colDate] : '')
            const version     = String(row[colVersion] || '').trim()

            // Determine action for update mode
            let _action = 'create'
            let _targetId = null
            if (mode === 'update') {
              if (releaseDate && version) {
                const key = `${releaseDate}|${version}`
                const existing = existingMap[key] || []
                const emptyMatches = existing.filter(r => !r.hnId && !r.app)
                if (emptyMatches.length === 1) {
                  // Found exactly 1 empty record → patch it
                  _action   = 'update'
                  _targetId = emptyMatches[0].id
                } else if (existing.some(r => r.hnId || r.app)) {
                  // Record exists and already has data → skip
                  _action = 'skip'
                } else {
                  // No record found (was deleted) → create new
                  _action = 'create'
                }
              } else {
                _action = 'skip'
              }
            }

            return {
              _idx:        idx,
              rawAppName,
              hnId,
              matched,
              appId:       matched?.id || '',
              appName:     matched ? (matched.alpId || matched.hnId) : rawAppName,
              releaseDate,
              version,
              rollout:     normalizeRollout(row[colRollout]),
              releaseNote: String(row[colDesc] || '').trim(),
              lastCheckedDate: normalizeDate(colChecked ? row[colChecked] : ''),
              status:      String(row[colStatus] || '').trim(),
              reviewNotes: String(row[colReviewNotes] || '').trim(),
              _action,
              _targetId,
              _skip: _action === 'skip' || (mode === 'update' && !matched),
            }
          })
          .filter(r => r.rawAppName && r.releaseDate) // keep rows with app name + date

        if (!parsed.length) { setError('Không tìm thấy dữ liệu hợp lệ trong file.'); return }
        setRows(parsed)
        setStep('preview')
      } catch (err) {
        setError(`Lỗi đọc file: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const toggleSkip = (idx) => {
    setRows(rs => rs.map(r => r._idx === idx ? { ...r, _skip: !r._skip } : r))
  }

  const handleImport = async () => {
    const toImport = rows.filter(r => !r._skip && r.releaseDate)
    if (!toImport.length) return
    setStep('importing')
    setProgress({ done: 0, total: toImport.length, errors: [] })
    const errors = []
    for (let i = 0; i < toImport.length; i++) {
      const r = toImport[i]
      try {
        if (r._action === 'update' && r._targetId) {
          // Repair mode: fill HN ID, app link, and correct rollout
          await updateRelease(r._targetId, {
            hnId:   r.hnId   || undefined,
            app:    r.appId  || undefined,
            rollout: r.rollout || undefined,
          })
        } else {
          await createRelease({
            app:             r.appId || undefined,
            hnId:            r.hnId || undefined,
            releaseDate:     r.releaseDate,
            version:         r.version,
            rollout:         r.rollout,
            releaseNote:     r.releaseNote,
            lastCheckedDate: r.lastCheckedDate || undefined,
            status:          r.status || undefined,
            reviewNotes:     r.reviewNotes || undefined,
          })
        }
      } catch (e) {
        errors.push(`${r.rawAppName}: ${e.message}`)
      }
      setProgress(p => ({ ...p, done: i + 1, errors }))
      await new Promise(res => setTimeout(res, 150))
    }
    setStep('done')
    setProgress(p => ({ ...p, errors }))
  }

  const matched     = rows.filter(r => r.appId  && r.releaseDate && !r._skip).length
  const unmatched   = rows.filter(r => !r.appId && r.releaseDate && !r._skip).length
  const skipped     = rows.filter(r => r._skip).length
  const toUpdate    = rows.filter(r => r._action === 'update' && !r._skip).length
  const toCreate    = rows.filter(r => r._action === 'create' && !r._skip && mode === 'update').length
  const totalImport = rows.filter(r => !r._skip && r.releaseDate).length

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl flex flex-col" style={{ width: '90vw', maxWidth: 900, maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div>
            <h2 className="font-semibold text-base">Import từ Excel</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
              {step === 'upload' && 'Chọn file .xlsx để import hàng loạt'}
              {step === 'preview' && mode === 'import' && `${rows.length} dòng — ${matched} có app, ${unmatched} không có app, ${skipped} bỏ qua`}
              {step === 'preview' && mode === 'update' && `${rows.length} dòng — ${toUpdate} update, ${toCreate} tạo mới, ${skipped} bỏ qua`}
              {step === 'importing' && `Đang import... ${progress.done}/${progress.total}`}
              {step === 'done' && `Hoàn tất! ${progress.done - progress.errors.length}/${progress.done} thành công`}
            </p>
          </div>
          <button onClick={onClose} className="text-xl" style={{ color: '#94a3b8' }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">

          {/* Upload step */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
              {/* Mode toggle */}
              <div className="flex rounded-xl overflow-hidden border border-surface-200 text-sm font-medium">
                {[
                  { value: 'import', label: '➕ Import mới' },
                  { value: 'update', label: '✏️ Update record' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className="px-5 py-2.5 transition-colors"
                    style={{
                      background: mode === value ? '#0d9488' : '#fff',
                      color:      mode === value ? '#fff' : '#64748b',
                    }}
                  >{label}</button>
                ))}
              </div>
              <p className="text-xs text-center" style={{ color: '#94a3b8', maxWidth: 420 }}>
                {mode === 'import'
                  ? <>Tạo records mới. Hỗ trợ cột: <strong>App Name</strong>, <strong>Release Date</strong>, <strong>Version</strong>, <strong>Roll-out</strong>, <strong>Description</strong>, <strong>Status</strong>, <strong>Review Notes</strong></>
                  : <>Chỉ điền HN ID cho records đang trống. Match theo <strong>Release Date + Version</strong>. Records đã có HN ID sẽ bị bỏ qua.</>
                }
              </p>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#f0fdf4' }}>📊</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: '#0d9488' }}
              >Chọn file .xlsx</button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          )}

          {/* Preview step */}
          {step === 'preview' && (
            <div style={{ overflow: 'auto' }}>
              <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }} className="border-b border-surface-200">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      {(() => {
                        const isSelectable = r => mode === 'update'
                          ? (r._action === 'update' || r._action === 'create')
                          : !!r.releaseDate
                        const selectableRows = rows.filter(isSelectable)
                        const allChecked = selectableRows.length > 0 && selectableRows.every(r => !r._skip)
                        const someChecked = selectableRows.some(r => !r._skip)
                        return (
                          <input
                            type="checkbox"
                            className="cursor-pointer"
                            checked={allChecked}
                            ref={el => { if (el) el.indeterminate = !allChecked && someChecked }}
                            onChange={() => {
                              const shouldCheck = !allChecked
                              setRows(rs => rs.map(r => {
                                if (!isSelectable(r)) return r
                                return { ...r, _skip: !shouldCheck }
                              }))
                            }}
                          />
                        )
                      })()}
                    </th>
                    {['App Name (Excel)', 'HN ID', 'Match', 'Ngày', 'Version', 'Roll-out', 'Mô tả', 'Status', 'Action'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap" style={{ color: '#64748b' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {rows.map(r => (
                    <tr key={r._idx} className={r._skip ? 'opacity-40' : r.appId ? '' : 'bg-amber-50'}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={!r._skip} onChange={() => toggleSkip(r._idx)} className="cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate" title={r.rawAppName}>{r.rawAppName}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: '#64748b' }}>{r.hnId || '—'}</td>
                      <td className="px-3 py-2">
                        {r.matched
                          ? <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#d1fae5', color: '#065f46' }}>✓ {r.matched.alpId || r.matched.hnId}</span>
                          : <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>Không tìm thấy</span>
                        }
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap" style={{ color: '#64748b' }}>{r.releaseDate || '—'}</td>
                      <td className="px-3 py-2 font-mono">{r.version || '—'}</td>
                      <td className="px-3 py-2">{r.rollout || '--'}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate" style={{ color: '#64748b' }} title={r.releaseNote}>{r.releaseNote || '—'}</td>
                      <td className="px-3 py-2">{r.status || '—'}</td>
                      <td className="px-3 py-2">
                        {r._action === 'update' && <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#dbeafe', color: '#1d4ed8' }}>✏ Update</span>}
                        {r._action === 'skip'   && <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#f1f5f9', color: '#94a3b8' }}>— Bỏ qua</span>}
                        {r._action === 'create' && <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: '#d1fae5', color: '#065f46' }}>+ Tạo</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Importing step */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-t-teal-500 animate-spin" style={{ borderColor: '#e2e8f0', borderTopColor: '#0d9488' }} />
              <p className="text-sm font-medium">Đang tạo records...</p>
              <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, background: '#0d9488' }} />
              </div>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{progress.done} / {progress.total}</p>
            </div>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: '#f0fdf4' }}>✅</div>
              <p className="text-sm font-semibold">Import hoàn tất</p>
              <p className="text-sm" style={{ color: '#64748b' }}>
                {progress.done - progress.errors.length} records đã được tạo thành công
              </p>
              {progress.errors.length > 0 && (
                <div className="rounded-lg p-3 w-full max-w-md text-xs" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                  <p className="font-medium mb-1">{progress.errors.length} lỗi:</p>
                  {progress.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 shrink-0">
          <button className="btn-secondary text-sm" onClick={onClose}>
            {step === 'done' ? 'Đóng' : 'Huỷ'}
          </button>
          <div className="flex gap-2">
            {step === 'preview' && (
              <>
                <button className="btn-secondary text-sm" onClick={() => setStep('upload')}>← Chọn file khác</button>
                <button
                  disabled={totalImport === 0}
                  onClick={handleImport}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: '#0d9488' }}
                >
                  {mode === 'update'
                    ? `✏ Update ${toUpdate} + Tạo ${toCreate} records →`
                    : `Import ${totalImport} records →`}
                </button>
              </>
            )}
            {step === 'done' && (
              <button
                onClick={() => { onDone(); onClose() }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#0d9488' }}
              >Xem kết quả</button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
