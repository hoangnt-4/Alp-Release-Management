// Shared logic for Monet feature access control
const MONET_EMAILS = (import.meta.env.VITE_MONET_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

export function canAccessMonet(email) {
  if (SKIP_AUTH) return true   // dev mode: always show
  if (!email) return false
  if (MONET_EMAILS.length === 0) return false
  return MONET_EMAILS.includes(email.toLowerCase())
}
