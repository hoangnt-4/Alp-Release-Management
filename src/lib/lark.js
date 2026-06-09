const API = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getReleases(params = {}) {
  const q = new URLSearchParams(params).toString()
  return request(`/releases${q ? '?' + q : ''}`)
}

export async function createRelease(data) {
  return request('/releases', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateRelease(recordId, data) {
  return request(`/releases/${recordId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteRelease(recordId) {
  return request(`/releases/${recordId}`, { method: 'DELETE' })
}

export async function getApps() {
  return request('/apps')
}

export async function getTimeline() {
  return request('/timeline')
}

export async function getActivities() {
  return request('/activities')
}

export async function updateActivity(recordId, data) {
  return request(`/activities/${recordId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function downloadCSV(releases) {
  const COLS = ['releaseDate', 'appName', 'platform', 'version', 'rollout', 'releaseNote', 'status', 'reviewer', 'reviewNotes', 'lastCheckedDate']
  const header = ['Ngày', 'App Name', 'Platform', 'Version', 'Roll-out', 'Mô tả', 'Status', 'Reviewer', 'Review Notes', 'Last Checked']
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [header.map(esc).join(','), ...releases.map(r => COLS.map(k => esc(r[k])).join(','))]
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: `releases_${new Date().toISOString().slice(0,10)}.csv` })
  a.click()
  URL.revokeObjectURL(url)
}
