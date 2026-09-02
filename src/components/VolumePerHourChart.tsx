import { useMemo } from 'react'
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
import { useColorScheme } from '@mui/material/styles'
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined'
import type { Dayjs } from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

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
    refLabel: now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
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
  const { mode, systemMode } = useColorScheme()
  const isDark = ((mode === 'system' ? systemMode : mode) || 'dark') !== 'light'

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

  const todayColor = isDark ? '#e08a8a' : '#c45c5c'
  const yestColor = isDark ? '#6b7280' : '#a0aec0'
  const tickColor = isDark ? '#b8a0a3' : '#6b7280'
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const data = {
    labels: volume.labels,
    datasets: [
      {
        label: 'Today',
        data: volume.today,
        borderColor: todayColor,
        backgroundColor: `${todayColor}22`,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
      },
      {
        label: 'Yesterday',
        data: volume.yesterday,
        borderColor: yestColor,
        backgroundColor: 'transparent',
        tension: 0.4,
        fill: false,
        borderDash: [5, 4],
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 1.5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: tickColor },
        grid: { color: gridColor },
      },
      x: {
        ticks: { color: tickColor },
        grid: { color: gridColor },
      },
    },
  }

  return (
    <div className='mon-panel mon-panel-chart'>
      <div className='mon-panel-head'>
        <div className='mon-panel-title'>
          <ShowChartOutlinedIcon sx={{ fontSize: 18 }} />
          <h4>Volume Per Hour</h4>
        </div>
        <span className='mon-panel-meta'>{volume.range}</span>
      </div>
      <div className='mon-panel-chart-body'>
        {loading && series.length === 0 ? (
          <div className='mon-panel-empty'>Loading volume…</div>
        ) : (
          <Line data={data} options={options} />
        )}
      </div>
      <div className='mon-panel-legend'>
        <span>
          <i className='mon-dot today' /> Today
        </span>
        <span>
          <i className='mon-dot yesterday' /> Yesterday
        </span>
      </div>
    </div>
  )
}
