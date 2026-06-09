import { createContext, useContext, useEffect, useState } from 'react'
import netlifyIdentity from 'netlify-identity-widget'

const AuthContext = createContext(null)

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

// Allowed emails: comma-separated in VITE_ALLOWED_EMAILS
// e.g. "hoangnt@alphalogy.net,user2@alphalogy.net"
// If empty → allow all (rely on Netlify Identity invite-only setting)
const ALLOWED = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

function isAllowed(email) {
  if (!email) return false
  if (ALLOWED.length === 0) return true
  return ALLOWED.includes(email.toLowerCase())
}

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(SKIP_AUTH ? { email: 'dev@local', name: 'Dev' } : null)
  const [loading, setLoading]   = useState(!SKIP_AUTH)
  const [denied, setDenied]     = useState(false)

  useEffect(() => {
    if (SKIP_AUTH) return

    netlifyIdentity.init({
      logo: false,
      APIUrl: 'https://alp-release.netlify.app/.netlify/identity',
    })

    const currentUser = netlifyIdentity.currentUser()
    if (currentUser) {
      if (isAllowed(currentUser.email)) {
        setUser(currentUser)
      } else {
        setDenied(true)
        netlifyIdentity.logout()
      }
    }
    setLoading(false)

    netlifyIdentity.on('login', u => {
      netlifyIdentity.close()
      if (isAllowed(u.email)) {
        setDenied(false)
        setUser(u)
      } else {
        setDenied(true)
        setUser(null)
        netlifyIdentity.logout()
      }
    })
    netlifyIdentity.on('logout', () => { setUser(null) })

    return () => {
      netlifyIdentity.off('login')
      netlifyIdentity.off('logout')
    }
  }, [])

  const login  = () => { setDenied(false); netlifyIdentity.open('login') }
  const logout = () => netlifyIdentity.logout()

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, denied }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
