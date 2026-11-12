import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import type { Dayjs } from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

/** Console colour tokens read from the CSS variables, so charts follow the light and dark themes. */
export type ChartTokens = {
  data: string
  data2: string
  faint: string
  muted: string
  rule: string
  surface: string
  raised: string
  positive: string
  warning: string
  negative: string
  font: string
  mono: string
}

export function readChartTokens(): ChartTokens {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    data: v('--data', '#3d63dd'),
    data2: v('--data-2', '#9db1f2'),
    faint: v('--faint', '#667085'),
    muted: v('--muted', '#475467'),
    rule: v('--rule', '#edeff2'),
    surface: v('--surface', '#ffffff'),
    raised: v('--raised', '#f8f9fb'),
    positive: v('--positive', '#067647'),
    warning: v('--warning', '#b54708'),
    negative: v('--negative', '#d92d20'),
    font: v('--font', 'system-ui, sans-serif'),
    mono: v('--mono', 'ui-monospace, monospace'),
  }
}

/** Re-reads the tokens whenever html[data-theme] changes. */
export function useChartTokens(): ChartTokens {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme'))
  useEffect(() => {
    const root = document.documentElement
    const mo = new MutationObserver(() => setTheme(root.getAttribute('data-theme')))
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readChartTokens(), [theme])
}

/** #rrggbb + alpha -> rgba(); other formats are returned as is. */
export function withAlpha(color: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export function chartTooltip(t: ChartTokens) {
  return {
    backgroundColor: '#0b111d',
    titleColor: '#ffffff',
    bodyColor: '#e7eaf1',
    footerColor: '#a5adbe',
    borderWidth: 0,
    cornerRadius: 5,
    padding: 8,
    boxPadding: 4,
    usePointStyle: true,
    titleFont: { family: t.font, size: 12, weight: 600 as const },
    bodyFont: { family: t.mono, size: 12 },
    footerFont: { family: t.mono, size: 11, weight: 400 as const },
  }
}

export function chartAxis(t: ChartTokens) {
  return {
    ticks: { color: t.faint, font: { family: t.font, size: 11 } },
    grid: { color: t.rule, drawTicks: false },
    border: { display: false },
  }
}

export type TrafficPoint = {
  timestamp: string
  success: number
  pending: number
  failed: number
  waiting?: number
  total?: number
}

export type TrafficSeries = {
  merchant_name: string
  client_uid?: string
  payment_method?: string
  data: TrafficPoint[]
}

export type MetricStatus = '' | 'success' | 'pending' | 'waiting' | 'failed'

export function pointValue(p: TrafficPoint, status: MetricStatus = '') {
  if (status === 'success') return p.success || 0
  if (status === 'pending') return p.pending || 0
  if (status === 'waiting') return (p as any).waiting || 0
  if (status === 'failed') return p.failed || 0
  return p.total ?? p.success + p.pending + p.failed + ((p as any).waiting || 0)
}

export function buildVolumeComparison(
  series: TrafficSeries[],
  options: {
    hours?: number
    now?: Date | Dayjs
    status?: MetricStatus
    fineSeries?: TrafficSeries[]
    /** Override current hour only — from recent /transactions sample. */
    hourPatch?: Record<string, number> | null
  } = {},
) {
  const hours = options.hours ?? 6
  const status = options.status ?? ''
  const nowMs = options.now ? new Date(options.now.valueOf()).getTime() : Date.now()
  const now = new Date(nowMs)

  const labels: string[] = []
  const hourKeys: string[] = []

  for (let i = hours - 1; i >= 0; i--) {
    const d = new Date(nowMs - i * 3600000)
    const h = String(d.getHours()).padStart(2, '0')
    hourKeys.push(h)
    labels.push(`${h}:00`)
  }

  const todayStart = nowMs - hours * 3600000
  const todayEnd = nowMs
  const yestStart = nowMs - (hours + 24) * 3600000
  const yestEnd = nowMs - 24 * 3600000

  const todayMap: Record<string, number> = {}
  const yestMap: Record<string, number> = {}

  const ingest = (source: TrafficSeries[], mode: 'today' | 'yesterday' | 'both') => {
    source.forEach((s) => {
      s.data.forEach((p) => {
        const ts = new Date(p.timestamp).getTime()
        if (Number.isNaN(ts)) return
        const h = String(new Date(p.timestamp).getHours()).padStart(2, '0')
        const total = pointValue(p, status)
        if ((mode === 'today' || mode === 'both') && ts >= todayStart && ts < todayEnd) {
          todayMap[h] = (todayMap[h] || 0) + total
        }
        if ((mode === 'yesterday' || mode === 'both') && ts >= yestStart && ts < yestEnd) {
          yestMap[h] = (yestMap[h] || 0) + total
        }
      })
    })
  }

  ingest(series, 'yesterday')

  if (options.fineSeries && options.fineSeries.length) {
    ingest(options.fineSeries, 'today')
    const hourlyToday: Record<string, number> = {}
    series.forEach((s) => {
      s.data.forEach((p) => {
        const ts = new Date(p.timestamp).getTime()
        if (Number.isNaN(ts) || ts < todayStart || ts >= todayEnd) return
        const h = String(new Date(p.timestamp).getHours()).padStart(2, '0')
        hourlyToday[h] = (hourlyToday[h] || 0) + pointValue(p, status)
      })
    })
    hourKeys.forEach((h) => {
      if (!todayMap[h] && hourlyToday[h]) todayMap[h] = hourlyToday[h]
    })
  } else {
    ingest(series, 'today')
  }

  if (options.hourPatch) {
    Object.entries(options.hourPatch).forEach(([h, v]) => {
      if (hourKeys.includes(h)) todayMap[h] = v
    })
  }

  return {
    labels,
    today: hourKeys.map((h) => todayMap[h] || 0),
    yesterday: hourKeys.map((h) => yestMap[h] || 0),
    range: labels.length ? `${labels[0]} - ${labels[labels.length - 1]}` : '',
    refLabel: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
  }
}

type Props = {
  series: TrafficSeries[]
  fineSeries?: TrafficSeries[]
  hourPatch?: Record<string, number> | null
  loading?: boolean
  status?: MetricStatus
  referenceNow?: Dayjs | Date | null
}

export default function VolumePerHourChart({
  series,
  fineSeries,
  hourPatch,
  loading,
  status = '',
  referenceNow,
}: Props) {
  const t = useChartTokens()

  const volume = useMemo(
    () =>
      buildVolumeComparison(series, {
        hours: 6,
        now: referenceNow || undefined,
        status,
        fineSeries,
        hourPatch,
      }),
    [series, fineSeries, hourPatch, referenceNow, status],
  )

  const axis = chartAxis(t)

  const data = {
    labels: volume.labels,
    datasets: [
      {
        label: 'Today',
        data: volume.today,
        borderColor: t.data,
        backgroundColor: withAlpha(t.data, 0.1),
        tension: 0,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: t.data,
        pointHoverBorderColor: t.surface,
        pointHoverBorderWidth: 2,
        borderWidth: 2,
      },
      {
        label: 'Yesterday',
        data: volume.yesterday,
        borderColor: t.faint,
        backgroundColor: 'transparent',
        tension: 0,
        fill: false,
        borderDash: [4, 4],
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: t.faint,
        borderWidth: 1.5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltip(t),
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}  ${(Number(ctx.raw) || 0).toLocaleString('id-ID')}`,
        },
      },
    },
    scales: {
      y: {
        ...axis,
        beginAtZero: true,
        ticks: { ...axis.ticks, precision: 0, padding: 6, font: { family: t.mono, size: 11 } },
      },
      x: {
        ...axis,
        grid: { display: false },
        ticks: { ...axis.ticks, padding: 6, font: { family: t.mono, size: 11 } },
      },
    },
  }

  return (
    <div className='mon-panel mon-panel-chart'>
      <div className='mon-panel-head'>
        <div className='mon-panel-title'>
          <h4>Volume Per Hour</h4>
          <small>Per hour, against the day before</small>
        </div>
        <div className='mon-panel-legend'>
          <span>
            <i className='mon-dot today' /> Today
          </span>
          <span>
            <i className='mon-dot yesterday' /> Yesterday
          </span>
          <span className='mon-panel-meta'>{volume.range}</span>
        </div>
      </div>
      <div className='mon-panel-chart-body'>
        {loading && series.length === 0 ? (
          <div className='mon-panel-empty'>Loading volume…</div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
    </div>
  )
}
