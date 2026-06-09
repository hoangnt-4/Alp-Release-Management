import React from 'react'
import { useAuth } from '../hooks/useAuth'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.6-3.3-11.3-8H6.3C9.5 36.6 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.6 6.1l6.2 5.2C40.6 35.7 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
  </svg>
)

export default function Login() {
  const { login, denied } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-sm text-center space-y-6">
        {/* Logo */}
        <div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
            style={{ background: '#0d9488' }}>R</div>
          <h1 className="text-xl font-semibold" style={{ color: '#1e2235' }}>Release Manager</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Alphalogy App Tracking</p>
        </div>

        {/* Denied notice */}
        {denied && (
          <div className="rounded-xl px-4 py-3 text-sm text-left" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
            <p className="font-medium">Tài khoản không được phép truy cập.</p>
            <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>Liên hệ admin để được cấp quyền.</p>
          </div>
        )}

        {/* Login button */}
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors"
          style={{ border: '1px solid #e2e8f0', color: '#374151' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          <GoogleIcon />
          {denied ? 'Thử tài khoản khác' : 'Đăng nhập với Google'}
        </button>

        <p className="text-xs" style={{ color: '#cbd5e1' }}>Chỉ dành cho team Alphalogy</p>
      </div>
    </div>
  )
}
