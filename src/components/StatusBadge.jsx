import React from 'react'

const MAP = {
  Checked:        'badge-checked',
  Updated:        'badge-updated',
  'Pending Review':'badge-pending',
}

export default function StatusBadge({ status }) {
  if (!status) return <span className="badge-none">—</span>
  return <span className={MAP[status] || 'badge-none'}>{status}</span>
}
