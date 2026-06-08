import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getReleases, getApps } from '../lib/lark'
import { isAfter, subDays, parseISO } from 'date-fns'

const StoreCtx = createContext(null)

const WL_KEY = 'rm_watchlist_v1'
const loadWL = () => { try { return new Set(JSON.parse(localStorage.getItem(WL_KEY) || '[]')) } catch { return new Set() } }
const saveWL = (s) => localStorage.setItem(WL_KEY, JSON.stringify([...s]))

export function ReleasesProvider({ children }) {
  const [releases, setReleases] = useState([])
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [watchlist, setWatchlist] = useState(loadWL)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([getReleases({ pageSize: 500 }), getApps()])
      .then(([r, a]) => {
        const appList = a.records || []
        // Build lookup: alpId → app, hnId → app
        const byAlpId = Object.fromEntries(appList.map(app => [app.alpId?.toLowerCase(), app]))
        const byHnId  = Object.fromEntries(appList.filter(app => app.hnId).map(app => [app.hnId?.toLowerCase(), app]))

        const releases = (r.records || [])
          .filter(x => x.app || x.releaseDate)
          .map(rel => {
            if (rel.platform) return rel
            // Enrich platform from apps list if missing
            const key = (rel.appName || rel.app || '').toLowerCase()
            const hnKey = (rel.hnId || '').toLowerCase()
            const matched = byAlpId[key] || byHnId[hnKey]
            return matched ? { ...rel, platform: matched.platform } : rel
          })

        setReleases(releases)
        setApps(appList)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const toggleWatchlist = useCallback((id) => {
    setWatchlist(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveWL(next)
      return next
    })
  }, [])

  const now = new Date()
  const counts = {
    total:    releases.length,
    thisWeek: releases.filter(r => r.releaseDate && isAfter(parseISO(r.releaseDate), subDays(now, 7))).length,
    pending:  releases.filter(r => !r.status).length,
    checked:  releases.filter(r => r.status === 'Checked' || r.status === 'Updated').length,
    watchlist: watchlist.size,
  }

  return (
    <StoreCtx.Provider value={{ releases, apps, loading, refresh, watchlist, toggleWatchlist, counts }}>
      {children}
    </StoreCtx.Provider>
  )
}

export const useReleasesStore = () => useContext(StoreCtx)
