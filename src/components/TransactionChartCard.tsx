import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Carousel, Tag, Button, Input } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuth } from '../provider/AuthProvider'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface TransactionData {
  merchant: string
  paymentMethod: string
  isNormal?: boolean // Property from backend
  reasons?: {
    success?: string
    pending?: string
    failed?: string
  }
  data: {
    labels: string[]
    pending: number[]
    success: number[]
    failed: number[]
  }
}

// API response typing
interface ApiSeriesPoint {
  timestamp: string
  client_uid: string
  merchant_name: string
  payment_method: string
  success: number
  pending: number
  failed: number
  total: number
}

interface ApiSeries {
  client_uid: string
  merchant_name: string
  payment_method: string
  data: ApiSeriesPoint[]
}

export function checkAbnormal(values: number[], latest: number, type: 'success' | 'pending' | 'failed') {
  if (values.length === 0) {
    return { isNormal: true, mean: 0, stdDev: 0, reason: 'No data' }
  }

  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  if (mean < 3 && latest < 3) {
    return { isNormal: true, mean, stdDev, reason: 'Volume kecil, dianggap noise' }
  }

  //semakin kecil semakin sensitif
  let multiplier = 2.5
  if (type === 'success') {
    if (mean > 30) multiplier = 3
    else multiplier = 3.2
  } else if (type === 'pending') {
    multiplier = 6.5
  } else if (type === 'failed') {
    multiplier = 2
  }

  const upperLimit = mean + multiplier * stdDev
  // Dibulatkan ke atas agar tidak terlalu sensitif pada selisih kecil
  const roundedUpperLimit = Math.ceil(upperLimit)
  const lowerLimit = mean - multiplier * stdDev

  let isNormal = true
  let reason = 'Normal'

  if (latest > roundedUpperLimit) {
    isNormal = false
    reason = `Lonjakan ${type}: latest (${latest}) > batas atas (${roundedUpperLimit})`
  } else if (latest < lowerLimit) {
    isNormal = false
    reason = `Penurunan ${type}: latest (${latest}) < batas bawah (${lowerLimit.toFixed(2)})`
  }

  return { isNormal, mean, stdDev, reason }
}

// Reads the console colour tokens from the root element and re-reads them when the theme changes,
// so chart.js (which needs real colour strings) follows light and dark mode.
const TOKEN_NAMES = ['text', 'muted', 'faint', 'border', 'rule', 'surface', 'positive', 'warning', 'negative', 'data', 'data-2'] as const
export type ConsoleColors = Record<(typeof TOKEN_NAMES)[number], string>

const readTokens = (): ConsoleColors => {
  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  return Object.fromEntries(TOKEN_NAMES.map((n) => [n, css?.getPropertyValue(`--${n}`).trim() || '#888'])) as ConsoleColors
}

export function useConsoleColors(): ConsoleColors {
  const [colors, setColors] = useState<ConsoleColors>(readTokens)
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setColors(readTokens()))
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
    return () => observer.disconnect()
  }, [])
  return colors
}

// Translucent fill from a token colour (the tokens are #rrggbb).
export const alpha = (color: string, a: number) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (!m) return color
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${a})`
}

// Shared chart.js styling: hairline grid, faint 11px axis text, dark tooltip.
export const consoleChartOptions = (c: ConsoleColors) => ({
  tooltip: {
    mode: 'index' as const,
    intersect: false,
    backgroundColor: '#0b111d',
    titleColor: '#fff',
    bodyColor: '#fff',
    borderWidth: 0,
    cornerRadius: 5,
    padding: 8,
    boxWidth: 8,
    boxHeight: 8,
    usePointStyle: true,
  },
  grid: { color: c.rule },
  border: { color: c.border },
  ticks: { color: c.faint, font: { size: 11 } },
})

const TransactionChartCard: React.FC = () => {
  const { token, apiUrl } = useAuth()
  const c = useConsoleColors()
  const look = consoleChartOptions(c)
  const [monitorData, setMonitorData] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const carouselRef = useRef<any>(null)

  // Fetch monitoring data (default: last 24 hours)
  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        setLoading(true)
        setError(null)
        const end = dayjs().format('YYYY-MM-DDTHH:mm:ssZ')
        const start = dayjs().subtract(8, 'hour').format('YYYY-MM-DDTHH:mm:ssZ')

        const url = `${apiUrl}/traffic/monitoring`
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: { start, end },
        })

        const apiData: ApiSeries[] = res.data?.data || []
        const transformed: TransactionData[] = apiData.map((series) => {
          // Hapus data terakhir karena belum selesai diproses
          const processedData = series.data.slice(0, -1)
          const labels = processedData.map((p) => dayjs(p.timestamp).format('HH:mm'))
          const pending = processedData.map((p) => p.pending)
          const success = processedData.map((p) => p.success)
          const failed = processedData.map((p) => p.failed)

          // Hitung rata-rata untuk menentukan isAbnormal
          // const count = labels.length || 1
          // const avgSuccess = parseFloat((success.reduce((sum, val) => sum + val, 0) / count).toFixed(2))
          // const avgPending = parseFloat((pending.reduce((sum, val) => sum + val, 0) / count).toFixed(2))
          // const avgFailed = parseFloat((failed.reduce((sum, val) => sum + val, 0) / count).toFixed(2))

          // Ambil data terakhir untuk perbandingan
          const latestSuccess = success[success.length - 1] || 0
          const latestPending = pending[pending.length - 1] || 0
          const latestFailed = failed[failed.length - 2] || 0

          // Kondisi isAbnormal: avg success > 5 dan ada selisih 3x lipat (lebih besar atau lebih kecil)
          // let isNormal = true
          // if (avgSuccess > 5) {
          //   if (latestSuccess >= avgSuccess * 3 || latestSuccess <= avgSuccess / 3) {
          //     console.log(
          //       `abnormal karena success, data merchant: ${series.merchant_name} - ${series.payment_method}, avgSuccess: ${avgSuccess}, lastSuccess: ${latestSuccess} `,
          //     )
          //     isNormal = false
          //   }
          // }

          // if (avgPending > 5) {
          //   if (latestPending >= avgPending * 4 || latestPending <= avgPending / 4) {
          //     console.log(
          //       `abnormal karena pending, data merchant: ${series.merchant_name} - ${series.payment_method}, avgPending: ${avgPending}, lastPending: ${latestPending} `,
          //     )
          //     isNormal = false
          //   }
          // }

          // if (avgFailed > 5) {
          //   if (latestFailed >= avgFailed * 3.5 || latestFailed <= avgFailed / 5) {
          //     console.log(
          //       `abnormal karena failed, data merchant: ${series.merchant_name} - ${series.payment_method}, avgFailed: ${avgFailed}, lastFailed: ${latestFailed} `,
          //     )
          //     isNormal = false
          //   }
          // }

          const { isNormal: successNormal, reason: reasonSuccess } = checkAbnormal(success, latestSuccess, 'success')
          const { isNormal: pendingNormal, reason: reasonPending } = checkAbnormal(pending, latestPending, 'pending')
          const { isNormal: failedNormal, reason: reasonFailed } = checkAbnormal(failed, latestFailed, 'failed')

          const isNormal = successNormal && pendingNormal && failedNormal

          return {
            merchant: series.merchant_name,
            paymentMethod: series.payment_method,
            isNormal,
            reasons: {
              success: successNormal ? undefined : reasonSuccess,
              pending: pendingNormal ? undefined : reasonPending,
              failed: failedNormal ? undefined : reasonFailed,
            },
            data: { labels, pending, success, failed },
          }
        })

        setMonitorData(transformed)
      } catch (e: any) {
        console.error('Monitoring fetch error:', e)
        setError('Could not load monitoring data')
      } finally {
        setLoading(false)
      }
    }

    fetchMonitoring()
  }, [apiUrl, token])

  const createChartData = (data: TransactionData) => ({
    labels: data.data.labels,
    datasets: [
      {
        label: 'Pending',
        data: data.data.pending,
        borderColor: c.warning,
        backgroundColor: alpha(c.warning, 0.1),
        tension: 0.4,
        fill: false,
        borderWidth: 1.75,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Success',
        data: data.data.success,
        borderColor: c.positive,
        backgroundColor: alpha(c.positive, 0.1),
        tension: 0.4,
        fill: false,
        borderWidth: 1.75,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'Failed',
        data: data.data.failed,
        borderColor: c.negative,
        backgroundColor: alpha(c.negative, 0.1),
        tension: 0.4,
        fill: false,
        borderWidth: 1.75,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  })

  const chartOptions = useMemo(
    () => ({
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        ...look.tooltip,
        callbacks: {
          title: (items: any[]) => {
            const first = items && items[0]
            if (!first) return ''
            const chartData: any = first.chart?.data || {}
            const idx = first.dataIndex
            const ts = chartData.timestamps?.[idx]
            if (ts) {
              return dayjs(ts).format('ddd, DD MMM YYYY HH:mm')
            }
            return first.label
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 8,
        grid: look.grid,
        border: look.border,
        ticks: {
          ...look.ticks,
          stepSize: 1,
          callback: function (value: any) {
            return Number(value) % 1 === 0 ? value : null
          },
        },
      },
      x: {
        grid: { display: false },
        border: look.border,
        ticks: {
          ...look.ticks,
          padding: 6,
          maxTicksLimit: 6,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }),
    [look],
  )

  const getLatestStats = (data: TransactionData) => {
    // Ambil data dari 1 interval sebelumnya karena data terbaru mungkin belum selesai
    const index = Math.max(0, data.data.pending.length - 1)
    const latestPending = data.data.pending[index] || 0
    const latestSuccess = data.data.success[index] || 0
    const latestFailed = data.data.failed[index] || 0
    return { latestPending, latestSuccess, latestFailed }
  }

  const getAvgStats = (data: TransactionData) => {
    const count = data.data.labels.length || 1
    const totalPending = data.data.pending.reduce((sum, val) => sum + val, 0)
    const totalSuccess = data.data.success.reduce((sum, val) => sum + val, 0)
    const totalFailed = data.data.failed.reduce((sum, val) => sum + val, 0)
    const avgPending = parseFloat((totalPending / count).toFixed(1))
    const avgSuccess = parseFloat((totalSuccess / count).toFixed(1))
    const avgFailed = parseFloat((totalFailed / count).toFixed(1))
    return { avgPending, avgSuccess, avgFailed }
  }

  // Filter berdasarkan nama merchant
  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return monitorData
    return monitorData.filter((item) => item.merchant.toLowerCase().includes(q))
  }, [monitorData, searchQuery])

  // Divide data into slides with 6 cards per slide (2x3)
  const slides = useMemo(() => {
    const s: TransactionData[][] = []
    for (let i = 0; i < filteredData.length; i += 6) {
      s.push(filteredData.slice(i, i + 6))
    }
    return s
  }, [filteredData])

  const handlePrev = () => {
    carouselRef.current?.prev()
  }

  const handleNext = () => {
    carouselRef.current?.next()
  }

  const stat = (label: string, latest: number, avg: number, tone: string) => (
    <div>
      <span className='rpt-kpi-label'>
        <i className={`rpt-dot ${tone}`} />
        {label}
      </span>
      <strong>
        {latest}
        <small>avg {avg}</small>
      </strong>
    </div>
  )

  return (
    <div className='rpt-page'>
      <div className='rpt-head'>
        <div>
          <h2 className='rpt-title'>Transaction Charts by Merchant & Payment Method</h2>
          <p className='rpt-sub'>Last 8 hours. Latest and average per interval for pending, success and failed.</p>
        </div>
        <div className='rpt-actions'>
          <Input
            allowClear
            placeholder='Search merchant...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 240 }}
          />
          <div className='rpt-carousel-nav'>
            <Button icon={<LeftOutlined />} onClick={handlePrev} aria-label='Previous' />
            <Button icon={<RightOutlined />} onClick={handleNext} aria-label='Next' />
          </div>
        </div>
      </div>

      {error && <div className='rpt-note is-error'>{error}</div>}
      {loading && <div className='rpt-note'>Loading monitoring data...</div>}

      <div className='rpt-carousel'>
        <Carousel
          ref={carouselRef}
          autoplay={searchQuery.trim() === ''}
          autoplaySpeed={5000}
          dots={{ className: 'custom-dots' }}
          style={{ width: '100%' }}
          effect='fade'
        >
          {slides.map((slide, slideIndex) => (
            <div key={slideIndex}>
              <div className='rpt-mon-grid'>
                {slide.map((item, index) => {
                  const latestStats = getLatestStats(item)
                  const avgs = getAvgStats(item)
                  const isAbnormal = item.isNormal === false
                  // const isHigo = item.merchant === 'HIGO GAME PTE LTD'

                  return (
                    <article key={index} className={`rpt-mon-card${isAbnormal ? ' is-abnormal' : ''}`}>
                      <header>
                        <h3 title={`${item.merchant} - ${item.paymentMethod}`}>
                          {item.merchant}
                          <small>{item.paymentMethod}</small>
                        </h3>
                        {isAbnormal && <Tag color='error'>ABNORMAL</Tag>}
                      </header>
                      <div className='rpt-mon-body'>
                        <div className='rpt-mon-stats'>
                          {stat('Pending', latestStats.latestPending, avgs.avgPending, 'warning')}
                          {stat('Success', latestStats.latestSuccess, avgs.avgSuccess, 'positive')}
                          {stat('Failed', latestStats.latestFailed, avgs.avgFailed, 'negative')}
                        </div>
                        {isAbnormal && item.reasons && (
                          <div className='rpt-mon-reasons'>
                            {item.reasons.success && <div>Success: {item.reasons.success}</div>}
                            {item.reasons.pending && <div>Pending: {item.reasons.pending}</div>}
                            {item.reasons.failed && <div>Failed: {item.reasons.failed}</div>}
                          </div>
                        )}
                        <div className='rpt-mon-chart'>
                          <Line data={createChartData(item)} options={chartOptions} />
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  )
}

export default TransactionChartCard
