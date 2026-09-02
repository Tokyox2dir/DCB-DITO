import { useMemo } from 'react'
import type { Dayjs } from 'dayjs'
import { TrafficSeries } from './VolumePerHourChart'

type PerfRow = {
  client: string
  total: number
  successPct: number
  pendingPct: number
  failedPct: number
}

function formatNum(n: number) {
  return n.toLocaleString('id-ID')
}

function formatPct(n: number) {
  return `${n.toFixed(2)}%`
}

export function buildClientPerformance(
  series: TrafficSeries[],
  options: { now?: Date | Dayjs; limit?: number } = {},
): PerfRow[] {
  const limit = options.limit ?? 20
  const now = options.now ? new Date(options.now.valueOf()) : new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const map = new Map<string, { success: number; pending: number; failed: number }>()

  series.forEach((s) => {
    const name = s.merchant_name || s.client_uid || 'Unknown'
    if (!map.has(name)) map.set(name, { success: 0, pending: 0, failed: 0 })
    const row = map.get(name)!
    ;(s.data || []).forEach((p) => {
      const ts = new Date(p.timestamp)
      if (Number.isNaN(ts.getTime()) || ts < todayStart || ts > now) return
      const success = p.success || 0
      const failed = p.failed || 0
      const total = p.total ?? success + (p.pending || 0) + (p.waiting || 0) + failed
      row.success += success
      row.failed += failed
      row.pending += Math.max(0, total - success - failed)
    })
  })

  return Array.from(map.entries())
    .map(([client, v]) => {
      const total = v.success + v.pending + v.failed
      const successPct = total ? (v.success / total) * 100 : 0
      const pendingPct = total ? (v.pending / total) * 100 : 0
      const failedPct = total ? (v.failed / total) * 100 : 0
      return { client, total, successPct, pendingPct, failedPct }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

type Props = {
  series: TrafficSeries[]
  loading?: boolean
  referenceNow?: Dayjs | Date | null
}

export default function ClientPerformance({ series, loading, referenceNow }: Props) {
  const rows = useMemo(
    () => buildClientPerformance(series, { now: referenceNow || undefined, limit: 20 }),
    [series, referenceNow],
  )

  return (
    <div className='mon-panel mon-panel-perf'>
      <div className='mon-perf-title'>Client Performance</div>
      <div className='mon-perf-scroll'>
        {loading && rows.length === 0 && <div className='mon-panel-empty'>Loading performance…</div>}
        {!loading && rows.length === 0 && <div className='mon-panel-empty'>Belum ada data performance</div>}
        {rows.map((r) => {
          const barTotal = r.successPct + r.pendingPct + r.failedPct
          const g = barTotal ? (r.successPct / barTotal) * 100 : 100
          const y = barTotal ? (r.pendingPct / barTotal) * 100 : 0
          const red = Math.max(0, 100 - g - y)
          return (
            <div className='mon-perf-item' key={r.client}>
              <div className='mon-perf-name'>
                <span className='mon-perf-client'>{r.client}</span>
                <div className='mon-perf-stats'>
                  <div className='mon-perf-total'>
                    {formatNum(r.total)}
                    <span>TRX</span>
                  </div>
                  <div className='mon-perf-pct'>
                    <span className='g'>{formatPct(r.successPct)}</span>
                    <span className='y'>{formatPct(r.pendingPct)}</span>
                    <span className='r'>{formatPct(r.failedPct)}</span>
                  </div>
                </div>
              </div>
              <div className='mon-perf-bar'>
                <i className='g' style={{ width: `${g}%` }} />
                <i className='y' style={{ width: `${y}%` }} />
                <i className='r' style={{ width: `${red}%` }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className='mon-perf-legend'>
        <span>
          <i className='g' /> Success
        </span>
        <span>
          <i className='y' /> Pending
        </span>
        <span>
          <i className='r' /> Failed
        </span>
      </div>
    </div>
  )
}
