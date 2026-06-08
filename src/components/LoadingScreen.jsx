import React from 'react'

export default function LoadingScreen({ message = 'Đang tải...', error }) {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <div className="text-2xl">⚠️</div>
            <p className="text-rose-600 font-medium">{error}</p>
            <button className="btn-secondary text-sm" onClick={() => window.location.reload()}>
              Thử lại
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-surface-800/60">{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
