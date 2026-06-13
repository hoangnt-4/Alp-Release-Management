import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

// Optional allowlist — comma-separated emails in VITE_ALLOWED_EMAILS
// Leave empty to allow any authenticated Google account
const ALLOWED = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

function isAllowed(email) {
  if (!email) return false
  if (ALLOWED.length === 0) return true
  return ALLOWED.includes(email.toLowerCase())
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(SKIP_AUTH ? { email: 'dev@local', user_metadata: { name: 'Dev' } } : null)
  const [loading, setLoading] = useState(!SKIP_AUTH)
  const [denied,  setDenied]  = useState(false)

  useEffect(() => {
    if (SKIP_AUTH) return

    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      if (u && !isAllowed(u.email)) {
        setDenied(true)
        supabase.auth.signOut()
      } else {
        setUser(u)
      }
      setLoading(false)
    })

    // Listen for auth changes (includes OAuth redirect callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && !isAllowed(u.email)) {
        setDenied(true)
        setUser(null)
        supabase.auth.signOut()
      } else {
        setDenied(false)
        setUser(u)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = () => {
    setDenied(false)
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, denied }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
