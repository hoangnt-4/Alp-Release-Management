import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getReleases, getApps } from '../lib/lark'
import { isAfter, subDays, parseISO } from 'date-fns'

const StoreCtx = createContext(null)

const WL_KEY = 'rm_watchlist_v1'
const loadWL = () => { try { return new Set(JSON.parse(localStorage.getItem(WL_KEY) || '[]')) } catch { return new Set() } }
const saveWL = (s) => localStorage.setItem(WL_KEY, JSON.stringify([...s]))

export function ReleasesProvider({ children }) {
  const [releases, setReleases]     = useState([])
  const [apps, setApps]             = useState([])
  const [appLinkMap, setAppLinkMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [watchlist, setWatchlist] = useState(loadWL)
  // Local hints: { releaseRecordId → app } for newly created records whose App field is formula-only
  // Persisted in localStorage so hints survive page reload
  const HINTS_KEY = 'rm_release_app_hints_v1'
  const loadHints = () => { try { return JSON.parse(localStorage.getItem(HINTS_KEY) || '{}') } catch { return {} } }
  const appHints = useRef(loadHints())

  const addReleaseHint = useCallback((releaseId, app) => {
    if (!releaseId || !app) return
    appHints.current[releaseId] = { id: app.id, alpId: app.alpId, hnId: app.hnId, platform: app.platform }
    try { localStorage.setItem(HINTS_KEY, JSON.stringify(appHints.current)) } catch {}
  }, [])

  const addOptimisticRelease = useCallback((release) => {
    setReleases(prev => [release, ...prev.filter(r => r.id !== release.id)])
  }, [])

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
            const key   = (rel.appName || rel.app || '').toLowerCase()
            const hnKey = (rel.hnId || '').toLowerCase()
            const hinted = appHints.current[rel.id]
            const matched = (key && byAlpId[key]) || (hnKey && byHnId[hnKey]) || (hnKey && byAlpId[hnKey]) || hinted
            if (!matched) return rel
            return {
              ...rel,
              platform: rel.platform || matched.platform,
              appName:  rel.appName || matched.alpId || matched.hnId,
              hnId:     rel.hnId    || matched.hnId  || '',
              _appId:   matched.id,
            }
          })

        // Build lookup: alpId (lowercased) → appLinkId (the linked record_id used in App field)
        // This lets us write the correct record_id to App link field when creating new releases
        const appLinkMap = {}
        for (const rel of releases) {
          if (rel.appLinkId && (rel.appName || rel.app)) {
            const key = (rel.appName || rel.app).toLowerCase()
            appLinkMap[key] = rel.appLinkId
          }
        }
        setAppLinkMap(appLinkMap)
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
    <StoreCtx.Provider value={{ releases, apps, appLinkMap, loading, refresh, addReleaseHint, addOptimisticRelease, watchlist, toggleWatchlist, counts }}>
      {children}
    </StoreCtx.Provider>
  )
}

export const useReleasesStore = () => useContext(StoreCtx)
