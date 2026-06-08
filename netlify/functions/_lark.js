let cachedToken = null
let tokenExpiry  = 0

export async function getTenantToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id:     process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }),
  })
  const data = await res.json()
  if (data.code !== 0) throw new Error(`Lark auth error: ${data.msg}`)

  cachedToken = data.tenant_access_token
  tokenExpiry  = Date.now() + (data.expire - 60) * 1000
  return cachedToken
}

export function larkHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  }
}

export const BASE_URL       = 'https://open.larksuite.com/open-apis/bitable/v1'
export const BASE_ID        = process.env.LARK_BASE_ID
export const TBL_RELEASES   = process.env.LARK_TABLE_RELEASES
export const TBL_APPS       = process.env.LARK_TABLE_APPS

export function mapRelease(record) {
  const f = record.fields
  return {
    id:              record.record_id,
    releaseDate:     f['Release Date'] ? new Date(f['Release Date']).toISOString().slice(0, 10) : '',
    app:             Array.isArray(f['App']) ? f['App'][0]?.text || '' : (f['App'] || ''),
    appName:         Array.isArray(f['App']) ? f['App'][0]?.text || '' : (f['App'] || ''),
    hnId:            Array.isArray(f['HN ID']) ? f['HN ID'][0]?.text || '' : (f['HN ID'] || ''),
    platform:        Array.isArray(f['Platform']) ? f['Platform'][0]?.text || '' : (f['Platform'] || ''),
    version:         f['Version'] || '',
    rollout:         f['Roll-out'] || '--',
    releaseNote:     f['Release Note'] || '',
    status:          f['Status'] || '',
    reviewer:        Array.isArray(f['Reviewer']) ? f['Reviewer'][0]?.name || '' : (f['Reviewer'] || ''),
    lastCheckedDate: f['Last Checked Date'] ? new Date(f['Last Checked Date']).toISOString().slice(0, 10) : '',
    reviewNotes:     f['Review Notes'] || '',
  }
}

function larkText(v) {
  if (!v) return ''
  if (Array.isArray(v)) {
    const first = v[0]
    if (!first) return ''
    return typeof first === 'object' ? (first.text || first.en_us || '') : String(first)
  }
  if (typeof v === 'object') return v.text || v.en_us || ''
  return String(v)
}
function larkUrl(v) {
  if (!v) return ''
  if (Array.isArray(v)) return v[0]?.link || ''
  if (typeof v === 'object') return v.link || ''
  return ''
}

export function mapApp(record) {
  const f = record.fields
  return {
    id:         record.record_id,
    alpId:      larkText(f['Alp ID']),
    hnId:       larkText(f['HN ID']),
    platform:   larkText(f['Platform']),
    appLink:    larkText(f['App Link']),
    appLinkUrl: larkUrl(f['App Link']),
  }
}

export function buildReleaseFields(data) {
  const fields = {}
  if (data.releaseDate)          fields['Release Date']      = new Date(data.releaseDate).getTime()
  if (data.app)                  fields['App']               = [data.app]
  if (data.version)              fields['Version']           = data.version
  if (data.rollout)              fields['Roll-out']          = data.rollout
  if (data.releaseNote)          fields['Release Note']      = data.releaseNote
  if (data.status !== undefined) fields['Status']            = data.status
  // NOTE: Reviewer is a Lark person field — requires user IDs, skip on write to avoid API error
  if (data.lastCheckedDate)      fields['Last Checked Date'] = new Date(data.lastCheckedDate).getTime()
  if (data.reviewNotes)          fields['Review Notes']      = data.reviewNotes
  return fields
}
