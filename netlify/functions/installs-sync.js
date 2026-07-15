import gplay  from 'google-play-scraper'
import store  from 'app-store-scraper'
import { getTenantToken, larkHeaders, BASE_URL, BASE_ID } from './_lark.js'

const TABLE_ID = 'tbl1x8bBZZDaYbZw'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Fallback: fetch Play Store HTML trực tiếp khi google-play-scraper bị lỗi parse.
 */
async function fetchInstallsDirect(appId) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}&hl=en&gl=us`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  })

  if (res.status === 404) throw new Error('App not found (404)')
  if (!res.ok) throw new Error(`Play Store returned ${res.status}`)

  const html = await res.text()
  if (html.length < 10000) throw new Error('Play Store returned unexpected page (possible captcha)')

  const m1 = html.match(/"maxInstalls"\s*:\s*(\d+)/)
  if (m1) return { maxInstalls: parseInt(m1[1]), title: extractTitle(html) }

  const m2 = html.match(/"installsHistorical"\s*:\s*"([^"]+)"/)
  if (m2) return { maxInstalls: parseInstallStr(m2[1]), title: extractTitle(html) }

  throw new Error('Cannot extract install count from Play Store HTML')
}

function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/)
  return m ? m[1].replace(' - Apps on Google Play', '').trim() : ''
}

function parseInstallStr(str) {
  return parseInt(str.replace(/[^0-9]/g, '')) || null
}

// Top countries để tính global ratings — sorted by app market size
const IOS_COUNTRIES = ['us','cn','jp','gb','de','fr','kr','br','au','ca','in','ru','mx','it','es','id','vn','th','ph','sg','tw','nl','se','no','pl','tr','sa','ae','za','ar']

/**
 * Fetch iOS app data từ App Store — lấy global ratings từ nhiều quốc gia
 */
async function fetchIosData(appId) {
  // Fetch US trước để lấy metadata chính
  const base = await store.app({ id: appId, country: 'us' })

  // Fetch ratings từ tất cả countries (parallel, bỏ qua lỗi)
  const countryResults = await Promise.allSettled(
    IOS_COUNTRIES.map(c => store.app({ id: appId, country: c }).then(d => d.reviews || 0))
  )
  const globalRatings = countryResults.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)

  return {
    title:               base.title              ?? null,
    score:               base.score              != null ? Math.round(base.score * 10) / 10 : null,
    scoreText:           base.scoreText          ?? null,
    ratings:             globalRatings || (base.reviews ?? null),
    ratingsUs:           base.reviews            ?? null,
    currentVersionScore: base.currentVersionScore != null ? Math.round(base.currentVersionScore * 10) / 10 : null,
    developer:           base.developer          ?? null,
    genre:               base.primaryGenre       ?? base.genres?.[0] ?? null,
    size:                base.size               ?? null,
    version:             base.version            ?? null,
    released:            base.released           ?? null,
    updated:             base.updated            ? new Date(base.updated).getTime() : null,
    free:                base.free               ?? null,
    price:               base.price              ?? null,
    contentRating:       base.contentRating      ?? null,
  }
}

/**
 * Ghi installs + app name vào Lark — dùng PUT giống releases.js
 */
async function writeToLark(recordId, installs, title) {
  const token   = await getTenantToken()
  const url     = `${BASE_URL}/apps/${BASE_ID}/tables/${TABLE_ID}/records/${recordId}`
  const fields  = { Installs: installs, 'Last Updated Date': Date.now() }
  const larkRes = await fetch(url, {
    method:  'PUT',
    headers: larkHeaders(token),
    body:    JSON.stringify({ fields }),
  })
  const data = await larkRes.json()
  if (data.code !== 0) throw new Error(`Lark ${data.code}: ${data.msg}`)
  return data
}

export default async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers })

  try {
    const { recordId, storeId, installs: manualInstalls } = await req.json()
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'recordId là bắt buộc' }), { status: 400, headers })
    }

    // Manual entry — bỏ qua gplay, ghi thẳng vào Lark
    if (manualInstalls !== undefined && manualInstalls !== null) {
      const installs = Math.floor(Number(manualInstalls))
      if (!isNaN(installs) && recordId !== 'TEST') await writeToLark(recordId, installs)
      return new Response(JSON.stringify({ installs, method: 'manual' }), { status: 200, headers })
    }

    if (!storeId) {
      return new Response(JSON.stringify({ error: 'storeId là bắt buộc khi không nhập thủ công' }), { status: 400, headers })
    }

    // 1. Detect platform: iOS (số thuần) vs Android (package name)
    const isIos = /^\d+$/.test(storeId)

    let installs = null
    let title    = storeId
    let method   = isIos ? 'appstore' : 'gplay'
    let extra    = {}

    // iOS — ước tính install từ ratings × 100
    if (isIos) {
      const data = await fetchIosData(storeId)
      title = data.title || storeId
      const estimatedInstalls = data.ratings != null ? Math.round(data.ratings * 190) : null
      extra = { ...data, platform: 'ios', estimatedInstalls }
      return new Response(JSON.stringify({ installs: estimatedInstalls, title, method, ...extra }), { status: 200, headers })
    }

    // Android
    try {
      const data = await gplay.app({ appId: storeId, lang: 'en', country: 'us' })
      installs = data.maxInstalls != null ? Math.floor(Number(data.maxInstalls)) : null
      title    = data.title || storeId
      extra = {
        score:          data.score        != null ? Math.round(data.score * 10) / 10 : null,
        scoreText:      data.scoreText    ?? null,
        ratings:        data.ratings      ?? null,
        reviews:        data.reviews      ?? null,
        range:          data.installs     ?? null,   // text "1,000,000+"
        minInstalls:    data.minInstalls  ?? null,
        developer:      data.developer    ?? null,
        developerEmail: data.developerEmail ?? null,
        genre:          data.genre        ?? null,
        contentRating:  data.contentRating ?? null,
        size:           data.size         ?? null,
        version:        data.version      ?? null,
        released:       data.released     ?? null,
        updated:        data.updated      != null ? Number(data.updated) : null,
        free:           data.free         ?? null,
        price:          data.price        != null ? data.price : null,
        offersIAP:      data.offersIAP    ?? null,
        adSupported:    data.adSupported  ?? null,
        editorsChoice:  data.editorsChoice ?? null,
        summary:        data.summary      ?? null,
      }
    } catch {
      method = 'direct'
      const data = await fetchInstallsDirect(storeId)
      installs = data.maxInstalls != null ? Math.floor(Number(data.maxInstalls)) : null
      title    = data.title || storeId
    }

    // 2. Ghi vào Lark
    if (installs !== null && recordId !== 'TEST') {
      await writeToLark(recordId, installs, title)
    }

    return new Response(JSON.stringify({ installs, title, method, ...extra }), { status: 200, headers })
  } catch (err) {
    const msg      = err.message || 'Unknown error'
    const notFound = msg.includes('404') || msg.toLowerCase().includes('not found')
    return new Response(JSON.stringify({ error: msg, notFound }), { status: notFound ? 404 : 500, headers })
  }
}
