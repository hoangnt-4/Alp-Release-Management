import { getEngagement, upsertEngagement, deleteEngagement } from './_supabase.js'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const appKey = url.searchParams.get('app_key')
      if (!appKey) return new Response(JSON.stringify({ error: 'app_key required' }), { status: 400, headers: CORS })
      const data = await getEngagement(appKey)
      return new Response(JSON.stringify(data), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (req.method === 'POST') {
      const { app_key, entries } = await req.json()
      if (!app_key || !entries) return new Response(JSON.stringify({ error: 'app_key + entries required' }), { status: 400, headers: CORS })
      await upsertEngagement(app_key, entries)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    if (req.method === 'DELETE') {
      const { app_key, months } = await req.json()
      if (!app_key) return new Response(JSON.stringify({ error: 'app_key required' }), { status: 400, headers: CORS })
      await deleteEngagement(app_key, months)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })
  } catch (e) {
    console.error('engagement error:', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
}

export const config = { path: '/api/engagement' }
