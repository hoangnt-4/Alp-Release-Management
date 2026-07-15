import React, { useState, useCallback } from 'react'

// ─── Stop words ───────────────────────────────────────────────────────────────
const STOP = new Set(['a','an','the','and','or','for','with','to','of','in','on','at','by','is','it','as','my','your','best','new','top','all','any'])

// ─── Keyword dictionary ───────────────────────────────────────────────────────
const KEYWORD_MAP = {
  piano:      { base: ['piano','keyboard','keys','music'],         related: ['tiles','song','melody','notes','lessons','learn','instrument','play'] },
  music:      { base: ['music','audio','sound'],                   related: ['player','beat','melody','song','rhythm','studio','listen','mp3'] },
  guitar:     { base: ['guitar','chord','strings'],                related: ['music','tabs','learn','tuner','song','acoustic','bass'] },
  drum:       { base: ['drum','beat','rhythm'],                    related: ['music','pad','machine','loop','bass','kit'] },
  song:       { base: ['song','music','track'],                    related: ['lyrics','karaoke','melody','sing','player','audio'] },
  audio:      { base: ['audio','sound','voice'],                   related: ['recorder','player','editor','music','equalizer','mp3'] },
  photo:      { base: ['photo','picture','image'],                 related: ['editor','camera','filter','gallery','collage','effects','restore'] },
  camera:     { base: ['camera','photo','selfie'],                 related: ['filter','lens','beauty','portrait','snap','gallery'] },
  video:      { base: ['video','clip','movie'],                    related: ['editor','maker','player','cut','trim','effects','record'] },
  gallery:    { base: ['gallery','album','photo'],                 related: ['picture','image','video','slide','viewer','organizer'] },
  file:       { base: ['file','folder','storage'],                 related: ['manager','explorer','transfer','backup','cloud','organizer'] },
  recovery:   { base: ['recovery','recover','restore'],            related: ['photo','file','data','backup','undelete','repair','deleted'] },
  backup:     { base: ['backup','restore','sync'],                 related: ['file','data','cloud','storage','transfer','recovery'] },
  data:       { base: ['data','storage','cloud'],                  related: ['backup','recovery','transfer','sync','file','manager'] },
  alarm:      { base: ['alarm','clock','timer'],                   related: ['sleep','wake','ringtone','schedule','reminder','bell'] },
  clock:      { base: ['clock','time','watch'],                    related: ['alarm','timer','world','digital','stopwatch','timezone'] },
  calendar:   { base: ['calendar','planner','schedule'],           related: ['reminder','event','todo','agenda','daily','task'] },
  calculator: { base: ['calculator','math','calc'],                related: ['unit','converter','finance','scientific','compute'] },
  scanner:    { base: ['scanner','scan','qr'],                     related: ['barcode','document','pdf','reader','camera','ocr'] },
  recorder:   { base: ['recorder','record','voice'],               related: ['audio','sound','memo','note','playback','microphone'] },
  fitness:    { base: ['fitness','workout','gym'],                 related: ['health','exercise','training','tracker','body','weight','run'] },
  run:        { base: ['run','running','jogging'],                 related: ['fitness','tracker','pace','distance','walk','steps','cardio'] },
  yoga:       { base: ['yoga','meditation','zen'],                 related: ['health','relax','breath','mindfulness','calm','stretch'] },
  diet:       { base: ['diet','food','calorie'],                   related: ['nutrition','health','meal','weight','tracker','recipes'] },
  tracker:    { base: ['tracker','track','monitor'],               related: ['fitness','health','gps','location','activity','steps'] },
  game:       { base: ['game','play','arcade'],                    related: ['fun','puzzle','action','racing','adventure','casual','score'] },
  puzzle:     { base: ['puzzle','brain','logic'],                  related: ['word','number','match','block','tile','quiz','riddle'] },
  racing:     { base: ['race','racing','car'],                     related: ['speed','drive','drift','road','turbo','motor','vehicle'] },
  vpn:        { base: ['vpn','proxy','secure'],                    related: ['privacy','speed','shield','network','server','tunnel'] },
  wifi:       { base: ['wifi','network','internet'],               related: ['speed','test','analyzer','scanner','signal','connect'] },
  battery:    { base: ['battery','power','charge'],                related: ['saver','boost','optimizer','monitor','manager','life'] },
  cleaner:    { base: ['cleaner','clean','boost'],                 related: ['optimizer','speed','cache','memory','phone','junk','storage'] },
  booster:    { base: ['booster','boost','speed'],                 related: ['cleaner','optimizer','ram','performance','battery','phone'] },
  volume:     { base: ['volume','sound','audio'],                  related: ['booster','equalizer','control','music','bass','speaker'] },
  location:   { base: ['location','gps','map'],                   related: ['tracker','finder','navigation','route','nearby','coordinates'] },
  map:        { base: ['map','navigation','gps'],                  related: ['route','direction','travel','location','guide','compass'] },
  gps:        { base: ['gps','location','map'],                    related: ['tracker','navigation','route','coordinates','find','nearby'] },
  finance:    { base: ['finance','money','budget'],                related: ['tracker','expense','wallet','saving','loan','bank','income'] },
  wallet:     { base: ['wallet','payment','money'],                related: ['finance','budget','expense','bank','transaction','cash'] },
  expense:    { base: ['expense','budget','money'],                related: ['tracker','finance','wallet','saving','income','report'] },
  chat:       { base: ['chat','message','talk'],                   related: ['voice','call','group','video','messenger','text','share'] },
  call:       { base: ['call','phone','voip'],                     related: ['video','chat','message','voice','conference','talk'] },
  pdf:        { base: ['pdf','document','file'],                   related: ['reader','viewer','editor','converter','sign','scanner'] },
  note:       { base: ['note','memo','journal'],                   related: ['diary','notebook','write','text','record','todo'] },
  translate:  { base: ['translate','language','dictionary'],       related: ['text','word','learn','speech','voice','foreign'] },
  weather:    { base: ['weather','forecast','rain'],               related: ['temperature','wind','climate','daily','alert','storm'] },
  news:       { base: ['news','article','feed'],                   related: ['daily','reader','blog','magazine','update','headline'] },
  downloader: { base: ['downloader','download','save'],            related: ['video','file','music','photo','browser','fast'] },
  manager:    { base: ['manager','manage','organizer'],            related: ['file','task','app','control','dashboard','system'] },
  reader:     { base: ['reader','read','viewer'],                  related: ['book','ebook','pdf','document','text','library'] },
  browser:    { base: ['browser','web','internet'],                related: ['fast','private','secure','search','page','tab'] },
}

// ─── Tokenize ─────────────────────────────────────────────────────────────────
function tokenize(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !STOP.has(t))
}

function findEntry(token) {
  if (KEYWORD_MAP[token]) return KEYWORD_MAP[token]
  for (const [, val] of Object.entries(KEYWORD_MAP)) {
    if (val.base.includes(token) || val.related.includes(token)) return val
  }
  for (const [key, val] of Object.entries(KEYWORD_MAP)) {
    if (token.length >= 4 && (token.includes(key) || key.includes(token))) return val
  }
  return null
}

// ─── Algorithmic generation ───────────────────────────────────────────────────
function generateBundleIds(appName, prefixMode) {
  const tokens = tokenize(appName)
  if (tokens.length === 0) return []

  const rawTokens = [...new Set(tokens)]
  const baseExtra = [], relExtra = []
  for (const t of rawTokens) {
    const entry = findEntry(t)
    if (!entry) continue
    for (const w of entry.base)    { if (!rawTokens.includes(w)) baseExtra.push(w) }
    for (const w of entry.related) { if (!rawTokens.includes(w)) relExtra.push(w) }
  }
  const base = [...new Set(baseExtra)]
  const rel  = [...new Set(relExtra)].filter(w => !base.includes(w))
  const kws  = [...rawTokens, ...base, ...rel]

  const pfx    = prefixMode === 'alphalogy' ? 'com.alphalogy' : 'com'
  const maxSeg = prefixMode === 'alphalogy' ? 3 : 4

  const build = (...parts) => {
    const segs = [...new Set(parts.filter(Boolean))].slice(0, maxSeg)
    return `${pfx}.${segs.join('.')}`
  }
  const k = i => kws[i] ?? kws[kws.length - 1] ?? 'app'
  const r = i => rel[i] ?? kws[rawTokens.length + i] ?? k(i + 1)

  return [
    { label: 'Chính xác', id: build(k(0), k(1), k(2)) },
    { label: 'Pro',        id: build(k(0), k(1), r(0), 'pro') },
    { label: 'Free',       id: build(k(0), k(1), r(1) || r(0), 'free') },
    { label: 'Manager',    id: build(k(0), k(1), 'manager') },
    { label: 'Plus',       id: build(k(0), 'plus', k(1), k(2)) },
    { label: 'Studio',     id: build(k(0), r(0) || k(1), 'studio') },
    { label: 'Ultimate',   id: build('ultimate', k(0), k(1)) },
  ]
}

// ─── AI generation via Netlify Function → Claude API ─────────────────────────
async function generateWithAI(appName, prefixMode) {
  const res = await fetch('/.netlify/functions/bundle-id-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appName, prefixMode }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || `Error ${res.status}`)
  if (!Array.isArray(data.results)) throw new Error('Unexpected response format')
  return data.results
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconSparkle = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
)

// ─── Result row ───────────────────────────────────────────────────────────────
function ResultRow({ r, i, copied, onCopy, badge }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#0d9488'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
    >
      {badge && (
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
          AI
        </span>
      )}
      <code style={{ flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.01em', wordBreak: 'break-all' }}>
        {r.id}
      </code>
      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: '#f1f5f9', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {r.label}
      </span>
      <button onClick={() => onCopy(r.id, i)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.12s', flexShrink: 0,
          background: copied === i ? '#f0fdfa' : '#0d9488',
          color: copied === i ? '#0d9488' : '#fff' }}>
        {copied === i ? <IconCheck /> : <IconCopy />}
        {copied === i ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BundleIdGenerator() {
  const [appName,    setAppName]    = useState('')
  const [prefix,     setPrefix]     = useState('aso')
  const [copied,     setCopied]     = useState(null)
  const [aiResults,  setAiResults]  = useState(null)   // null = not fetched yet
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState(null)

  const algoResults = appName.trim().length >= 2
    ? generateBundleIds(appName, prefix)
    : []

  // Reset AI results when app name or prefix changes
  const handleNameChange = e => {
    setAppName(e.target.value)
    setAiResults(null)
    setAiError(null)
  }
  const handlePrefixChange = key => {
    setPrefix(key)
    setAiResults(null)
    setAiError(null)
  }

  const handleAI = async () => {
    if (!appName.trim() || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    setAiResults(null)
    try {
      const results = await generateWithAI(appName.trim(), prefix)
      setAiResults(results)
    } catch (err) {
      setAiError(err.message || 'Lỗi không xác định')
    } finally {
      setAiLoading(false)
    }
  }

  const handleCopy = useCallback((id, idx) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 1800)
    })
  }, [])

  const hasInput = appName.trim().length >= 2

  return (
    <div style={{ padding: '24px', maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>⌗</span> Bundle ID Generator
        </h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Gen ngay theo thuật toán · hoặc bấm AI để gợi ý thông minh hơn.
        </p>
      </div>

      {/* Input card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Input row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={appName}
            onChange={handleNameChange}
            placeholder="Tên app, ví dụ: Photo & File Recovery, Volume Booster…"
            style={{ flex: 1, fontSize: 15, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, outline: 'none', color: '#0f172a', background: '#fafafa', transition: 'border-color 0.15s' }}
            onFocus={e => e.target.style.borderColor = '#0d9488'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            onKeyDown={e => e.key === 'Enter' && hasInput && handleAI()}
          />
          <button
            onClick={handleAI}
            disabled={!hasInput || aiLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 9, border: 'none', cursor: hasInput && !aiLoading ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
              background: hasInput && !aiLoading ? '#f59e0b' : '#e2e8f0',
              color: hasInput && !aiLoading ? '#fff' : '#94a3b8',
              opacity: aiLoading ? 0.7 : 1 }}
          >
            {aiLoading
              ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Đang gen…</>
              : <><IconSparkle /> AI Suggest</>
            }
          </button>
        </div>

        {/* Prefix toggle */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { key: 'aso',       label: 'Thuần ASO từ khóa' },
            { key: 'alphalogy', label: 'Prefix Alphalogy'  },
          ].map(m => (
            <button key={m.key} onClick={() => handlePrefixChange(m.key)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.12s',
                background: prefix === m.key ? '#0d9488' : '#fff',
                borderColor: prefix === m.key ? '#0d9488' : '#e2e8f0',
                color: prefix === m.key ? '#fff' : '#64748b' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Results */}
      {aiResults && aiResults.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
            <IconSparkle /> AI Suggestions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {aiResults.map((r, i) => (
              <ResultRow key={`ai-${i}`} r={r} i={`ai-${i}`} copied={copied} onCopy={handleCopy} badge />
            ))}
          </div>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div style={{ marginBottom: 20, padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, fontSize: 13, color: '#dc2626' }}>
          ⚠ {aiError}
        </div>
      )}

      {/* Algorithmic Results */}
      {algoResults.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            {aiResults ? 'Thuật toán' : 'Bundle / Package ID gợi ý'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {algoResults.map((r, i) => (
              <ResultRow key={`algo-${i}`} r={r} i={`algo-${i}`} copied={copied} onCopy={handleCopy} />
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 16 }}>
            Lưu ý: Bundle ID không đổi được sau khi publish. Kiểm tra trùng lặp trước khi upload bản đầu tiên.
          </p>
        </>
      )}

      {appName.trim().length > 0 && appName.trim().length < 2 && (
        <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>Nhập ít nhất 2 ký tự…</p>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
