import { useMemo } from 'react'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

export type ClientStopAlert = {
  client: string
  product: string
  detail: string
  since: string
  lastTs: number
  totalToday: number
}

export type FailedSpikeAlert = {
  product: string
  detail: string
  since: string
  failedRecent: number
  failedPrev: number
}

export type ActivityMap = Record<string, number>
export type TodayCountMap = Record<string, number>

function parseKey(key: string) {
  const sep = key.indexOf('::')
  return {
    client: sep >= 0 ? key.slice(0, sep) : key,
    product: sep >= 0 ? key.slice(sep + 2) : '-',
  }
}

function formatLastSeen(ms: number) {
  return dayjs(ms).format('HH:mm:ss')
}

/**
 * Client stop = had traffic today + last trx (from /transactions) older than idleMinutes.
 * NEVER uses traffic bucket timestamps — only real transaction created_at.
 */
export function buildClientStopAlerts(options: {
  now?: Date | Dayjs
  idleMinutes?: number
  minToday?: number
  activity: ActivityMap
  todayCounts?: TodayCountMap
}): ClientStopAlert[] {
  const now = options.now ? dayjs(options.now.valueOf()) : dayjs()
  const idleMinutes = options.idleMinutes ?? 5
  const minToday = options.minToday ?? 1
  const cutoff = now.subtract(idleMinutes, 'minute').valueOf()
  const activity = options.activity || {}
  const todayCounts = options.todayCounts || {}

  const rows: ClientStopAlert[] = []

  Object.keys(todayCounts).forEach((key) => {
    const totalToday = todayCounts[key] || 0
    if (totalToday < minToday) return

    const lastMs = activity[key]
    // No transaction proof → skip (avoid false 21:00 from hourly buckets).
    if (lastMs == null) return
    if (lastMs >= cutoff) return

    const { client, product } = parseKey(key)
    const since = formatLastSeen(lastMs)
    rows.push({
      client,
      product,
      detail: `Traffic stop — ${totalToday.toLocaleString('id-ID')} trx, terakhir ${since}`,
      since,
      lastTs: lastMs,
      totalToday,
    })
  })

  return rows.sort((a, b) => b.lastTs - a.lastTs)
}

export function buildFailedSpikeAlertsFromTransactions(
  rows: Array<{ payment_method?: string; created_at?: string; status_code?: number }>,
  options: {
    now?: Date | Dayjs
    windowMinutes?: number
    minFailed?: number
    ratio?: number
  } = {},
): FailedSpikeAlert[] {
  const now = options.now ? dayjs(options.now.valueOf()) : dayjs()
  const windowMinutes = options.windowMinutes ?? 5
  const minFailed = options.minFailed ?? 3
  const ratio = options.ratio ?? 2
  const recentStart = now.subtract(windowMinutes, 'minute')
  const prevStart = now.subtract(windowMinutes * 2, 'minute')

  const map = new Map<string, { recentFailed: number; prevFailed: number }>()

  rows.forEach((row) => {
    if (Number(row.status_code) !== 1005) return
    const product = row.payment_method || '-'
    const ts = dayjs(row.created_at)
    if (!ts.isValid() || ts.isAfter(now)) return

    if (!map.has(product)) map.set(product, { recentFailed: 0, prevFailed: 0 })
    const bucket = map.get(product)!

    if ((ts.isAfter(recentStart) || ts.isSame(recentStart)) && (ts.isBefore(now) || ts.isSame(now))) {
      bucket.recentFailed += 1
    } else if ((ts.isAfter(prevStart) || ts.isSame(prevStart)) && ts.isBefore(recentStart)) {
      bucket.prevFailed += 1
    }
  })

  const out: FailedSpikeAlert[] = []
  map.forEach((v, product) => {
    const elevated =
      v.recentFailed >= minFailed &&
      (v.prevFailed === 0 ? v.recentFailed >= minFailed : v.recentFailed >= v.prevFailed * ratio)
    if (!elevated) return

    out.push({
      product,
      detail: `Failed spike — ${v.recentFailed.toLocaleString('id-ID')} failed (+${(v.recentFailed - v.prevFailed).toLocaleString('id-ID')}) / ${windowMinutes}m`,
      since: recentStart.format('HH:mm:ss'),
      failedRecent: v.recentFailed,
      failedPrev: v.prevFailed,
    })
  })

  return out.sort((a, b) => b.failedRecent - a.failedRecent)
}

type Props = {
  activity: ActivityMap
  todayCounts?: TodayCountMap
  failedRows?: Array<{ payment_method?: string; created_at?: string; status_code?: number }> | null
  loading?: boolean
  referenceNow?: Dayjs | Date | null
}

export default function AlertMonitor({
  activity,
  todayCounts,
  failedRows,
  loading,
  referenceNow,
}: Props) {
  const clientStops = useMemo(
    () =>
      buildClientStopAlerts({
        now: referenceNow || undefined,
        idleMinutes: 5,
        activity,
        todayCounts,
      }),
    [activity, todayCounts, referenceNow],
  )

  const incidents = useMemo(
    () =>
      buildFailedSpikeAlertsFromTransactions(failedRows || [], {
        now: referenceNow || undefined,
        windowMinutes: 5,
      }),
    [failedRows, referenceNow],
  )

  return (
    <div className='mon-panel mon-panel-alert'>
      <div className='mon-alert-head'>
        <h4>Alert Monitor</h4>
        <div className='mon-alert-badges'>
          <span className='crit'>{clientStops.length} stop</span>
          <span className='warn'>{incidents.length} incident</span>
        </div>
      </div>

      <div className='mon-alert-section'>
        <div className='mon-alert-section-title crit'>Client Info</div>
        <div className='mon-alert-scroll'>
          {loading && clientStops.length === 0 ? (
            <div className='mon-panel-empty'>Loading alerts…</div>
          ) : clientStops.length === 0 ? (
            <div className='mon-panel-empty'>Tidak ada client stop (5 menit)</div>
          ) : (
            <table className='mon-alert-table'>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Product</th>
                  <th>Detail</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {clientStops.map((r) => (
                  <tr key={`${r.client}-${r.product}`}>
                    <td>
                      <span className='mon-alert-client'>
                        <i className='dot crit' />
                        {r.client}
                      </span>
                    </td>
                    <td className='product'>{r.product}</td>
                    <td className='detail'>{r.detail}</td>
                    <td className='since'>{r.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className='mon-alert-section'>
        <div className='mon-alert-section-title warn'>Incidents</div>
        <div className='mon-alert-scroll'>
          {loading && incidents.length === 0 ? (
            <div className='mon-panel-empty'>Loading incidents…</div>
          ) : incidents.length === 0 ? (
            <div className='mon-panel-empty'>Tidak ada failed spike (5 menit)</div>
          ) : (
            <table className='mon-alert-table'>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Detail</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((r) => (
                  <tr key={r.product}>
                    <td>
                      <span className='mon-alert-client'>
                        <i className='dot warn' />
                        <span className='product'>{r.product}</span>
                      </span>
                    </td>
                    <td className='detail'>{r.detail}</td>
                    <td className='since'>{r.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
