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

export const BASE_URL        = 'https://open.larksuite.com/open-apis/bitable/v1'
export const BASE_ID         = process.env.LARK_BASE_ID
export const TBL_RELEASES    = process.env.LARK_TABLE_RELEASES
export const TBL_APPS        = process.env.LARK_TABLE_APPS
export const TBL_TIMELINE    = process.env.LARK_TABLE_TIMELINE
export const TBL_ACTIVITIES  = process.env.LARK_TABLE_ACTIVITIES
export const TBL_MONET       = process.env.LARK_TABLE_MONET

export function mapRelease(record) {
  const f = record.fields
  return {
    id:              record.record_id,
    releaseDate:     f['Release Date'] ? new Date(f['Release Date'] + 7*3600000).toISOString().slice(0, 10) : '',
    app:             Array.isArray(f['App']) ? f['App'][0]?.text || '' : (f['App'] || ''),
    appName:         Array.isArray(f['App']) ? f['App'][0]?.text || '' : (f['App'] || ''),
    appLinkId:       Array.isArray(f['App']) ? f['App'][0]?.record_ids?.[0] || '' : '',
    hnId:            Array.isArray(f['HN ID']) ? f['HN ID'][0]?.text || '' : (f['HN ID'] || ''),
    platform:        Array.isArray(f['Platform']) ? f['Platform'][0]?.text || '' : (f['Platform'] || ''),
    version:         f['Version'] || '',
    rollout:         larkText(f['Roll-out']) || '--',
    releaseNote:     f['Release Note'] || '',
    status:          f['Status'] || '',
    reviewer:        larkText(f['Reviewer']),
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
    id:                 record.record_id,
    alpId:              larkText(f['Alp ID']),
    hnId:               larkText(f['HN ID']),
    platform:           larkText(f['Platform']),
    appLink:            larkText(f['App Link']),
    appLinkUrl:         larkUrl(f['App Link']),
    status:             larkText(f['Status']),
    priority:           larkText(f['Priority']),
    androidStatus:      larkText(f['Android Status']),
    figma:              larkText(f['Figma']),
    figmaUrl:           larkUrl(f['Figma']),
    hnBug:              larkText(f['HN Bug']),
    hnBugUrl:           larkUrl(f['HN Bug']),
    adsScript:          larkText(f['Ads Script']),
    adsScriptUrl:       larkUrl(f['Ads Script']),
    iapScript:          larkText(f['iAP Script']),
    iapScriptUrl:       larkUrl(f['iAP Script']),
    metadata:           larkText(f['Metadata']),
    metadataUrl:        larkUrl(f['Metadata']),
    taskBugList:        larkText(f['Task/Bug List']),
    taskBugListUrl:     larkUrl(f['Task/Bug List']),
    localNotiScript:    larkText(f['Local Noti Script']),
    localNotiScriptUrl: larkUrl(f['Local Noti Script']),
  }
}

function larkDate(v) {
  if (!v) return ''
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10)
  return String(v).slice(0, 10)
}

export function mapTimeline(record) {
  const f = record.fields
  return {
    id:          record.record_id,
    alpId:       larkText(f['Alp ID']),
    hnId:        larkText(f['HN ID']),
    figmaStart:  larkDate(f['Figma Start']),
    figmaEnd:    larkDate(f['Figma End']),
    devStart:    larkDate(f['Dev Start']),
    testStart:   larkDate(f['Test start']),
    liveFullAds: larkDate(f['Live full ads']),
    liveIap:     larkDate(f['Live iAP']),
  }
}

export function mapActivity(record) {
  const f = record.fields
  return {
    id:             record.record_id,
    alpId:          larkText(f['Alp ID']),
    hnId:           larkText(f['HN ID']),
    show:           larkText(f['Show']),
    config:         larkText(f['Config']),
    localNoti:      larkText(f['Local Noti']),
    iap:            f['iAP'] === true || f['iAP'] === 1,
    fixCrashes:     f['Fix crashes'] === true || f['Fix crashes'] === 1,
    requestUpdate:  f['Request Update'] === true || f['Request Update'] === 1,
    linkRequest:    larkText(f['Link Request']),
    linkRequest2:   larkText(f['Link Request 2']),
    linkRequest3:   larkText(f['Link Request 3']),
    linkRequest4:   larkText(f['Link Request 4']),
    lastedRequest:  larkDate(f['Request Date']),
  }
}

export function buildActivityFields(data) {
  const fields = {}
  if (data.show           !== undefined) fields['Show']            = data.show
  if (data.config         !== undefined) fields['Config']          = data.config
  if (data.localNoti      !== undefined) fields['Local Noti']      = data.localNoti
  if (data.iap            !== undefined) fields['iAP']             = !!data.iap
  if (data.fixCrashes     !== undefined) fields['Fix crashes']     = !!data.fixCrashes
  if (data.requestUpdate  !== undefined) fields['Request Update']  = data.requestUpdate
  if (data.lastedRequest  !== undefined) fields['Request Date']    = data.lastedRequest ? new Date(data.lastedRequest).getTime() : null
  if (data.linkRequest    !== undefined) fields['Link Request']    = data.linkRequest   || null
  if (data.linkRequest2   !== undefined) fields['Link Request 2']  = data.linkRequest2  || null
  if (data.linkRequest3   !== undefined) fields['Link Request 3']  = data.linkRequest3  || null
  if (data.linkRequest4   !== undefined) fields['Link Request 4']  = data.linkRequest4  || null
  return fields
}

export function buildReleaseFields(data) {
  const fields = {}
  if (data.releaseDate)          fields['Release Date']      = new Date(data.releaseDate).getTime()
  const appRecordId = data.appLinkId || data.app
  if (appRecordId)               fields['App']               = [appRecordId]
  const hnIdText = data.hnId || data.alpId
  if (hnIdText)                  fields['HN ID']             = hnIdText
  if (data.version)              fields['Version']           = data.version
  if (data.rollout)              fields['Roll-out']          = data.rollout
  if (data.releaseNote)          fields['Release Note']      = data.releaseNote
  if (data.status !== undefined) fields['Status']            = data.status
  if (data.reviewer)             fields['Reviewer']          = data.reviewer
  if (data.lastCheckedDate)      fields['Last Checked Date'] = new Date(data.lastCheckedDate).getTime()
  if (data.reviewNotes)          fields['Review Notes']      = data.reviewNotes
  return fields
}

// Monet: dynamically extract all YYYYMM Install / YYYYMM CR columns
export function mapMonet(record) {
  const f = record.fields
  const months = {}
  const re = /^(\d{6})\s+(Install|CR)$/i
  for (const [key, val] of Object.entries(f)) {
    const m = key.match(re)
    if (!m) continue
    const ym = m[1]  // e.g. "202604"
    const type = m[2].toLowerCase()  // "install" or "cr"
    if (!months[ym]) months[ym] = {}
    months[ym][type] = typeof val === 'number' ? val : parseFloat(val) || null
  }
  return {
    id:       record.record_id,
    alpId:    larkText(f['Alp ID']),
    hnId:     larkText(f['HN ID']),
    priority: larkText(f['Priority']),
    months,
  }
}
