import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import dayjs from 'dayjs'
import { RankingItem } from '../components/RankingCard'
import { useAuth } from '../provider/AuthProvider'

interface ApiSeriesPoint {
  timestamp: string
  success: number
  pending: number
  failed: number
  total: number
}

interface ApiSeries {
  merchant_name: string
  payment_method: string
  data: ApiSeriesPoint[]
}

export interface TrafficTotals {
  total: number
  success: number
  pending: number
  failed: number
}

export interface MethodStat {
  name: string
  total: number
  merchants: string[]
}

export interface MerchantStat {
  name: string
  total: number
  success: number
  failed: number
}

export interface TrafficBucket {
  start: string
  total: number
  failed: number
}

export const WINDOW_HOURS = 8
export const BUCKET_MINUTES = 10
const BUCKET_COUNT = (WINDOW_HOURS * 60) / BUCKET_MINUTES

const EMPTY_TOTALS: TrafficTotals = { total: 0, success: 0, pending: 0, failed: 0 }

function topN(map: Map<string, number>, n = 5): RankingItem[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

export default function useDashboardData() {
  const { token, apiUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [merchants, setMerchants] = useState<RankingItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<RankingItem[]>([])
  const [successLeaders, setSuccessLeaders] = useState<RankingItem[]>([])
  const [failedLeaders, setFailedLeaders] = useState<RankingItem[]>([])
  const [totals, setTotals] = useState<TrafficTotals>(EMPTY_TOTALS)
  const [methods, setMethods] = useState<MethodStat[]>([])
  const [merchantStats, setMerchantStats] = useState<MerchantStat[]>([])
  const [buckets, setBuckets] = useState<TrafficBucket[]>([])

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  useEffect(() => {
    if (!token || !apiUrl) return

    const load = async () => {
      try {
        setLoading(true)
        const now = dayjs()
        // Align slots to clock boundaries; the last slot contains "now".
        const currentSlot = now.startOf('minute').subtract(now.minute() % BUCKET_MINUTES, 'minute')
        const windowStart = currentSlot.subtract(WINDOW_HOURS, 'hour').add(BUCKET_MINUTES, 'minute')
        const end = now.format('YYYY-MM-DDTHH:mm:ssZ')
        const start = windowStart.format('YYYY-MM-DDTHH:mm:ssZ')

        const [merchantsRes, trafficRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/admin/merchants`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiUrl}/traffic/monitoring`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params: { start, end },
          }),
        ])

        if (merchantsRes.status === 'fulfilled') {
          const list = merchantsRes.value.data?.data || []
          const ranked = [...list]
            .map((m: any) => ({
              label: m.client_name || m.merchant_name || m.name || m.uid || 'Merchant',
              value: Array.isArray(m.applications)
                ? m.applications.length
                : typeof m.status === 'number'
                  ? m.status
                  : 1,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
          setMerchants(ranked)
        }

        if (trafficRes.status === 'fulfilled') {
          const apiData: ApiSeries[] = trafficRes.value.data?.data || []
          const byMerchant = new Map<string, number>()
          const byMethod = new Map<string, number>()
          const bySuccess = new Map<string, number>()
          const byFailed = new Map<string, number>()
          const methodMerchants = new Map<string, Set<string>>()
          const sum: TrafficTotals = { ...EMPTY_TOTALS }
          const slots: TrafficBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
            start: windowStart.add(i * BUCKET_MINUTES, 'minute').toISOString(),
            total: 0,
            failed: 0,
          }))

          apiData.forEach((series) => {
            let total = 0
            let success = 0
            let failed = 0
            series.data.forEach((p) => {
              const pointTotal = p.total ?? p.success + p.pending + p.failed
              total += pointTotal
              success += p.success
              failed += p.failed
              sum.pending += p.pending
              const slot = Math.floor(dayjs(p.timestamp).diff(windowStart, 'minute') / BUCKET_MINUTES)
              const bucket = slots[Math.min(Math.max(slot, 0), BUCKET_COUNT - 1)]
              bucket.total += pointTotal
              bucket.failed += p.failed
            })
            sum.total += total
            sum.success += success
            sum.failed += failed
            byMerchant.set(series.merchant_name, (byMerchant.get(series.merchant_name) || 0) + total)
            byMethod.set(series.payment_method, (byMethod.get(series.payment_method) || 0) + total)
            bySuccess.set(series.merchant_name, (bySuccess.get(series.merchant_name) || 0) + success)
            byFailed.set(series.merchant_name, (byFailed.get(series.merchant_name) || 0) + failed)
            if (!methodMerchants.has(series.payment_method)) methodMerchants.set(series.payment_method, new Set())
            if (total > 0) methodMerchants.get(series.payment_method)!.add(series.merchant_name)
          })

          const trafficMerchants = topN(byMerchant)
          if (trafficMerchants.length) setMerchants(trafficMerchants)
          setPaymentMethods(topN(byMethod))
          setSuccessLeaders(topN(bySuccess))
          setFailedLeaders(topN(byFailed))
          setTotals(sum)
          setBuckets(slots)
          setMethods(
            topN(byMethod).map(({ label, value }) => ({
              name: label,
              total: value,
              merchants: Array.from(methodMerchants.get(label) ?? []),
            })),
          )
          setMerchantStats(
            Array.from(byMerchant.entries()).map(([name, total]) => ({
              name,
              total,
              success: bySuccess.get(name) || 0,
              failed: byFailed.get(name) || 0,
            })),
          )
        }
        setUpdatedAt(dayjs().format('HH:mm'))
      } catch (e) {
        console.error('Dashboard ranking fetch error:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [apiUrl, token, refreshKey])

  return {
    loading,
    refresh,
    updatedAt,
    merchants,
    paymentMethods,
    successLeaders,
    failedLeaders,
    totals,
    methods,
    merchantStats,
    buckets,
  }
}
