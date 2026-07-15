import { getTenantToken, larkHeaders } from './_lark.js'

const BASE_ID  = process.env.LARK_BASE_ID
const TABLE_ID = 'tbl1x8bBZZDaYbZw'

function larkText(v) {
  if (!v) return ''
  if (Array.isArray(v)) return typeof v[0] === 'object' ? (v[0]?.text || '') : String(v[0])
  if (typeof v === 'object') return v.text || ''
  return String(v)
}

export default async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers })

  try {
    // platform = android | ios | all  (default: android for backward compat)
    const reqUrl        = new URL(req.url)
    const platformFilter = reqUrl.searchParams.get('platform') || 'android'

    const token = await getTenantToken()
    const hdrs  = larkHeaders(token)

    let records = [], pageToken = '', hasMore = true
    while (hasMore) {
      const url = `https://open.larksuite.com/open-apis/bitable/v1/apps/${BASE_ID}/tables/${TABLE_ID}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`
      const res  = await fetch(url, { headers: hdrs })
      const data = await res.json()
      if (data.code !== 0) throw new Error(data.msg)
      records   = records.concat(data.data?.items || [])
      hasMore   = data.data?.has_more || false
      pageToken = data.data?.page_token || ''
    }

    const apps = records
      .map(rec => {
        const f            = rec.fields || {}
        const storeId      = larkText(f['Store ID']).trim()
        const platformField = larkText(f['Platform']).trim().toLowerCase()

        // Detect platform
        const isAndroid = platformField === 'android' ||
          (storeId && storeId.includes('.') && !/^\d+$/.test(storeId))
        const isIos = platformField === 'ios' ||
          (!isAndroid && storeId && /^\d+$/.test(storeId))

        const appPlatform = isAndroid ? 'android' : isIos ? 'ios' : null
        if (!appPlatform) return null

        // Apply filter
        if (platformFilter === 'android' && !isAndroid) return null
        if (platformFilter === 'ios'     && !isIos)     return null
        // 'all' passes everything with a detected platform

        return {
          recordId:    rec.record_id,
          alpId:       larkText(f['Alp ID']),
          hnId:        larkText(f['HN ID']),
          storeId,
          appName:     larkText(f['App Name']),
          platform:    appPlatform,
          installs:    f['Installs'] != null ? (Math.floor(Number(f['Installs'])) || null) : null,
          lastUpdated: f['Last Updated Date'] != null ? Number(f['Last Updated Date']) || null : null,
        }
      })
      .filter(Boolean)

    return new Response(JSON.stringify({ apps }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
