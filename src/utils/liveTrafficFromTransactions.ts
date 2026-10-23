import axios from 'axios'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { MetricStatus } from '../components/VolumePerHourChart'
import type { TrafficPoint, TrafficSeries } from '../components/VolumePerHourChart'

export type LiveTrxRow = {
  u_id?: string
  merchant_name?: string
  payment_method?: string
  created_at?: string
  status_code?: number
}

export type ActivityMap = Record<string, number>

const CACHE_BUST = () => Date.now()

function trxKey(row: LiveTrxRow) {
  return `${row.merchant_name || 'Unknown'}::${row.payment_method || '-'}`
}

function trxMatchesStatus(code: number, status: MetricStatus): boolean {
  if (!status) return true
  if (status === 'success') return code === 1000
  if (status === 'pending') return code === 1001
  if (status === 'waiting') return code === 1003
  if (status === 'failed') return code === 1005
  return true
}

/**
 * Paginate today's transactions (newest first) until every hinted pair has last-seen
 * or pages exhausted. First hit per key = latest trx time (API sorts desc).
 */
export async function fetchTodayLastSeen(
  apiUrl: string,
  authHeaders: Record<string, string>,
  trxParams: {
    start_date: string
    end_date: string
    app_id?: string
    payment_method?: string
  },
  options: { keysHint?: string[]; maxPages?: number; pageSize?: number } = {},
): Promise<{ activity: ActivityMap; rows: LiveTrxRow[]; complete: boolean }> {
  const maxPages = options.maxPages ?? 40
  const pageSize = options.pageSize ?? 500
  const activity: ActivityMap = {}
  const rows: LiveTrxRow[] = []
  const pending = new Set(options.keysHint || [])
  let complete = false

  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const res = await axios.get(`${apiUrl}/transactions`, {
        headers: authHeaders,
        params: {
          page,
          limit: pageSize,
          ...trxParams,
          _ts: CACHE_BUST(),
        },
      })

      const batch: LiveTrxRow[] = res.data?.data || []
      if (!batch.length) {
        complete = true
        break
      }

      rows.push(...batch)
      batch.forEach((row) => {
        const key = trxKey(row)
        const ts = dayjs(row.created_at)
        if (!ts.isValid()) return
        if (!activity[key]) {
          activity[key] = ts.valueOf()
          pending.delete(key)
        }
      })

      if (pending.size === 0 && options.keysHint?.length) break
      if (batch.length < pageSize) {
        complete = true
        break
      }
    } catch (e) {
      console.warn(`fetchTodayLastSeen page ${page} failed:`, e)
      break
    }
  }

  return { activity, rows, complete }
}

/**
 * Replace the newest aggregate window with bounded raw transactions.
 * The caller must only use this when the raw window was fetched completely.
 */
export function overlayTrafficWithTransactions(
  series: TrafficSeries[],
  rows: LiveTrxRow[],
  options: { start: Dayjs | Date; end: Dayjs | Date },
): TrafficSeries[] {
  const startMs = dayjs(options.start).valueOf()
  const end = dayjs(options.end)
  const endMs = end.valueOf()
  const map = new Map<string, TrafficSeries>()

  series.forEach((item) => {
    const key = `${item.merchant_name || item.client_uid || 'Unknown'}::${item.payment_method || '-'}`
    map.set(key, {
      ...item,
      data: (item.data || []).filter((point) => {
        const ts = dayjs(point.timestamp).valueOf()
        return Number.isNaN(ts) || ts < startMs || ts > endMs
      }),
    })
  })

  const live = new Map<
    string,
    { merchant_name: string; payment_method: string; success: number; pending: number; waiting: number; failed: number; total: number }
  >()

  rows.forEach((row) => {
    const ts = dayjs(row.created_at).valueOf()
    if (Number.isNaN(ts) || ts < startMs || ts > endMs) return
    const merchant = row.merchant_name || 'Unknown'
    const method = row.payment_method || '-'
    const key = `${merchant}::${method}`
    const current = live.get(key) || {
      merchant_name: merchant,
      payment_method: method,
      success: 0,
      pending: 0,
      waiting: 0,
      failed: 0,
      total: 0,
    }
    current.total += 1
    if (Number(row.status_code) === 1000) current.success += 1
    else if (Number(row.status_code) === 1001) current.pending += 1
    else if (Number(row.status_code) === 1003) current.waiting += 1
    else if (Number(row.status_code) === 1005) current.failed += 1
    live.set(key, current)
  })

  live.forEach((value, key) => {
    const existing = map.get(key) || {
      merchant_name: value.merchant_name,
      payment_method: value.payment_method,
      data: [],
    }
    existing.data.push({
      timestamp: end.toISOString(),
      success: value.success,
      pending: value.pending,
      waiting: value.waiting,
      failed: value.failed,
      total: value.total,
    })
    map.set(key, existing)
  })

  return Array.from(map.values())
}

/**
 * Rebuild every bucket at/after `from` from raw transactions, in the same bucket size as the
 * aggregate. Points before `from` are kept untouched.
 */
export function overlayTrafficBuckets(
  series: TrafficSeries[],
  rows: LiveTrxRow[],
  options: { from: Dayjs | number; bucketMinutes: number },
): TrafficSeries[] {
  const fromMs = dayjs(options.from).valueOf()
  const bucketMs = options.bucketMinutes * 60_000
  const keyOf = (merchant?: string, method?: string) => `${merchant || 'Unknown'}::${method || '-'}`

  const out = series.map((item) => ({
    ...item,
    data: (item.data || []).filter((point) => {
      const ts = dayjs(point.timestamp).valueOf()
      return Number.isNaN(ts) || ts < fromMs
    }),
  }))
  const indexByKey = new Map<string, number>()
  out.forEach((item, i) => {
    const key = keyOf(item.merchant_name || item.client_uid, item.payment_method)
    if (!indexByKey.has(key)) indexByKey.set(key, i)
  })

  const live = new Map<string, Map<number, TrafficPoint>>()
  rows.forEach((row) => {
    const ts = dayjs(row.created_at).valueOf()
    if (Number.isNaN(ts) || ts < fromMs) return
    const key = keyOf(row.merchant_name, row.payment_method)
    const bucketStart = Math.floor(ts / bucketMs) * bucketMs
    if (!live.has(key)) live.set(key, new Map())
    const byBucket = live.get(key)!
    const point = byBucket.get(bucketStart) || {
      timestamp: dayjs(bucketStart).format(),
      success: 0,
      pending: 0,
      waiting: 0,
      failed: 0,
      total: 0,
    }
    point.total = (point.total || 0) + 1
    const code = Number(row.status_code)
    if (code === 1000) point.success += 1
    else if (code === 1001) point.pending += 1
    else if (code === 1003) point.waiting = (point.waiting || 0) + 1
    else if (code === 1005) point.failed += 1
    byBucket.set(bucketStart, point)
  })

  live.forEach((byBucket, key) => {
    const points = Array.from(byBucket.values())
    const index = indexByKey.get(key)
    if (index === undefined) {
      const [merchant, method] = key.split('::')
      out.push({ merchant_name: merchant, payment_method: method, data: points })
    } else {
      out[index] = { ...out[index], data: [...out[index].data, ...points] }
    }
  })

  return out
}

/** Patch hourly buckets for the last N hours from transaction rows (live chart tail). */
export function buildRecentHoursPatch(
  rows: LiveTrxRow[],
  options: { now?: Dayjs | Date; hours?: number; status?: MetricStatus } = {},
): Record<string, number> {
  const now = options.now ? dayjs(options.now) : dayjs()
  const hours = options.hours ?? 6
  const status = options.status ?? ''
  const windowStart = now.subtract(hours, 'hour')
  const map: Record<string, number> = {}

  rows.forEach((row) => {
    const code = Number(row.status_code)
    if (!trxMatchesStatus(code, status)) return
    const ts = dayjs(row.created_at)
    if (!ts.isValid() || ts.isBefore(windowStart) || ts.isAfter(now)) return
    const h = ts.format('HH')
    map[h] = (map[h] || 0) + 1
  })

  return map
}
