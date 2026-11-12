import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Select, Spin, DatePicker } from 'antd'
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
  Filler,
} from 'chart.js'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import { parseDurationToSeconds, formatSecondsToDuration } from '../utils/durationParser'
import { chartAxis, chartTooltip, useChartTokens, withAlpha } from './VolumePerHourChart'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const { RangePicker } = DatePicker

// === Types ===
interface DurationDataPoint {
  date: string
  merchant_name: string
  payment_method: string
  status: string
  avg_supplier_duration: string
  avg_merchant_duration: string
  avg_total_duration: string
  total_transactions: number
}

interface ParsedDataPoint extends DurationDataPoint {
  supplierSeconds: number
  merchantSeconds: number
  totalSeconds: number
  dateFormatted: string
}

interface AggregatedDurationPoint {
  date: string
  dateFormatted: string
  supplierSeconds: number
  merchantSeconds: number
  totalSeconds: number
  total_transactions: number
}

interface DurationCardGroup {
  key: string
  merchant_name: string
  payment_method: string
  statuses: string[]
  points: AggregatedDurationPoint[]
}

// Auto-refresh interval (10 minutes = API cache TTL)
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000

const DurationChart: React.FC = () => {
  const t = useChartTokens()
  const { token, apiUrl } = useAuth()

  // === State ===
  const [rawData, setRawData] = useState<DurationDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedMerchant, setSelectedMerchant] = useState<string>('all')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Date range (default: today)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('day'),
    dayjs().endOf('day'),
  ])

  // === Fetch Data ===
  const fetchDurationData = useCallback(async () => {
    if (!token || !apiUrl) return
    try {
      setLoading(true)
      setError(null)

      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')

      const url = `${apiUrl}/traffic/monitoring/duration`
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: { start_date: startDate, end_date: endDate },
      })

      const data: DurationDataPoint[] = res.data?.data || []
      setRawData(data)
    } catch (e: any) {
      console.error('Duration monitoring fetch error:', e)
      setError('Failed to load duration monitoring data')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, token, dateRange])

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchDurationData()
    const interval = setInterval(fetchDurationData, AUTO_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchDurationData])

  // === Parse + Filter Data ===
  const parsedData: ParsedDataPoint[] = useMemo(() => {
    return rawData.map((d) => ({
      ...d,
      supplierSeconds: parseDurationToSeconds(d.avg_supplier_duration),
      merchantSeconds: parseDurationToSeconds(d.avg_merchant_duration),
      totalSeconds: parseDurationToSeconds(d.avg_total_duration),
      dateFormatted: dayjs(d.date).format('HH:mm'),
    }))
  }, [rawData])

  // Unique filter options
  const merchants = useMemo(() => {
    const set = new Set(parsedData.map((d) => d.merchant_name))
    return Array.from(set).sort()
  }, [parsedData])

  const paymentMethods = useMemo(() => {
    const set = new Set(parsedData.map((d) => d.payment_method))
    return Array.from(set).sort()
  }, [parsedData])

  const statuses = useMemo(() => {
    const set = new Set(parsedData.map((d) => d.status))
    return Array.from(set).sort()
  }, [parsedData])

  // Filtered data
  const filteredData = useMemo(() => {
    return parsedData.filter((d) => {
      if (selectedMerchant !== 'all' && d.merchant_name !== selectedMerchant) return false
      if (selectedPaymentMethod !== 'all' && d.payment_method !== selectedPaymentMethod) return false
      if (selectedStatus !== 'all' && d.status !== selectedStatus) return false
      return true
    })
  }, [parsedData, selectedMerchant, selectedPaymentMethod, selectedStatus])

  const groupedCards = useMemo<DurationCardGroup[]>(() => {
    const groups = new Map<string, ParsedDataPoint[]>()

    filteredData.forEach((point) => {
      const key = `${point.merchant_name}|||${point.payment_method}`
      const current = groups.get(key)
      if (current) current.push(point)
      else groups.set(key, [point])
    })

    const aggregateByDate = (points: ParsedDataPoint[]) => {
      const timeMap = new Map<
        string,
        {
          date: string
          supplierWeighted: number
          merchantWeighted: number
          totalWeighted: number
          weightSum: number
          total_transactions: number
        }
      >()

      points.forEach((point) => {
        const weight = Math.max(point.total_transactions || 0, 1)
        const entry = timeMap.get(point.date)
        if (entry) {
          entry.supplierWeighted += point.supplierSeconds * weight
          entry.merchantWeighted += point.merchantSeconds * weight
          entry.totalWeighted += point.totalSeconds * weight
          entry.weightSum += weight
          entry.total_transactions += point.total_transactions
          return
        }

        timeMap.set(point.date, {
          date: point.date,
          supplierWeighted: point.supplierSeconds * weight,
          merchantWeighted: point.merchantSeconds * weight,
          totalWeighted: point.totalSeconds * weight,
          weightSum: weight,
          total_transactions: point.total_transactions,
        })
      })

      return Array.from(timeMap.values())
        .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())
        .map((entry) => ({
          date: entry.date,
          dateFormatted: dayjs(entry.date).format('HH:mm'),
          supplierSeconds: entry.supplierWeighted / entry.weightSum,
          merchantSeconds: entry.merchantWeighted / entry.weightSum,
          totalSeconds: entry.totalWeighted / entry.weightSum,
          total_transactions: entry.total_transactions,
        }))
    }

    return Array.from(groups.entries())
      .sort((a, b) => {
        const [merchantA, paymentA] = a[0].split('|||')
        const [merchantB, paymentB] = b[0].split('|||')
        return `${merchantA} ${paymentA}`.localeCompare(`${merchantB} ${paymentB}`)
      })
      .map(([key, points]) => {
        const [merchant_name, payment_method] = key.split('|||')
        const aggregatedPoints = aggregateByDate(points)
        const statuses = Array.from(new Set(points.map((point) => point.status))).sort()

        return {
          key,
          merchant_name,
          payment_method,
          statuses,
          points: aggregatedPoints,
        }
      })
  }, [filteredData])

  const buildCardChartData = useCallback(
    (points: AggregatedDurationPoint[]) => {
      const line = (color: string) => ({
        borderColor: color,
        pointRadius: points.length > 1 ? 0 : 3,
        pointHoverRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: t.surface,
        pointBorderWidth: 1.5,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: t.surface,
        pointHoverBorderWidth: 2,
        tension: 0.25,
      })
      return {
        labels: points.map((d) => d.dateFormatted),
        datasets: [
          {
            label: 'Avg Total Duration',
            data: points.map((d) => d.totalSeconds),
            ...line(t.data),
            backgroundColor: withAlpha(t.data, 0.1),
            fill: true,
            borderWidth: 2,
          },
          {
            label: 'Avg Supplier Duration',
            data: points.map((d) => d.supplierSeconds),
            ...line(t.warning),
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 1.5,
          },
          {
            label: 'Avg Merchant Duration',
            data: points.map((d) => d.merchantSeconds),
            ...line(t.positive),
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 1.5,
            borderDash: [4, 3],
          },
        ],
      }
    },
    [t],
  )

  const buildCardChartOptions = useCallback(
    (points: AggregatedDurationPoint[], merchantName: string, paymentMethod: string) => {
      const axis = chartAxis(t)
      const axisTitle = (text: string) => ({
        display: true,
        text,
        color: t.faint,
        font: { family: t.font, size: 11, weight: 500 as const },
      })
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: points.length > 1,
            position: 'top' as const,
            align: 'end' as const,
            labels: {
              color: t.muted,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 6,
              boxHeight: 6,
              padding: 12,
              font: { family: t.font, size: 12 },
            },
          },
          tooltip: {
            ...chartTooltip(t),
            mode: 'index' as const,
            intersect: false,
            callbacks: {
              title: (items: any[]) => {
                if (!items || !items[0]) return ''
                const idx = items[0].dataIndex
                const point = points[idx]
                if (!point) return ''
                return `${dayjs(point.date).format('ddd, DD MMM YYYY HH:mm')}`
              },
              afterTitle: () => {
                return `${merchantName} • ${paymentMethod.toUpperCase()}`
              },
              label: (item: any) => {
                const idx = item.dataIndex
                const point = points[idx]
                if (!point) return ''

                const labels: Record<string, string> = {
                  'Avg Total Duration': formatSecondsToDuration(Math.round(point.totalSeconds)),
                  'Avg Supplier Duration': formatSecondsToDuration(Math.round(point.supplierSeconds)),
                  'Avg Merchant Duration': formatSecondsToDuration(Math.round(point.merchantSeconds)),
                }
                return ` ${item.dataset.label}: ${labels[item.dataset.label] || formatSecondsToDuration(item.raw)}`
              },
              footer: (items: any[]) => {
                const idx = items[0]?.dataIndex
                const point = points[idx]
                if (!point) return ''
                return `Total Transactions: ${point.total_transactions}`
              },
            },
          },
        },
        scales: {
          y: {
            ...axis,
            beginAtZero: true,
            ticks: {
              ...axis.ticks,
              padding: 6,
              font: { family: t.mono, size: 11 },
              callback: function (value: any) {
                return formatSecondsToDuration(Number(value))
              },
            },
            title: axisTitle('Duration (seconds)'),
          },
          x: {
            ...axis,
            grid: { display: false },
            ticks: {
              ...axis.ticks,
              padding: 6,
              maxTicksLimit: 12,
              font: { family: t.mono, size: 11 },
              maxRotation: 0,
              minRotation: 0,
            },
            title: axisTitle('Time (per 10 minutes)'),
          },
        },
        interaction: {
          intersect: false,
          mode: 'index' as const,
        },
        animation: {
          duration: 400,
          easing: 'easeOutQuart' as const,
        },
      }
    },
    [t],
  )

  // === Stats Summary ===
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null

    const totalDurations = filteredData.map((d) => d.totalSeconds)
    const avgTotal = totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length
    const maxTotal = Math.max(...totalDurations)
    const minTotal = Math.min(...totalDurations)
    const totalTrx = filteredData.reduce((sum, d) => sum + d.total_transactions, 0)

    return {
      avgTotal: formatSecondsToDuration(Math.round(avgTotal)),
      maxTotal: formatSecondsToDuration(maxTotal),
      minTotal: formatSecondsToDuration(minTotal),
      totalTransactions: totalTrx,
      dataPoints: filteredData.length,
    }
  }, [filteredData])

  // === Render ===
  return (
    <>
      <div className='mon-filter' role='search' aria-label='Duration filters'>
        <div className='mon-filter-field mon-filter-range'>
          <span className='mon-filter-label'>Date range</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]])
              }
            }}
            format='YYYY-MM-DD'
            style={{ width: '100%' }}
          />
        </div>
        <div className='mon-filter-field'>
          <span className='mon-filter-label'>Merchant</span>
          <Select
            value={selectedMerchant}
            onChange={setSelectedMerchant}
            style={{ width: '100%' }}
            options={[{ value: 'all', label: 'All Merchants' }, ...merchants.map((m) => ({ value: m, label: m }))]}
          />
        </div>
        <div className='mon-filter-field'>
          <span className='mon-filter-label'>Payment Method</span>
          <Select
            value={selectedPaymentMethod}
            onChange={setSelectedPaymentMethod}
            style={{ width: '100%' }}
            options={[
              { value: 'all', label: 'All Payment Methods' },
              ...paymentMethods.map((m) => ({ value: m, label: m.toUpperCase() })),
            ]}
          />
        </div>
        <div className='mon-filter-field'>
          <span className='mon-filter-label'>Status</span>
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: '100%' }}
            options={[
              { value: 'all', label: 'All Status' },
              ...statuses.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              })),
            ]}
          />
        </div>
        <span className='mon-panel-meta mon-filter-actions'>Avg completion duration per 10 min · auto-refresh 10 min</span>
      </div>

      {stats && (
        <div className='mon-dur-kpis'>
          <div>
            <span>Avg Duration</span>
            <strong>{stats.avgTotal}</strong>
          </div>
          <div>
            <span>Max Duration</span>
            <strong>{stats.maxTotal}</strong>
          </div>
          <div>
            <span>Min Duration</span>
            <strong>{stats.minTotal}</strong>
          </div>
          <div>
            <span>Total Transactions</span>
            <strong>{stats.totalTransactions.toLocaleString()}</strong>
          </div>
          <div>
            <span>Data Points</span>
            <strong>{stats.dataPoints}</strong>
          </div>
        </div>
      )}

      {loading && (
        <div className='mon-dur-state'>
          <Spin />
          <span>Loading duration data...</span>
        </div>
      )}

      {error && <div className='mon-dur-state error'>{error}</div>}

      {!loading && !error && filteredData.length === 0 && (
        <div className='mon-dur-state'>No data available for the selected filters</div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className='mon-dur-grid'>
          {groupedCards.map((group) => {
            const cardData = buildCardChartData(group.points)
            const cardOptions = buildCardChartOptions(group.points, group.merchant_name, group.payment_method)
            const totalTransactions = group.points.reduce((sum, point) => sum + point.total_transactions, 0)
            const totalDurations = group.points.map((point) => point.totalSeconds)
            const avgTotal = totalDurations.reduce((sum, value) => sum + value, 0) / totalDurations.length
            const maxTotal = Math.max(...totalDurations)
            const minTotal = Math.min(...totalDurations)

            return (
              <div className='mon-panel mon-dur-card' key={group.key}>
                <div className='mon-panel-head'>
                  <div className='mon-panel-title'>
                    <h4>{group.merchant_name}</h4>
                    <small>{group.payment_method.toUpperCase()}</small>
                  </div>
                  <div className='mon-dur-card-tags'>
                    <span>{group.points.length} points</span>
                    <span>{group.statuses.length === 1 ? group.statuses[0] : `${group.statuses.length} statuses`}</span>
                  </div>
                </div>

                <div className='mon-dur-kpis small'>
                  <div>
                    <span>Avg Duration</span>
                    <strong>{formatSecondsToDuration(Math.round(avgTotal))}</strong>
                  </div>
                  <div>
                    <span>Max Duration</span>
                    <strong>{formatSecondsToDuration(Math.round(maxTotal))}</strong>
                  </div>
                  <div>
                    <span>Min Duration</span>
                    <strong>{formatSecondsToDuration(Math.round(minTotal))}</strong>
                  </div>
                  <div>
                    <span>Total Transactions</span>
                    <strong>{totalTransactions.toLocaleString('id-ID')}</strong>
                  </div>
                </div>

                <div className='mon-dur-chart'>
                  <Line data={cardData} options={cardOptions} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

export default DurationChart
