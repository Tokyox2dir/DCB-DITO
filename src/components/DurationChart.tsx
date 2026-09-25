import { useColorScheme } from '@mui/material/styles'
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, Select, Spin, Empty, DatePicker, Tag, Space } from 'antd'
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
  const { mode, systemMode } = useColorScheme()
  const chartText = (mode === 'system' ? systemMode : mode) === 'light' ? '#52637a' : '#94a3b8'
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

  const buildCardChartData = useCallback((points: AggregatedDurationPoint[]) => {
    return {
      labels: points.map((d) => d.dateFormatted),
      datasets: [
        {
          label: 'Avg Total Duration',
          data: points.map((d) => d.totalSeconds),
          borderColor: '#3b74f0',
          backgroundColor: 'rgba(59, 116, 240, 0.08)',
          tension: 0.4,
          fill: true,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 7,
          pointBackgroundColor: '#3b74f0',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#3b74f0',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        },
        {
          label: 'Avg Supplier Duration',
          data: points.map((d) => d.supplierSeconds),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.06)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#f59e0b',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#f59e0b',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        },
        {
          label: 'Avg Merchant Duration',
          data: points.map((d) => d.merchantSeconds),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.06)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#10b981',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
        },
      ],
    }
  }, [])

  const buildCardChartOptions = useCallback(
    (points: AggregatedDurationPoint[], merchantName: string, paymentMethod: string) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: points.length > 1,
          position: 'top' as const,
          labels: {
            color: chartText,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { size: 13, weight: 500 as const },
          },
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: 'rgba(22, 24, 27, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(59, 116, 240, 0.3)',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 14,
          titleFont: { size: 13, weight: 600 as const },
          bodyFont: { size: 12 },
          bodySpacing: 6,
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
              return `  ${item.dataset.label}: ${labels[item.dataset.label] || formatSecondsToDuration(item.raw)}`
            },
            afterBody: (items: any[]) => {
              const idx = items[0]?.dataIndex
              const point = points[idx]
              if (!point) return ''
              return `\n  📦 Total Transactions: ${point.total_transactions}`
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            padding: 12,
            font: { size: 12 },
            color: chartText,
            callback: function (value: any) {
              return formatSecondsToDuration(Number(value))
            },
          },
          title: {
            display: true,
            text: 'Duration (seconds)',
            font: { size: 12, weight: 500 as const },
            color: chartText,
            padding: { bottom: 8 },
          },
        },
        x: {
          grid: {
            color: 'rgba(148, 163, 184, 0.06)',
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            padding: 10,
            maxTicksLimit: 12,
            font: { size: 12 },
            color: chartText,
            maxRotation: 45,
            minRotation: 0,
          },
          title: {
            display: true,
            text: 'Time (per 10 minutes)',
            font: { size: 12, weight: 500 as const },
            color: chartText,
            padding: { top: 8 },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart' as const,
      },
    }),
    [chartText],
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
    <div style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: 16,
          border: '1px solid transparent',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.03)',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        {/* Title + Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                background: 'var(--sf-sky-bar)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.3px',
              }}
            >
              ⏱️ Transaction Duration Monitoring
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--dash-muted)', fontSize: 13 }}>
              Average transaction completion duration (per 10 minutes)
              <Tag
                color='blue'
                style={{ marginLeft: 8, fontSize: 11 }}
              >
                Auto-refresh 10 min
              </Tag>
            </p>
          </div>

          <div>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]])
                }
              }}
              format='YYYY-MM-DD'
              style={{ minWidth: 260 }}
            />
          </div>
        </div>

        {/* Filters Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            padding: '16px',
            background: 'var(--sf-card-2)',
            borderRadius: 12,
            border: '1px solid transparent',
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dash-muted)', marginBottom: 6 }}>
              Merchant
            </label>
            <Select
              value={selectedMerchant}
              onChange={setSelectedMerchant}
              style={{ width: '100%' }}
              options={[
                { value: 'all', label: 'All Merchants' },
                ...merchants.map((m) => ({ value: m, label: m })),
              ]}
            />
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dash-muted)', marginBottom: 6 }}>
              Payment Method
            </label>
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

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dash-muted)', marginBottom: 6 }}>
              Status
            </label>
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
        </div>

        {/* Stats Summary */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--sf-sky)',
                border: '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dash-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avg Duration
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dash-accent)', marginTop: 4 }}>
                {stats.avgTotal}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--sf-rose)',
                border: '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-bad)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Max Duration
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-danger)', marginTop: 4 }}>
                {stats.maxTotal}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'color-mix(in srgb, var(--sf-good) 14%, var(--sf-card))',
                border: '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-good)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Min Duration
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-success)', marginTop: 4 }}>
                {stats.minTotal}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--sf-peach)',
                border: '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-warn)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Transactions
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-warning)', marginTop: 4 }}>
                {stats.totalTransactions.toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: 'var(--sf-card-2)',
                border: '1px solid transparent',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dash-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Data Points
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dash-text)', marginTop: 4 }}>
                {stats.dataPoints}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 0 12px',
            }}
          >
            <Space direction='vertical' align='center'>
              <Spin size='large' />
              <span style={{ color: 'var(--dash-muted)', fontSize: 13 }}>Loading duration data...</span>
            </Space>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 8px' }}>
            <Empty description={<span style={{ color: 'var(--sf-bad)' }}>{error}</span>} />
          </div>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 8px' }}>
            <Empty description='No data available for the selected filters' />
          </div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 16,
              alignItems: 'stretch',
            }}
          >
            {groupedCards.map((group) => {
              const cardData = buildCardChartData(group.points)
              const cardOptions = buildCardChartOptions(group.points, group.merchant_name, group.payment_method)
              const totalTransactions = group.points.reduce((sum, point) => sum + point.total_transactions, 0)
              const totalDurations = group.points.map((point) => point.totalSeconds)
              const avgTotal = totalDurations.reduce((sum, value) => sum + value, 0) / totalDurations.length
              const maxTotal = Math.max(...totalDurations)
              const minTotal = Math.min(...totalDurations)

              return (
                <Card
                  key={group.key}
                  style={{
                    borderRadius: 16,
                    border: '1px solid transparent',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.03)',
                    height: '100%',
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      marginBottom: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 18,
                          fontWeight: 700,
                          color: 'var(--dash-text)',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {group.merchant_name}
                      </h3>
                      <div style={{ marginTop: 4, color: 'var(--dash-accent)', fontSize: 13, fontWeight: 600 }}>
                        {group.payment_method.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                      <Tag color='blue' style={{ margin: 0 }}>
                        {group.points.length} points
                      </Tag>
                      <Tag color='geekblue' style={{ margin: 0 }}>
                        {group.statuses.length === 1 ? group.statuses[0] : `${group.statuses.length} statuses`}
                      </Tag>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--sf-sky)',
                        border: '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--dash-accent)', textTransform: 'uppercase' }}>
                        Avg Duration
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dash-accent)', marginTop: 4 }}>
                        {formatSecondsToDuration(Math.round(avgTotal))}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--sf-rose)',
                        border: '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-bad)', textTransform: 'uppercase' }}>
                        Max Duration
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-danger)', marginTop: 4 }}>
                        {formatSecondsToDuration(maxTotal)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'color-mix(in srgb, var(--sf-good) 14%, var(--sf-card))',
                        border: '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-good)', textTransform: 'uppercase' }}>
                        Min Duration
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-success)', marginTop: 4 }}>
                        {formatSecondsToDuration(minTotal)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: 'var(--sf-peach)',
                        border: '1px solid transparent',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-warn)', textTransform: 'uppercase' }}>
                        Total Transactions
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--theme-warning)', marginTop: 4 }}>
                        {totalTransactions.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <div style={{ position: 'relative', height: 320 }}>
                    <Line data={cardData} options={cardOptions} />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DurationChart
