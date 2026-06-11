import { getTenantToken, larkHeaders, BASE_URL, BASE_ID, TBL_RELEASES, mapRelease, buildReleaseFields } from './_lark.js'

export default async (req, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  }

  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers })

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  // path: api/releases or api/releases/:id
  const recordId = parts[parts.length - 1] !== 'releases' ? parts[parts.length - 1] : null

  try {
    const token = await getTenantToken()
    const hdrs  = larkHeaders(token)

    if (req.method === 'GET' && !recordId) {
      // Fetch all pages server-side — client gets 1 response with all records
      let all = [], pageToken = '', hasMore = true
      while (hasMore) {
        const larkRes = await fetch(
          `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_RELEASES}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`,
          { headers: hdrs }
        )
        const data = await larkRes.json()
        if (data.code !== 0) throw new Error(data.msg)
        all       = all.concat((data.data?.items || []).map(mapRelease))
        hasMore   = data.data?.has_more || false
        pageToken = data.data?.page_token || ''
      }
      return new Response(JSON.stringify({ records: all, hasMore: false }), { status: 200, headers })
    }

    if (req.method === 'POST' && !recordId) {
      const body   = await req.json()
      const fields = buildReleaseFields(body)
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_RELEASES}/records`,
        { method: 'POST', headers: hdrs, body: JSON.stringify({ fields }) }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      // Re-fetch the created record so linked fields (App, HN ID) are populated
      const newId = data.data?.record?.record_id
      if (newId) {
        const getRes  = await fetch(`${BASE_URL}/apps/${BASE_ID}/tables/${TBL_RELEASES}/records/${newId}`, { headers: hdrs })
        const getData = await getRes.json()
        if (getData.code === 0) {
          return new Response(JSON.stringify(mapRelease(getData.data?.record)), { status: 201, headers })
        }
      }
      return new Response(JSON.stringify(mapRelease(data.data?.record || { record_id: '', fields: {} })), { status: 201, headers })
    }

    if (req.method === 'PATCH' && recordId) {
      const body   = await req.json()
      const fields = buildReleaseFields(body)
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_RELEASES}/records/${recordId}`,
        { method: 'PUT', headers: hdrs, body: JSON.stringify({ fields }) }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    }

    if (req.method === 'DELETE' && recordId) {
      const larkRes = await fetch(
        `${BASE_URL}/apps/${BASE_ID}/tables/${TBL_RELEASES}/records/${recordId}`,
        { method: 'DELETE', headers: hdrs }
      )
      const data = await larkRes.json()
      if (data.code !== 0) throw new Error(data.msg)
      return new Response(JSON.stringify({ success: true }), { status: 200, headers })
    }

    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers })
  } catch (err) {
    console.error('[releases]', err)
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers })
  }
}

export const config = { path: '/api/releases/:id?' }
