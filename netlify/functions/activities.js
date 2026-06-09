import { getTenantToken, larkHeaders, BASE_URL, BASE_ID, TBL_ACTIVITIES, mapActivity, buildActivityFields } from './_lark.js'

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS })

  try {
    const token = await getTenantToken()
    const hdrs  = larkHeaders(token)
    const url   = new URL(req.url)
    const parts = url.pathname.split('/').filter(Boolean) // ['api','activities', recordId?]
    const recordId = parts[2] || null

    // PATCH /api/activities/:id
    if (req.method === 'PATCH' && recordId) {
      const body   = await req.json()
      const fields = buildActivityFields(body)
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_ACTIVITIES}/records/${recordId}`,
        { method: 'PUT', headers: hdrs, body: JSON.stringify({ fields }) }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      return new Response(JSON.stringify({ record: mapActivity(data.data?.record || { record_id: recordId, fields }) }), { status: 200, headers: CORS })
    }

    // GET /api/activities
    let all = [], pageToken = '', hasMore = true
    while (hasMore) {
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_ACTIVITIES}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`,
        { headers: hdrs }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      all = all.concat((data.data?.items || []).map(mapActivity))
      hasMore   = data.data?.has_more || false
      pageToken = data.data?.page_token || ''
    }

    return new Response(JSON.stringify({ records: all }), { status: 200, headers: CORS })
  } catch (err) {
    console.error('[activities]', err)
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers: CORS })
  }
}

export const config = { path: '/api/activities/:recordId?' }
