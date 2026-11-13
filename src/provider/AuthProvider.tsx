import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { jwtDecode } from 'jwt-decode'

// A build can point both environments at its own API (staging uses a local mock), e.g. VITE_API_URL=http://host:8081/api.
const API_OVERRIDE = import.meta.env.VITE_API_URL as string | undefined
const API_DEV = API_OVERRIDE || 'https://sandbox-payment.redision.com/api'
const API_PROD = API_OVERRIDE || 'https://new-payment.redision.com/api'

interface AuthContextType {
  token: string | null
  setToken: (newToken: string | null) => void
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

/**
 * The session is over (token expired or rejected): drop the token and go to the login page with a full
 * page load, which also stops every polling timer, so an open tab doesn't keep hitting the API with a dead token.
 */
let sessionEnding = false
function endSession() {
  if (sessionEnding) return
  sessionEnding = true
  localStorage.removeItem('token')
  delete axios.defaults.headers.common['Authorization']
  if (window.location.pathname !== '/login') window.location.replace('/login')
  else sessionEnding = false
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken_] = useState<string | null>(localStorage.getItem('token'))
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

  const setToken = (newToken: string | null) => {
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
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    }
  }

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token
      localStorage.setItem('token', token)

      const decoded: any = jwtDecode(token)
      const isExpired = decoded.exp * 1000 < Date.now()

      if (isExpired || !decoded) {
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
      localStorage.removeItem('token')
    }
  }, [token, isDev])

  // Log out the moment the token expires, instead of only checking it when the app is opened.
  useEffect(() => {
    if (!token) return
    let exp = 0
    try {
      exp = Number((jwtDecode(token) as { exp?: number }).exp) * 1000
    } catch {
      return
    }
    if (!Number.isFinite(exp) || exp <= 0) return
    let timer: number
    const schedule = () => {
      const left = exp - Date.now()
      if (left <= 0) {
        setToken(null)
        endSession()
        return
      }
      timer = window.setTimeout(schedule, Math.min(left, MAX_TIMER_MS))
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [token])

  // Any 401 from the API means the token is no longer accepted: stop and send the user to log in again
  // rather than letting the polling pages retry with the same token every minute.
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, (error) => {
      const url: string = error?.config?.url || ''
      if (error?.response?.status === 401 && !url.includes('/user/login')) {
        setToken_(null)
        endSession()
      }
      return Promise.reject(error)
    })
    return () => axios.interceptors.response.eject(id)
  }, [])

  const contextValue = useMemo(
    () => ({
      token,
      setToken,
      role,
      appKey,
      appId,
      apiUrl,
      isDev,
      toggleApi,
      setIsDev,
    }),
    [token, role, isDev],
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
