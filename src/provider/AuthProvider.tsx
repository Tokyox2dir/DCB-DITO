import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'

// A build can point both environments at its own API (staging uses a local mock), e.g. VITE_API_URL=http://host:8081/api.
const API_OVERRIDE = import.meta.env.VITE_API_URL as string | undefined
const API_DEV = API_OVERRIDE || 'https://sandbox-payment.redision.com/api'
const API_PROD = API_OVERRIDE || 'https://new-payment.redision.com/api'

interface AuthContextType {
  token: string | null
  setToken: (newToken: string | null, refreshToken?: string | null) => void
  logout: () => void
  role: string | null
  appKey: string | null
  appId: string | null
  apiUrl: string
  isDev: boolean
  toggleApi: () => void
  setIsDev: (value: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// setTimeout fires immediately for delays above 2^31-1 ms, so long-lived tokens are re-checked in steps.
const MAX_TIMER_MS = 2_147_000_000

const TOKEN_KEY = 'token'
const REFRESH_KEY = 'refresh_token'
// Refresh this long before the access token expires (backend suggestion), so polling never sees a 401.
const REFRESH_LEAD_MS = 5 * 60_000
// A refresh that failed for a network/server reason is retried after this long.
const REFRESH_RETRY_MS = 30_000
const REFRESH_LOCK = 'dcb-token-refresh'

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  delete axios.defaults.headers.common['Authorization']
}

/**
 * The session is over (token expired or rejected): drop the tokens and go to the login page with a full
 * page load, which also stops every polling timer, so an open tab doesn't keep hitting the API with a dead token.
 */
let sessionEnding = false
function endSession() {
  if (sessionEnding) return
  sessionEnding = true
  clearStoredSession()
  if (window.location.pathname !== '/login') window.location.replace('/login')
  else sessionEnding = false
}

function tokenExpiryMs(token: string | null): number {
  if (!token) return 0
  try {
    const exp = Number((jwtDecode(token) as { exp?: number }).exp) * 1000
    return Number.isFinite(exp) ? exp : 0
  } catch {
    return 0
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 'dead': the refresh token was rejected, log in again. 'transient': network/server trouble, try later. */
type RefreshResult = { token: string } | 'dead' | 'transient'

/** Another tab (or an earlier call) already replaced the token we were about to refresh. */
function newerStoredToken(staleToken: string | null): string | null {
  const stored = localStorage.getItem(TOKEN_KEY)
  return stored && stored !== staleToken && tokenExpiryMs(stored) > Date.now() ? stored : null
}

async function doRefresh(apiUrl: string, staleToken: string | null): Promise<RefreshResult> {
  const already = newerStoredToken(staleToken)
  if (already) return { token: already }
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return 'dead'

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response
    try {
      // Plain fetch, so the refresh token goes out without the global Authorization header.
      res = await fetch(`${apiUrl}/user/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      return 'transient'
    }
    if (res.ok) {
      const body = await res.json().catch(() => null)
      if (!body?.token || !body?.refresh_token) return 'transient'
      // Rotation: the old refresh token is dead from now on, so store the new pair at once.
      localStorage.setItem(REFRESH_KEY, body.refresh_token)
      localStorage.setItem(TOKEN_KEY, body.token)
      return { token: body.token }
    }
    if (res.status === 400 || res.status === 401) return 'dead'
    if (res.status === 409) {
      // Another tab refreshed this same token moments ago: use what it stored, never log out for this.
      await wait(1000)
      const stored = newerStoredToken(staleToken)
      if (stored) return { token: stored }
      continue
    }
    return 'transient'
  }
  return 'transient'
}

let refreshInFlight: Promise<RefreshResult> | null = null
/** Single-flight refresh: one at a time in this tab, and one at a time across tabs when the browser supports locks. */
function refreshSession(apiUrl: string, staleToken: string | null): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight
  const run = () => doRefresh(apiUrl, staleToken)
  const locks = (navigator as Navigator & { locks?: LockManager }).locks
  refreshInFlight = (locks ? (locks.request(REFRESH_LOCK, run) as Promise<RefreshResult>) : run()).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken_] = useState<string | null>(localStorage.getItem(TOKEN_KEY))
  const [role, setRole] = useState<string | null>(null)
  const [appKey, setAppKey] = useState<string | null>(null)
  const [appId, setAppId] = useState<string | null>(null)

  // State untuk API environment
  const [isDev, setIsDev] = useState(localStorage.getItem('api_env') !== 'prod')
  const apiUrl = isDev ? API_DEV : API_PROD

  const toggleApi = () => {
    setIsDev((prev) => {
      const newIsDev = !prev
      localStorage.setItem('api_env', newIsDev ? 'dev' : 'prod')

      // Reload halaman agar perubahan environment langsung diterapkan
      window.location.reload()
      return newIsDev
    })
  }

  const setToken = (newToken: string | null, refreshToken?: string | null) => {
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    else if (refreshToken === null || !newToken) localStorage.removeItem(REFRESH_KEY)
    setToken_(newToken)
    if (newToken) {
      const decoded: any = jwtDecode(newToken)
      setRole(decoded.role)

      if (isDev) {
        setAppId(decoded.devappid)
        setAppKey(decoded.devappkey)
      } else {
        setAppId(decoded.appid)
        setAppKey(decoded.appkey)
      }

      localStorage.setItem('token', newToken)
    } else {
      setRole(null)
      setAppId(null)
      setAppKey(null)
      clearStoredSession()
    }
  }

  // Revoke the session on the server too (the access token itself stays valid until exp, so it is dropped here).
  const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (refreshToken) {
      fetch(`${apiUrl}/user/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        keepalive: true,
      }).catch(() => {})
    }
    setToken(null)
  }

  const apiUrlRef = useRef(apiUrl)
  apiUrlRef.current = apiUrl

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
      localStorage.setItem(TOKEN_KEY, token)

      const decoded: any = jwtDecode(token)
      const isExpired = decoded.exp * 1000 < Date.now()

      // An expired access token is fine while a refresh token can renew it (the timer below does that at once).
      if (!decoded || (isExpired && !localStorage.getItem(REFRESH_KEY))) {
        setToken(null)
        endSession()
      } else {
        setRole(decoded.role)

        if (isDev) {
          setAppId(decoded.devappid)
          setAppKey(decoded.devappkey)
        } else {
          setAppId(decoded.appid)
          setAppKey(decoded.appkey)
        }
      }
    } else {
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token, isDev])

  // Renew the token shortly before it expires; without a refresh token, log out the moment it expires.
  useEffect(() => {
    if (!token) return
    const exp = tokenExpiryMs(token)
    if (exp <= 0) return
    let timer: number
    let cancelled = false
    const renew = async () => {
      const result = await refreshSession(apiUrlRef.current, token)
      if (cancelled) return
      if (result === 'dead') {
        setToken_(null)
        endSession()
      } else if (result === 'transient') {
        timer = window.setTimeout(renew, REFRESH_RETRY_MS)
      } else if (result.token !== token) {
        setToken_(result.token)
      }
    }
    const schedule = () => {
      const hasRefresh = !!localStorage.getItem(REFRESH_KEY)
      const left = exp - Date.now() - (hasRefresh ? REFRESH_LEAD_MS : 0)
      if (left <= 0) {
        if (hasRefresh) renew()
        else {
          setToken(null)
          endSession()
        }
        return
      }
      timer = window.setTimeout(schedule, Math.min(left, MAX_TIMER_MS))
    }
    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [token])

  // Use the token another tab just refreshed (backend doc, 409: take the latest token stored by another tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_KEY || !e.newValue) return
      setToken_(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // A 401 means the access token is no longer accepted: renew it once and repeat the request. If the refresh
  // token is rejected too, stop and send the user to log in again rather than retrying every minute.
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, async (error) => {
      const config = error?.config
      const url: string = config?.url || ''
      if (error?.response?.status !== 401 || /\/user\/(login|refresh|logout)/.test(url)) return Promise.reject(error)
      if (!localStorage.getItem(REFRESH_KEY) || !config || config._authRetried) {
        setToken_(null)
        endSession()
        return Promise.reject(error)
      }
      const sent = String(config.headers?.Authorization || config.headers?.authorization || '')
      const staleToken = sent.replace(/^Bearer\s+/i, '') || localStorage.getItem(TOKEN_KEY)
      const result = await refreshSession(apiUrlRef.current, staleToken)
      if (result === 'dead') {
        setToken_(null)
        endSession()
        return Promise.reject(error)
      }
      // Network/server trouble while refreshing: keep the session, the next poll tries again.
      if (result === 'transient') return Promise.reject(error)
      setToken_(result.token)
      config._authRetried = true
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${result.token}`
      return axios(config)
    })
    return () => axios.interceptors.response.eject(id)
  }, [])

  const contextValue = useMemo(
    () => ({
      token,
      setToken,
      logout,
      role,
      appKey,
      appId,
      apiUrl,
      isDev,
      toggleApi,
      setIsDev,
    }),
    [token, role, isDev, apiUrl],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthProvider
