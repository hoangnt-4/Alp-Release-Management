import { getAdsByAppKey, upsertAds, deleteAdsByAppKey } from './_supabase.js'

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: CORS })

  try {
    // ── GET /api/ads?app_key=xxx ──────────────────────────────────────────────
    if (req.method === 'GET') {
      const url    = new URL(req.url)
      const appKey = url.searchParams.get('app_key')
      if (!appKey) return new Response(JSON.stringify({ message: 'app_key required' }), { status: 400, headers: CORS })

      const data = await getAdsByAppKey(appKey)
      return new Response(JSON.stringify(data), { status: 200, headers: CORS })
    }

    // ── POST /api/ads  { app_key, units } ────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { app_key, units } = body
      if (!app_key || !Array.isArray(units)) {
        return new Response(JSON.stringify({ message: 'app_key and units[] required' }), { status: 400, headers: CORS })
      }

      await upsertAds(app_key, units)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS })
    }

    // ── DELETE /api/ads  { app_key, months? } ────────────────────────────────
    if (req.method === 'DELETE') {
      const body   = await req.json().catch(() => ({}))
      const appKey = body.app_key
      const months = Array.isArray(body.months) ? body.months : null
      if (!appKey) return new Response(JSON.stringify({ message: 'app_key required' }), { status: 400, headers: CORS })

      await deleteAdsByAppKey(appKey, months)
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS })
    }

    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: CORS })
  } catch (err) {
    console.error('[ads]', err)
    return new Response(JSON.stringify({ message: err.message }), { status: 500, headers: CORS })
  }
}

export const config = { path: '/api/ads' }
