import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Row, Col, Statistic, Carousel, Tag, Button, Input } from 'antd'
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
import { useColorScheme } from '@mui/material/styles'
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
    return { isNormal: true, mean: 0, stdDev: 0, reason: 'Tidak ada data' }
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

const TransactionChartCard: React.FC = () => {
  const { token, apiUrl } = useAuth()
  const { mode, systemMode } = useColorScheme()
  const isDark = ((mode === 'system' ? systemMode : mode) || 'dark') !== 'light'
  const theme = {
    text: isDark ? '#e9ecf2' : '#20242c',
    muted: isDark ? '#a8b8cc' : '#626a78',
    card: isDark ? '#1d2027' : '#ffffff',
    header: isDark ? '#272b34' : '#f5f6f8',
    border: isDark ? '#363b46' : '#e0e3e9',
    abnormalBg: isDark ? '#3a2020' : '#fff1f0',
    abnormalHeader: isDark ? '#8f3030' : '#ffccc7',
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  }
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
        setError('Gagal memuat data monitoring')
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
        borderColor: '#faad14',
        backgroundColor: 'rgba(250, 173, 20, 0.1)',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      {
        label: 'Success',
        data: data.data.success,
        borderColor: '#52c41a',
        backgroundColor: 'rgba(82, 196, 26, 0.1)',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
      },
      {
        label: 'Failed',
        data: data.data.failed,
        borderColor: '#ff4d4f',
        backgroundColor: 'rgba(255, 77, 79, 0.1)',
        tension: 0.4,
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
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
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
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
        grid: {
          color: theme.grid,
        },
        ticks: {
          color: theme.muted,
          stepSize: 1,
          callback: function (value: any) {
            return Number(value) % 1 === 0 ? value : null
          },
          font: { size: 14 },
        },
      },
      x: {
        grid: {
          color: theme.grid,
        },
        ticks: {
          color: theme.muted,
          padding: 10,
          maxTicksLimit: 6,
          font: {
            size: 14,
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  }),
    [theme.grid, theme.muted],
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

  return (
    <div style={{ padding: '30px', width: '100%' }}>
      <h2
        style={{
          marginBottom: '20px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#1890ff',
        }}
      >
        Transaction Charts by Merchant & Payment Method
      </h2>

      {error && <div style={{ color: '#ff4d4f', textAlign: 'center', marginBottom: 16 }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', marginBottom: 16 }}>Loading monitoring data...</div>}

      <div style={{ maxWidth: 480, margin: '0 auto 16px auto' }}>
        <Input
          allowClear
          placeholder='Cari merchant...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size='large'
        />
      </div>

      <div style={{ position: 'relative' }}>
        {/* Left Arrow Button */}
        <Button
          type='primary'
          shape='circle'
          icon={<LeftOutlined />}
          onClick={handlePrev}
          style={{
            position: 'absolute',
            left: '-50px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        {/* Right Arrow Button */}
        <Button
          type='primary'
          shape='circle'
          icon={<RightOutlined />}
          onClick={handleNext}
          style={{
            position: 'absolute',
            right: '-50px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

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
              <Row gutter={[16, 16]}>
                {slide.map((item, index) => {
                  const latestStats = getLatestStats(item)
                  const avgs = getAvgStats(item)
                  const isAbnormal = item.isNormal === false
                  // const isHigo = item.merchant === 'HIGO GAME PTE LTD'

                  return (
                    <Col xs={24} sm={24} md={8} key={index}>
                      <Card
                        className='mb-2 mx-1'
                        title={
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 'bold',
                              color: theme.text,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span className='text-lg'>
                              {isAbnormal && <span style={{ marginRight: '8px', fontSize: '16px' }}>⚠️</span>}
                              {item.merchant} - {item.paymentMethod}
                            </span>
                            {isAbnormal && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Tag
                                  color='red'
                                  style={{
                                    color: 'var(--theme-danger)',
                                    border: '1px solid #2563eb',
                                    background: 'var(--theme-danger-bg)',
                                    fontSize: '10px',
                                    padding: '0 6px',
                                    height: '20px',
                                    lineHeight: '18px',
                                  }}
                                >
                                  ABNORMAL
                                </Tag>
                              </div>
                            )}
                          </div>
                        }
                        style={{
                          height: '500px',
                          boxShadow: isAbnormal ? '0 4px 12px rgba(255,77,79,0.3)' : '0 4px 12px rgba(0,0,0,0.08)',
                          borderRadius: '12px',
                          border: isAbnormal ? '2px solid #ff4d4f' : `1px solid ${theme.border}`,
                          background: theme.card,
                        }}
                        styles={{
                          header: {
                            backgroundColor: isAbnormal ? theme.abnormalHeader : theme.header,
                            borderBottom: isAbnormal ? '1px solid #2563eb' : `1px solid ${theme.border}`,
                            borderRadius: '12px 12px 0 0',
                            padding: '12px 16px',
                            color: theme.text,
                          },
                        }}
                        bodyStyle={{
                          padding: '16px',
                          height: 'calc(100% - 60px)',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: isAbnormal ? theme.abnormalBg : theme.card,
                          color: theme.text,
                        }}
                      >
                        <div style={{ marginBottom: '16px' }}>
                          <Row gutter={[8, 8]}>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Latest Pending:</span>
                                <Statistic
                                  value={latestStats.latestPending}
                                  valueStyle={{
                                    color: isAbnormal ? '#d4380d' : '#faad14',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Latest Success:</span>
                                <Statistic
                                  value={latestStats.latestSuccess}
                                  valueStyle={{
                                    color: isAbnormal ? '#389e0d' : '#52c41a',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Latest Failed:</span>
                                <Statistic
                                  value={latestStats.latestFailed}
                                  valueStyle={{
                                    color: isAbnormal ? '#cf1322' : '#ff4d4f',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                          </Row>
                        </div>
                        {isAbnormal && item.reasons && (
                          <div style={{ marginBottom: 12, color: '#cf1322', fontSize: 16, fontWeight: 'bold' }}>
                            {item.reasons.success && <div>Success: {item.reasons.success}</div>}
                            {item.reasons.pending && <div>Pending: {item.reasons.pending}</div>}
                            {item.reasons.failed && <div>Failed: {item.reasons.failed}</div>}
                          </div>
                        )}
                        <div style={{ marginBottom: '8px' }}>
                          <Row gutter={[8, 8]}>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Avg Pending:</span>
                                <Statistic
                                  value={avgs.avgPending}
                                  valueStyle={{
                                    color: isAbnormal ? '#d4380d' : '#faad14',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Avg Success:</span>
                                <Statistic
                                  value={avgs.avgSuccess}
                                  valueStyle={{
                                    color: isAbnormal ? '#389e0d' : '#52c41a',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                            <Col span={8}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 14 }}>Avg Failed:</span>
                                <Statistic
                                  value={avgs.avgFailed}
                                  valueStyle={{
                                    color: isAbnormal ? '#cf1322' : '#ff4d4f',
                                    fontSize: '18px',
                                    fontWeight: isAbnormal ? 'bold' : 'normal',
                                  }}
                                />
                              </div>
                            </Col>
                          </Row>
                        </div>
                        <div style={{ flex: 1, minHeight: '310px' }}>
                          <Line data={createChartData(item)} options={chartOptions} />
                        </div>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </div>
          ))}
        </Carousel>
      </div>
    </div>
  )
}

export default TransactionChartCard
