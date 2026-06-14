const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

function headers(extra = {}) {
  return {
    'apikey':        SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type':  'application/json',
    ...extra,
  }
}

async function rpc(path, opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, opts)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase ${res.status}: ${body}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : []
}

// ── Read ──────────────────────────────────────────────────────────────────────
export async function getAdsByAppKey(appKey) {
  const units = await rpc(
    `ad_units?app_key=eq.${encodeURIComponent(appKey)}&select=id,name,type`,
    { headers: headers() },
  )
  if (!units.length) return { months: [], units: [] }

  const ids = units.map(u => u.id).join(',')
  const metrics = await rpc(
    `ad_metrics?ad_unit_id=in.(${ids})&select=*&order=month.asc`,
    { headers: headers() },
  )

  const monthSet = new Set()
  const unitMap  = {}
  for (const u of units) unitMap[u.id] = { name: u.name, type: u.type, data: {} }

  for (const m of metrics) {
    monthSet.add(m.month)
    if (unitMap[m.ad_unit_id]) {
      unitMap[m.ad_unit_id].data[m.month] = {
        requests:   m.requests,
        matchRate:  m.match_rate,
        matchedReq: m.matched_req,
        showRate:   m.show_rate,
        impressions: m.impressions,
        ctr:        m.ctr,
        clicks:     m.clicks,
      }
    }
  }

  return {
    months: [...monthSet].sort(),
    units:  Object.values(unitMap),
  }
}

// ── Delete ───────────────────────────────────────────────────────────────────
// months: string[] — if provided, only delete those months; if empty/null, delete all
export async function deleteAdsByAppKey(appKey, months) {
  if (months && months.length) {
    // Get unit ids for this app
    const units = await rpc(
      `ad_units?app_key=eq.${encodeURIComponent(appKey)}&select=id`,
      { headers: headers() },
    )
    if (!units.length) return

    const ids = units.map(u => u.id).join(',')
    const monthFilter = months.map(m => `"${m}"`).join(',')
    await rpc(
      `ad_metrics?ad_unit_id=in.(${ids})&month=in.(${monthFilter})`,
      { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) },
    )
    // Clean up ad_units that now have no metrics
    const remaining = await rpc(
      `ad_metrics?ad_unit_id=in.(${ids})&select=ad_unit_id`,
      { headers: headers() },
    ).catch(() => [])
    const usedIds = new Set(remaining.map(r => r.ad_unit_id))
    const orphanIds = units.map(u => u.id).filter(id => !usedIds.has(id))
    if (orphanIds.length) {
      await rpc(
        `ad_units?id=in.(${orphanIds.join(',')})`,
        { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) },
      ).catch(() => {})
    }
  } else {
    // Delete all — cascades to ad_metrics via ON DELETE CASCADE
    await rpc(
      `ad_units?app_key=eq.${encodeURIComponent(appKey)}`,
      { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) },
    )
  }
}

// ── Engagement helpers ────────────────────────────────────────────────────────
export async function getEngagement(appKey) {
  const rows = await rpc(
    `engagement_metrics?app_key=eq.${encodeURIComponent(appKey)}&select=month,avg_seconds&order=month.asc`,
    { headers: headers() },
  )
  return rows // [{ month, avg_seconds }]
}

export async function upsertEngagement(appKey, entries) {
  // entries: [{ month, avg_seconds }]
  if (!entries.length) return
  const rows = entries.map(e => ({ app_key: appKey, month: e.month, avg_seconds: e.avg_seconds }))
  await rpc(
    `engagement_metrics?on_conflict=app_key,month`,
    {
      method:  'POST',
      headers: headers({ 'Prefer': 'return=minimal,resolution=merge-duplicates' }),
      body:    JSON.stringify(rows),
    },
  )
}

export async function deleteEngagement(appKey, months) {
  if (months && months.length) {
    const monthFilter = months.map(m => `"${m}"`).join(',')
    await rpc(
      `engagement_metrics?app_key=eq.${encodeURIComponent(appKey)}&month=in.(${monthFilter})`,
      { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) },
    )
  } else {
    await rpc(
      `engagement_metrics?app_key=eq.${encodeURIComponent(appKey)}`,
      { method: 'DELETE', headers: headers({ 'Prefer': 'return=minimal' }) },
    )
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────
// units: [{ name, type, data: { [month]: { requests, matchRate, ... } } }]
export async function upsertAds(appKey, units) {
  if (!units.length) return

  // 1. Upsert ad_units → get back ids
  const unitRows = units.map(u => ({ app_key: appKey, name: u.name, type: u.type }))
  const saved = await rpc(
    `ad_units?on_conflict=app_key,name`,
    {
      method:  'POST',
      headers: headers({ 'Prefer': 'return=representation,resolution=merge-duplicates' }),
      body:    JSON.stringify(unitRows),
    },
  )

  const nameToId = {}
  for (const u of saved) nameToId[u.name] = u.id

  // 2. Upsert metrics
  const metricRows = []
  for (const unit of units) {
    const id = nameToId[unit.name]
    if (!id) continue
    for (const [month, d] of Object.entries(unit.data)) {
      if (month === '__pending__') continue
      metricRows.push({
        ad_unit_id:  id,
        month,
        requests:    d.requests,
        match_rate:  d.matchRate,
        matched_req: d.matchedReq,
        show_rate:   d.showRate,
        impressions: d.impressions,
        ctr:         d.ctr,
        clicks:      d.clicks,
      })
    }
  }

  if (!metricRows.length) return

  await rpc(
    `ad_metrics?on_conflict=ad_unit_id,month`,
    {
      method:  'POST',
      headers: headers({ 'Prefer': 'return=minimal,resolution=merge-duplicates' }),
      body:    JSON.stringify(metricRows),
    },
  )
}
