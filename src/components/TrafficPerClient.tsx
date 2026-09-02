import { useMemo } from 'react'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import type { Dayjs } from 'dayjs'
import { MetricStatus, TrafficSeries, pointValue } from './VolumePerHourChart'

function formatNum(n: number) {
  return n.toLocaleString('id-ID')
}

export type ClientTrafficRow = {
  client: string
  today: number
  yesterday: number
}

export function buildTrafficPerClient(
  series: TrafficSeries[],
  options: {
    limit?: number
    now?: Date | Dayjs
    status?: MetricStatus
    fineSeries?: TrafficSeries[]
  } = {},
): ClientTrafficRow[] {
  const limit = options.limit ?? 15
  const status = options.status ?? ''
  const now = options.now ? new Date(options.now.valueOf()) : new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yestStart = new Date(todayStart.getTime() - 24 * 3600000)
  const yestSameTime = new Date(now.getTime() - 24 * 3600000)

  const map = new Map<string, { today: number; yesterday: number }>()

  const ingest = (source: TrafficSeries[], mode: 'today' | 'yesterday') => {
    source.forEach((s) => {
      const name = s.merchant_name || s.client_uid || 'Unknown'
      if (!map.has(name)) map.set(name, { today: 0, yesterday: 0 })
      const row = map.get(name)!
      ;(s.data || []).forEach((p) => {
        const ts = new Date(p.timestamp)
        if (Number.isNaN(ts.getTime())) return
        const total = pointValue(p, status)
        if (mode === 'today' && ts >= todayStart && ts <= now) row.today += total
        if (mode === 'yesterday' && ts >= yestStart && ts < yestSameTime) row.yesterday += total
      })
    })
  }

  ingest(series, 'yesterday')
  if (options.fineSeries && options.fineSeries.length) {
    ingest(options.fineSeries, 'today')
  } else {
    ingest(series, 'today')
  }

  return Array.from(map.entries())
    .map(([client, v]) => ({ client, today: v.today, yesterday: v.yesterday }))
    .filter((r) => r.today > 0 || r.yesterday > 0)
    .sort((a, b) => b.today - a.today)
    .slice(0, limit)
}

type Props = {
  series: TrafficSeries[]
  fineSeries?: TrafficSeries[]
  loading?: boolean
  status?: MetricStatus
  referenceNow?: Dayjs | Date | null
}

export default function TrafficPerClient({
  series,
  fineSeries,
  loading,
  status = '',
  referenceNow,
}: Props) {
  const rows = useMemo(
    () =>
      buildTrafficPerClient(series, {
        limit: 15,
        now: referenceNow || undefined,
        status,
        fineSeries,
      }),
    [series, fineSeries, referenceNow, status],
  )
  const max = useMemo(() => Math.max(1, ...rows.map((r) => Math.max(r.today, r.yesterday))), [rows])

  return (
    <div className='mon-panel mon-panel-tpc'>
      <div className='mon-panel-head mon-panel-head-border'>
        <div className='mon-panel-title'>
          <BarChartOutlinedIcon sx={{ fontSize: 18 }} />
          <h4>Traffic Per Client</h4>
        </div>
        <span className='mon-panel-meta'>vs same time yesterday</span>
      </div>

      <div className='mon-tpc-scroll'>
        <table className='mon-tpc-table'>
          <thead>
            <tr>
              <th>Client</th>
              <th className='num'>Today</th>
              <th className='num'>Yest</th>
              <th className='num'>Delta</th>
              <th className='bar-col'>Bar</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className='mon-panel-empty'>
                  Loading traffic…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className='mon-panel-empty'>
                  Belum ada data traffic
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const delta = r.today - r.yesterday
              const up = delta >= 0
              const col = up ? '#10b981' : '#ef4444'
              const pct = r.yesterday ? (delta / r.yesterday) * 100 : 0
              const w = Math.max(6, Math.round((r.today / max) * 100))
              return (
                <tr key={r.client}>
                  <td>
                    <span className='mon-tpc-client'>
                      <i style={{ background: col }} />
                      {r.client}
                    </span>
                  </td>
                  <td className='num'>
                    <span className='mon-tpc-today'>{formatNum(r.today)}</span>
                    <span className='mon-tpc-delta-pill' style={{ color: col, background: `${col}1f` }}>
                      {up ? '+' : ''}
                      {formatNum(delta)}
                    </span>
                  </td>
                  <td className='num muted'>{formatNum(r.yesterday)}</td>
                  <td className='num' style={{ color: col, fontWeight: 700 }}>
                    {up ? '+' : ''}
                    {pct.toFixed(1)}%
                  </td>
                  <td className='bar-col'>
                    <div className='mon-tpc-bar'>
                      <i style={{ width: `${w}%`, background: col }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className='mon-panel-foot'>● traffic API — refresh tiap 30 detik</div>
    </div>
  )
}
