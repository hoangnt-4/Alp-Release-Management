const KEY_HISTORY  = 'rm_activity_history_v1'
const KEY_SNAPSHOT = 'rm_activity_snapshot_v1'

export const TRACKED_FIELDS = {
  show:          'Show Intro',
  config:        'Config Show',
  localNoti:     'Local Noti',
  iap:           'iAP',
  requestUpdate: 'Request Update',
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]') } catch { return [] }
}

function saveHistory(arr) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(arr.slice(-1000)))
}

export function addEvent({ appId, appName, field, fieldLabel: fieldLabelOverride, oldValue, newValue }) {
  const fieldLabel = fieldLabelOverride || TRACKED_FIELDS[field] || field
  const history = getHistory()
  history.push({
    id:         `${Date.now()}_${Math.random()}`,
    ts:         new Date().toISOString(),
    appId,
    appName,
    field,
    fieldLabel,
    oldValue:   oldValue === null || oldValue === undefined ? '' : String(oldValue),
    newValue:   newValue === null || newValue === undefined ? '' : String(newValue),
    source:     'app',
  })
  saveHistory(history)
}

export function diffAndRecord(records) {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY_SNAPSHOT) || '{}')
    const next = {}

    for (const r of records) {
      const key = (r.alpId || r.hnId || '').toLowerCase()
      if (!key) continue
      next[key] = r
    }

    const history = getHistory()
    const now = new Date().toISOString()
    let changed = false

    for (const [key, curr] of Object.entries(next)) {
      const old = prev[key]
      if (!old) continue // first time seeing this app — no baseline to diff

      for (const [field, fieldLabel] of Object.entries(TRACKED_FIELDS)) {
        const oldRaw = old[field]
        const newRaw = curr[field]
        const oldStr = oldRaw === null || oldRaw === undefined ? '' : String(oldRaw)
        const newStr = newRaw === null || newRaw === undefined ? '' : String(newRaw)
        if (oldStr === newStr) continue

        history.push({
          id:         `${now}_${key}_${field}`,
          ts:         now,
          appId:      curr.alpId || curr.hnId || key,
          appName:    curr.alpId || curr.hnId || key,
          field,
          fieldLabel,
          oldValue:   oldStr,
          newValue:   newStr,
          source:     'lark', // changed outside the app (detected via snapshot)
        })
        changed = true
      }
    }

    if (changed) saveHistory(history)
    localStorage.setItem(KEY_SNAPSHOT, JSON.stringify(next))
  } catch (e) {
    console.warn('activityHistory diffAndRecord:', e)
  }
}

export function clearHistory() {
  localStorage.removeItem(KEY_HISTORY)
}
