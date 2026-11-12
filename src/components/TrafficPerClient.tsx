import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { MetricStatus, TrafficSeries, pointValue } from './VolumePerHourChart'
import { paymentMethods } from '../utils/paymentMethods'

function formatNum(n: number) {
  return n.toLocaleString('id-ID')
}

export type ClientTrafficRow = {
  client: string
  today: number
  yesterday: number
}

export type TrafficGroupBy = 'client' | 'payment'

const paymentLabels = new Map(paymentMethods.filter((m) => m.value).map((m) => [m.value, m.name]))

function paymentLabel(value?: string) {
  if (!value) return 'Unknown'
  return (
    paymentLabels.get(value) ||
    value
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

export function buildTrafficPerClient(
  series: TrafficSeries[],
  options: {
    limit?: number
    now?: Date | Dayjs
    status?: MetricStatus
    fineSeries?: TrafficSeries[]
    groupBy?: TrafficGroupBy
  } = {},
): ClientTrafficRow[] {
  const limit = options.limit ?? 15
  const groupBy = options.groupBy ?? 'client'
  const status = options.status ?? ''
  const now = options.now ? new Date(options.now.valueOf()) : new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const yestStart = new Date(todayStart.getTime() - 24 * 3600000)
  const yestSameTime = new Date(now.getTime() - 24 * 3600000)

  const map = new Map<string, { today: number; yesterday: number }>()

  const ingest = (source: TrafficSeries[], mode: 'today' | 'yesterday') => {
    source.forEach((s) => {
      const name =
        groupBy === 'payment' ? paymentLabel(s.payment_method) : s.merchant_name || s.client_uid || 'Unknown'
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

const SLIDES: { groupBy: TrafficGroupBy; title: string; column: string }[] = [
  { groupBy: 'client', title: 'Traffic Per Client', column: 'Client' },
  { groupBy: 'payment', title: 'Traffic Per Payment', column: 'Payment' },
]

const SLIDE_STORAGE_KEY = 'mon_traffic_slide'

// Monitoring remounts this panel on every refresh, so keep the chosen slide outside React state.
let lastSlide = (() => {
  try {
    const saved = Number(localStorage.getItem(SLIDE_STORAGE_KEY))
    return saved >= 0 && saved < SLIDES.length ? saved : 0
  } catch {
    return 0
  }
})()

function rememberSlide(index: number) {
  lastSlide = index
  try {
    localStorage.setItem(SLIDE_STORAGE_KEY, String(index))
  } catch {
    // storage unavailable: keep the in-memory value only
  }
}

function TrafficTable({
  rows,
  column,
  loading,
}: {
  rows: ClientTrafficRow[]
  column: string
  loading?: boolean
}) {
  const max = useMemo(() => Math.max(1, ...rows.map((r) => Math.max(r.today, r.yesterday))), [rows])

  return (
    <div className='mon-tpc-scroll'>
      <table className='mon-tpc-table'>
        <thead>
          <tr>
            <th>{column}</th>
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
                No traffic data yet
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const delta = r.today - r.yesterday
            const up = delta >= 0
            const tone = up ? 'up' : 'down'
            const pct = r.yesterday ? (delta / r.yesterday) * 100 : 0
            const w = Math.max(6, Math.round((r.today / max) * 100))
            return (
              <tr key={r.client} className={tone}>
                <td>
                  <span className='mon-tpc-client' title={r.client}>
                    <i />
                    {r.client}
                  </span>
                </td>
                <td className='num'>
                  <span className='mon-tpc-today'>{formatNum(r.today)}</span>
                  <span className='mon-tpc-delta-pill'>
                    {up ? '+' : ''}
                    {formatNum(delta)}
                  </span>
                </td>
                <td className='num muted'>{formatNum(r.yesterday)}</td>
                <td className='num mon-tpc-pct'>
                  {up ? '▲' : '▼'} {up ? '+' : ''}
                  {pct.toFixed(1)}%
                </td>
                <td className='bar-col'>
                  <div className='mon-tpc-bar'>
                    <i style={{ width: `${w}%` }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function TrafficPerClient({
  series,
  fineSeries,
  loading,
  status = '',
  referenceNow,
}: Props) {
  const [active, setActive] = useState(lastSlide)
  const pagerRef = useRef<HTMLDivElement>(null)

  const slides = useMemo(
    () =>
      SLIDES.map((slide) => ({
        ...slide,
        rows: buildTrafficPerClient(series, {
          limit: 15,
          now: referenceNow || undefined,
          status,
          fineSeries,
          groupBy: slide.groupBy,
        }),
      })),
    [series, fineSeries, referenceNow, status],
  )

  useEffect(() => {
    const el = pagerRef.current
    if (el) el.scrollLeft = lastSlide * el.clientWidth
  }, [])

  const goTo = (index: number) => {
    const el = pagerRef.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  const onScroll = () => {
    const el = pagerRef.current
    if (!el || !el.clientWidth) return
    const index = Math.min(SLIDES.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))
    if (index !== active) {
      setActive(index)
      rememberSlide(index)
    }
  }

  const ref = referenceNow ? dayjs(referenceNow.valueOf()) : dayjs()
  const isLive = ref.isSame(dayjs(), 'day')
  const compareLabel = isLive
    ? 'vs same time yesterday'
    : `${ref.format('DD MMM')} vs ${ref.subtract(1, 'day').format('DD MMM')}`

  return (
    <div className='mon-panel mon-panel-tpc'>
      <div className='mon-panel-head'>
        <div className='mon-panel-title'>
          <h4>{SLIDES[active].title}</h4>
          <small>{compareLabel}</small>
        </div>
        <div className='mon-tpc-head-right'>
          <div className='mon-tpc-dots' role='tablist' aria-label='Traffic view'>
            {SLIDES.map((slide, i) => (
              <button
                key={slide.groupBy}
                type='button'
                role='tab'
                aria-selected={i === active}
                aria-label={slide.title}
                title={slide.title}
                className={i === active ? 'active' : ''}
                onClick={() => goTo(i)}
              >
                {slide.column}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='mon-tpc-pager' ref={pagerRef} onScroll={onScroll}>
        {slides.map((slide) => (
          <div className='mon-tpc-slide' key={slide.groupBy}>
            <TrafficTable rows={slide.rows} column={slide.column} loading={loading} />
          </div>
        ))}
      </div>

      <div className='mon-panel-foot'>
        <i className={`mon-live-dot${isLive ? ' on' : ''}`} />
        traffic API — {isLive ? 'refreshes every 30s' : 'historical data'} · swipe to switch view
      </div>
    </div>
  )
}
