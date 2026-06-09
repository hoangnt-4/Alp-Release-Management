import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getReleases, getApps, getTimeline, getActivities } from '../lib/lark'
import { diffAndRecord } from '../lib/activityHistory'
import { isAfter, subDays, parseISO } from 'date-fns'

const StoreCtx = createContext(null)

const WL_KEY = 'rm_watchlist_v1'
const loadWL = () => { try { return new Set(JSON.parse(localStorage.getItem(WL_KEY) || '[]')) } catch { return new Set() } }
const saveWL = (s) => localStorage.setItem(WL_KEY, JSON.stringify([...s]))

export function ReleasesProvider({ children }) {
  const [releases, setReleases]     = useState([])
  const [apps, setApps]             = useState([])
  const [appLinkMap, setAppLinkMap] = useState({})
  const [timelines, setTimelines]   = useState({})   // map: hnId/alpId → timeline record
  const [activities, setActivities] = useState({})   // map: hnId/alpId → activity record
  const [loading, setLoading]       = useState(true)
  const [watchlist, setWatchlist]   = useState(loadWL)

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
    Promise.all([
      getReleases({ pageSize: 500 }),
      getApps(),
      getTimeline(),
      getActivities(),
    ])
      .then(([r, a, tl, act]) => {
        const appList = a.records || []
        const byAlpId = Object.fromEntries(appList.map(app => [app.alpId?.toLowerCase(), app]))
        const byHnId  = Object.fromEntries(appList.filter(app => app.hnId).map(app => [app.hnId?.toLowerCase(), app]))

        const releases = (r.records || [])
          .filter(x => x.app || x.releaseDate)
          .map(rel => {
            const key    = (rel.appName || rel.app || '').toLowerCase()
            const hnKey  = (rel.hnId || '').toLowerCase()
            const hinted = appHints.current[rel.id]
            const matched = (key && byAlpId[key]) || (hnKey && byHnId[hnKey]) || (hnKey && byAlpId[hnKey]) || hinted
            if (!matched) return rel
            return {
              ...rel,
              platform: rel.platform || matched.platform,
              appName:  rel.appName  || matched.alpId || matched.hnId,
              hnId:     rel.hnId     || matched.hnId  || '',
              _appId:   matched.id,
            }
          })

        const appLinkMap = {}
        for (const rel of releases) {
          if (rel.appLinkId && (rel.appName || rel.app)) {
            appLinkMap[(rel.appName || rel.app).toLowerCase()] = rel.appLinkId
          }
        }

        // Build timelines map
        const tlMap = {}
        for (const rec of tl.records || []) {
          if (rec.hnId)  tlMap[rec.hnId.toLowerCase()]  = rec
          if (rec.alpId) tlMap[rec.alpId.toLowerCase()] = rec
        }

        // Build activities map + run diff
        const actRecords = act.records || []
        diffAndRecord(actRecords)
        const actMap = {}
        for (const rec of actRecords) {
          if (rec.hnId)  actMap[rec.hnId.toLowerCase()]  = rec
          if (rec.alpId) actMap[rec.alpId.toLowerCase()] = rec
        }

        setAppLinkMap(appLinkMap)
        setReleases(releases)
        setApps(appList)
        setTimelines(tlMap)
        setActivities(actMap)
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
    <StoreCtx.Provider value={{
      releases, apps, appLinkMap, timelines, activities,
      loading, refresh, addReleaseHint, addOptimisticRelease,
      watchlist, toggleWatchlist, counts,
    }}>
      {children}
    </StoreCtx.Provider>
  )
}

export const useReleasesStore = () => useContext(StoreCtx)
