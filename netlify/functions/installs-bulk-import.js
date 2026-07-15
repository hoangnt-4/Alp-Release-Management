/**
 * Bulk-import installs từ CSV vào Lark.
 * POST { data: [{ hnId, installs }], updatedDate?: number (timestamp ms) }
 * Điều kiện: chỉ ghi nếu record chưa có Installs (không ghi đè).
 * Dùng batch_update để tránh timeout.
 */
import { getTenantToken, larkHeaders, BASE_URL, BASE_ID } from './_lark.js'

const TABLE_ID = 'tbl1x8bBZZDaYbZw'

function larkText(v) {
  if (!v) return ''
  if (Array.isArray(v)) return typeof v[0] === 'object' ? (v[0]?.text || '') : String(v[0])
  if (typeof v === 'object') return v.text || ''
  return String(v)
}

async function fetchAllRecords(token) {
  let records = [], pageToken = '', hasMore = true
  while (hasMore) {
    const url = `${BASE_URL}/apps/${BASE_ID}/tables/${TABLE_ID}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`
    const res  = await fetch(url, { headers: larkHeaders(token) })
    const data = await res.json()
    if (data.code !== 0) throw new Error('Lark fetch: ' + data.msg)
    records   = records.concat(data.data?.items || [])
    hasMore   = data.data?.has_more || false
    pageToken = data.data?.page_token || ''
  }
  return records
}

/**
 * Batch update — up to 500 records per call.
 * records: [{ record_id, fields }]
 */
async function batchUpdate(token, records) {
  const CHUNK = 500
  const errors = []
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK)
    const url = `${BASE_URL}/apps/${BASE_ID}/tables/${TABLE_ID}/records/batch_update`
    const res  = await fetch(url, {
      method:  'POST',
      headers: larkHeaders(token),
      body:    JSON.stringify({ records: chunk }),
    })
    const data = await res.json()
    if (data.code !== 0) errors.push(`Lark batch ${data.code}: ${data.msg}`)
  }
  if (errors.length) throw new Error(errors.join('; '))
}

export default async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers })
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers })

  try {
    const { data, updatedDate } = await req.json()
    if (!Array.isArray(data) || data.length === 0) {
      return new Response(JSON.stringify({ error: 'data array is required' }), { status: 400, headers })
    }

    const updatedTs = updatedDate && !isNaN(Number(updatedDate)) ? Number(updatedDate) : Date.now()

    // Build lookup: hnId → installs (keep max for duplicates)
    const csvMap = {}
    for (const { hnId, installs } of data) {
      if (!hnId || installs == null) continue
      const n = Math.floor(Number(installs))
      if (!isNaN(n) && (!csvMap[hnId] || n > csvMap[hnId])) csvMap[hnId] = n
    }

    const token   = await getTenantToken()
    const records = await fetchAllRecords(token)

    const toWrite  = []
    const skipped  = []
    const notFound = []

    for (const rec of records) {
      const f        = rec.fields || {}
      const hnId     = larkText(f['HN ID']).trim()
      const existing = f['Installs'] != null ? Number(f['Installs']) : null
      const csvVal   = csvMap[hnId]

      if (csvVal == null) { notFound.push(hnId); continue }

      if (existing != null && !isNaN(existing) && existing > 0) {
        skipped.push({ hnId, existing })
        continue
      }

      toWrite.push({
        record_id: rec.record_id,
        fields: { Installs: csvVal, 'Last Updated Date': updatedTs },
        _hnId: hnId,
        _installs: csvVal,
      })
    }

    // Batch write all at once
    if (toWrite.length > 0) {
      await batchUpdate(token, toWrite.map(r => ({
        record_id: r.record_id,
        fields:    r.fields,
      })))
    }

    return new Response(JSON.stringify({
      success:  true,
      written:  toWrite.length,
      skipped:  skipped.length,
      notFound: notFound.filter(Boolean).length,
      details:  {
        written:  toWrite.map(r => ({ hnId: r._hnId, installs: r._installs })),
        skipped,
        notFound: notFound.filter(Boolean),
      },
    }), { status: 200, headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
