import { getTenantToken, larkHeaders, BASE_URL, BASE_ID, TBL_TIMELINE, mapTimeline } from './_lark.js'

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers })

  try {
    const token = await getTenantToken()
    const hdrs  = larkHeaders(token)

    let all = [], pageToken = '', hasMore = true
    while (hasMore) {
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_TIMELINE}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`,
        { headers: hdrs }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      all = all.concat((data.data?.items || []).map(mapTimeline))
      hasMore   = data.data?.has_more || false
      pageToken = data.data?.page_token || ''
    }

    return new Response(JSON.stringify({ records: all }), { status: 200, headers })
  } catch (err) {
    console.error('[timeline]', err)
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/timeline' }
