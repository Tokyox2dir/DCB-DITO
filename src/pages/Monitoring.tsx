import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Col, DatePicker, Row, Select, Space, Typography } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import MonitoringKpiCards from '../components/MonitoringKpiCards'
import VolumePerHourChart, { MetricStatus, TrafficSeries } from '../components/VolumePerHourChart'
import TrafficPerClient from '../components/TrafficPerClient'
import StatusBreakdown from '../components/StatusBreakdown'
import ClientPerformance from '../components/ClientPerformance'
import PaymentMethodPerformance from '../components/PaymentMethodPerformance'
import AlertMonitor from '../components/AlertMonitor'
import MonitoringTransactionList from '../components/MonitoringTransactionList'
import { useAuth } from '../provider/AuthProvider'
import { useMerchants } from '../context/MerchantContext'
import {
  buildRecentHoursPatch,
  fetchTodayLastSeen,
  overlayTrafficWithTransactions,
  type LiveTrxRow,
} from '../utils/liveTrafficFromTransactions'

dayjs.extend(utc)

const { Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const REFRESH_MS = 30_000
const LIVE_WINDOW_MINUTES = 10
const LIVE_PAGE_SIZE = 500
const LIVE_MAX_PAGES = 2

const paymentMethods = [
  { name: 'All', value: '' },
  { name: 'Xl', value: 'xl_airtime' },
  { name: 'Telkomsel', value: 'telkomsel_airtime' },
  { name: 'Tri', value: 'three_airtime' },
  { name: 'Indosat', value: 'indosat_airtime' },
  { name: 'Smartfren', value: 'smartfren_airtime' },
  { name: 'Gopay', value: 'gopay' },
  { name: 'Shopeepay', value: 'shopeepay' },
  { name: 'Qris', value: 'qris' },
  { name: 'Ovo', value: 'ovo' },
  { name: 'Dana', value: 'dana' },
  { name: 'Va Bca', value: 'va_bca' },
]

type Filters = {
  dateRange: [Dayjs, Dayjs] | null
  merchant: string
  status: MetricStatus
  paymentMethod: string
}

const emptyFilters: Filters = {
  dateRange: null,
  merchant: '',
  status: '',
  paymentMethod: '',
}

export default function Monitoring() {
  const { token, apiUrl } = useAuth()
  const { merchants, error: merchantsError } = useMerchants()

  const [draft, setDraft] = useState<Filters>(emptyFilters)
  const [applied, setApplied] = useState<Filters>(emptyFilters)

  const [series, setSeries] = useState<TrafficSeries[]>([])
  const [alertSeries, setAlertSeries] = useState<TrafficSeries[]>([])
  const [activity, setActivity] = useState<Record<string, number>>({})
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({})
  const [failedRows, setFailedRows] = useState<
    Array<{ payment_method?: string; created_at?: string; status_code?: number }> | null
  >(null)
  const [kpi, setKpi] = useState({ total: 0, success: 0, pending: 0, waiting: 0, failed: 0 })
  const [todayTrxRows, setTodayTrxRows] = useState<LiveTrxRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [referenceNow, setReferenceNow] = useState<Dayjs>(() => dayjs())
  const trxWrapRef = useRef<HTMLDivElement>(null)
  const [trxHeight, setTrxHeight] = useState<number | null>(null)
  const loadGenRef = useRef(0)
  const loadingRef = useRef(false)
  const liveOverlayRef = useRef<{
    scope: string
    start: Dayjs
    rows: Map<string, LiveTrxRow>
  } | null>(null)

  useEffect(() => {
    const el = trxWrapRef.current
    if (!el) return

    const syncHeight = () => {
      const next = Math.round(el.getBoundingClientRect().height)
      setTrxHeight((prev) => (prev === next ? prev : next))
    }

    syncHeight()
    const ro = new ResizeObserver(syncHeight)
    ro.observe(el)
    return () => ro.disconnect()
  }, [refreshKey, applied])

  const load = useCallback(async () => {
    if (!token || !apiUrl || loadingRef.current) return
    loadingRef.current = true
    const gen = ++loadGenRef.current

    let bgAuthHeaders: Record<string, string> | null = null
    let bgTrxDateParams: {
      start_date: string
      end_date: string
      app_id?: string
      payment_method?: string
      _ts: number
    } | null = null
    let bgFineData: TrafficSeries[] | null = null
    let bgLiveScope = ''
    let bgIsLiveRange = false

    try {
      setLoading(true)
      setError(null)

      const now = dayjs()
      setReferenceNow(now)

      const end =
        applied.dateRange?.[1] && !applied.dateRange[1].isSame(now, 'day')
          ? applied.dateRange[1].endOf('day')
          : now
      const start = applied.dateRange?.[0]
        ? applied.dateRange[0].startOf('day').subtract(1, 'day')
        : now.startOf('day').subtract(1, 'day')
      const dayStart = applied.dateRange?.[0]
        ? applied.dateRange[0].startOf('day')
        : now.startOf('day')

      const appIds = (() => {
        if (!applied.merchant) return ''
        const merchant = merchants.find((m) => m.client_name === applied.merchant)
        if (!merchant) return ''
        return merchant.apps.map((app) => app.appid).filter(Boolean).join(',')
      })()

      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      const trxDateParams = {
        start_date: dayStart.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        end_date: end.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        app_id: appIds || undefined,
        payment_method: applied.paymentMethod || undefined,
        _ts: now.valueOf(),
      }
      bgIsLiveRange = !applied.dateRange?.[1] || applied.dateRange[1].isSame(now, 'day')
      bgLiveScope = JSON.stringify([
        dayStart.format('YYYY-MM-DD'),
        appIds,
        applied.paymentMethod,
        applied.merchant,
      ])

      const trxCount = (status?: number) =>
        axios
          .get(`${apiUrl}/transactions`, {
            headers: authHeaders,
            params: { page: 1, limit: 1, ...trxDateParams, status },
          })
          .catch((e) => {
            console.warn('KPI count fetch failed:', status, e)
            return { data: { pagination: { total_items: 0 } } }
          })

      // Same source as Transaction List → live KPI / Status.
      const kpiPromise = Promise.all([
        trxCount(),
        trxCount(1000),
        trxCount(1001),
        trxCount(1003),
        trxCount(1005),
      ]).then((res) => {
        if (gen !== loadGenRef.current) return res
        const [totalRes, successRes, pendingRes, waitingRes, failedRes] = res
        setKpi({
          total: totalRes.data?.pagination?.total_items || 0,
          success: successRes.data?.pagination?.total_items || 0,
          pending: pendingRes.data?.pagination?.total_items || 0,
          waiting: waitingRes.data?.pagination?.total_items || 0,
          failed: failedRes.data?.pagination?.total_items || 0,
        })
        setUpdatedAt(dayjs().format('HH:mm:ss'))
        return res
      })

      const trafficPromise = axios
        .get(`${apiUrl}/traffic/monitoring/hourly`, {
          headers: authHeaders,
          params: {
            start: start.format('YYYY-MM-DDTHH:mm:ssZ'),
            end: end.format('YYYY-MM-DDTHH:mm:ssZ'),
            _ts: now.valueOf(),
          },
        })
        .catch((e) => {
          console.warn('Hourly traffic fetch failed:', e)
          return { data: { data: [] as TrafficSeries[] } }
        })

      // Fine traffic for live volume / today charts (hourly often lags current hour).
      const finePromise = axios
        .get(`${apiUrl}/traffic/monitoring`, {
          headers: authHeaders,
          params: {
            start: dayStart.format('YYYY-MM-DDTHH:mm:ssZ'),
            end: end.format('YYYY-MM-DDTHH:mm:ssZ'),
            _ts: now.valueOf(),
          },
        })
        .catch((e) => {
          console.warn('Fine traffic monitoring fetch failed, falling back to hourly:', e)
          return null
        })

      const [trafficRes, fineRes] = await Promise.all([trafficPromise, finePromise])

      if (gen !== loadGenRef.current) return

      const hourlyData: TrafficSeries[] = trafficRes.data?.data || []
      const fineData: TrafficSeries[] = fineRes?.data?.data || hourlyData

      const nextToday: Record<string, number> = {}
      const todayStartMs = dayStart.valueOf()
      const endMs = end.valueOf()
      hourlyData.forEach((s) => {
        const key = `${s.merchant_name || s.client_uid || 'Unknown'}::${s.payment_method || '-'}`
        ;(s.data || []).forEach((p) => {
          const ts = dayjs(p.timestamp).valueOf()
          if (Number.isNaN(ts) || ts < todayStartMs || ts > endMs) return
          const total = (p.total ?? p.success + p.pending + p.failed) || 0
          if (total > 0) nextToday[key] = (nextToday[key] || 0) + total
        })
      })

      bgAuthHeaders = authHeaders
      bgTrxDateParams = trxDateParams
      bgFineData = fineData

      setSeries(hourlyData)
      setAlertSeries(fineData)
      setTodayCounts(nextToday)
      setReferenceNow(dayjs())
      setUpdatedAt(dayjs().format('HH:mm:ss'))
      setRefreshKey((k) => k + 1)

      void kpiPromise
    } catch (e) {
      if (gen !== loadGenRef.current) return
      console.error('Monitoring overview fetch error:', e)
      setError('Gagal memuat overview monitoring')
    } finally {
      if (gen === loadGenRef.current) setLoading(false)
      loadingRef.current = false
    }

    // Alert last-seen scan — background, does not block card refresh.
    if (
      gen !== loadGenRef.current ||
      !bgAuthHeaders ||
      !bgTrxDateParams ||
      !bgFineData ||
      !bgIsLiveRange
    )
      return
    try {
      const liveEnd = dayjs()
      // Keep the overlay boundary stable and aligned with aggregate minute buckets.
      const liveStart = liveEnd.subtract(LIVE_WINDOW_MINUTES, 'minute').startOf('minute')
      if (!liveOverlayRef.current || liveOverlayRef.current.scope !== bgLiveScope) {
        liveOverlayRef.current = { scope: bgLiveScope, start: liveStart, rows: new Map() }
      }

      const { activity: nextActivity, rows: recentRows, complete } = await fetchTodayLastSeen(
        apiUrl,
        bgAuthHeaders,
        {
          ...bgTrxDateParams,
          start_date: liveStart.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
          end_date: liveEnd.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        },
        {
          maxPages: LIVE_MAX_PAGES,
          pageSize: LIVE_PAGE_SIZE,
        },
      )

      if (gen !== loadGenRef.current) return

      if (complete) {
        const overlay = liveOverlayRef.current
        recentRows.forEach((row, index) => {
          const key =
            row.u_id || `${row.merchant_name || ''}:${row.payment_method || ''}:${row.created_at || ''}:${index}`
          overlay.rows.set(key, row)
        })
        const accumulatedRows = Array.from(overlay.rows.values())
        setTodayTrxRows(accumulatedRows)
        setFailedRows(accumulatedRows.filter((row) => Number(row.status_code) === 1005))
        setAlertSeries(
          overlayTrafficWithTransactions(bgFineData, accumulatedRows, { start: overlay.start, end: liveEnd }),
        )
        setReferenceNow(liveEnd)
      } else {
        console.warn('Live overlay skipped: recent transaction window exceeds the safe fetch limit')
      }
      setActivity((prev) => {
        const merged = { ...prev }
        Object.entries(nextActivity).forEach(([key, ts]) => {
          const p = merged[key]
          merged[key] = p ? Math.max(p, ts) : ts
        })
        return merged
      })
      setTodayCounts((prev) => {
        const merged = { ...prev }
        Object.keys(nextActivity).forEach((key) => {
          if (merged[key] == null) merged[key] = 1
        })
        return merged
      })
    } catch (activityErr) {
      console.warn('Activity / last-seen fetch failed (cards already live):', activityErr)
    }
  }, [apiUrl, token, applied.dateRange, applied.merchant, applied.paymentMethod, merchants])

  useEffect(() => {
    load()
    const id = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load])

  const filteredSeries = useMemo(() => {
    return series.filter((s) => {
      if (applied.merchant && s.merchant_name !== applied.merchant) return false
      if (applied.paymentMethod && s.payment_method !== applied.paymentMethod) return false
      return true
    })
  }, [series, applied.merchant, applied.paymentMethod])

  const filteredFineSeries = useMemo(() => {
    return alertSeries.filter((s) => {
      if (applied.merchant && s.merchant_name !== applied.merchant) return false
      if (applied.paymentMethod && s.payment_method !== applied.paymentMethod) return false
      return true
    })
  }, [alertSeries, applied.merchant, applied.paymentMethod])

  const perfSeries = filteredFineSeries.length ? filteredFineSeries : filteredSeries

  const hourPatch = useMemo(() => {
    if (!todayTrxRows.length) return null
    return buildRecentHoursPatch(todayTrxRows, {
      now: referenceNow,
      hours: 6,
      status: applied.status,
    })
  }, [todayTrxRows, referenceNow, applied.status])

  const handleFilter = () => setApplied({ ...draft })
  const handleReset = () => {
    setDraft(emptyFilters)
    setApplied(emptyFilters)
  }

  const handleKpiStatus = (status: MetricStatus) => {
    const next = { ...draft, status }
    setDraft(next)
    setApplied(next)
  }

  return (
    <section className='dash-page mon-page'>
      <header className='dash-header'>
        <div>
          <h1 className='dash-title'>Monitoring</h1>
          <p className='dash-subtitle'>Volume hari ini vs kemarin dan traffic per client.</p>
        </div>
        <div className='dash-live'>
          {updatedAt ? `Updated ${updatedAt} · refresh ${REFRESH_MS / 1000}s` : 'Live overview'}
        </div>
      </header>

      <div className='mon-filter'>
        <Row gutter={[16, 12]}>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Text className='mon-filter-label'>Date Range</Text>
            <RangePicker
              value={draft.dateRange}
              onChange={(dates) => setDraft((prev) => ({ ...prev, dateRange: dates as [Dayjs, Dayjs] | null }))}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Text className='mon-filter-label'>Merchant</Text>
            <Select
              showSearch
              allowClear
              placeholder='All merchants'
              value={draft.merchant || undefined}
              onChange={(value) => setDraft((prev) => ({ ...prev, merchant: value || '' }))}
              style={{ width: '100%' }}
              optionFilterProp='children'
              filterOption={(input, option: any) =>
                (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              loading={!merchants.length && !merchantsError}
            >
              {merchants.map((m) => (
                <Option key={m.u_id} value={m.client_name}>
                  {m.client_name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Text className='mon-filter-label'>Status</Text>
            <Select
              allowClear
              placeholder='All statuses'
              value={draft.status || undefined}
              onChange={(value) => setDraft((prev) => ({ ...prev, status: (value || '') as MetricStatus }))}
              style={{ width: '100%' }}
            >
              <Option value='success'>Success</Option>
              <Option value='pending'>Pending</Option>
              <Option value='waiting'>Waiting</Option>
              <Option value='failed'>Failed</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={12} lg={6}>
            <Text className='mon-filter-label'>Payment Method</Text>
            <Select
              showSearch
              allowClear
              placeholder='All methods'
              value={draft.paymentMethod || undefined}
              onChange={(value) => setDraft((prev) => ({ ...prev, paymentMethod: value || '' }))}
              style={{ width: '100%' }}
              optionFilterProp='children'
            >
              {paymentMethods
                .filter((pm) => pm.value)
                .map((pm) => (
                  <Option key={pm.value} value={pm.value}>
                    {pm.name}
                  </Option>
                ))}
            </Select>
          </Col>
        </Row>
        <div className='mon-filter-actions'>
          <Space>
            <Button type='primary' onClick={handleFilter}>
              Filter
            </Button>
            <Button onClick={handleReset}>Reset</Button>
          </Space>
        </div>
      </div>

      {error && <div className='mon-error'>{error}</div>}

      <MonitoringKpiCards kpi={kpi} loading={loading} onSelectStatus={handleKpiStatus} />

      <div className='mon-top-grid'>
        <VolumePerHourChart
          key={`vol-${refreshKey}`}
          series={filteredSeries}
          fineSeries={filteredFineSeries}
          hourPatch={hourPatch}
          loading={loading}
          status={applied.status}
          referenceNow={referenceNow}
        />
        <StatusBreakdown key={`status-${refreshKey}`} kpi={kpi} loading={loading} />
        <TrafficPerClient
          key={`tpc-${refreshKey}`}
          series={filteredSeries}
          fineSeries={filteredFineSeries}
          loading={loading}
          status={applied.status}
          referenceNow={referenceNow}
        />
      </div>

      <div className='mon-bottom-grid'>
        <div className='mon-bottom-trx' ref={trxWrapRef}>
          <MonitoringTransactionList
            dateRange={applied.dateRange}
            merchant={applied.merchant}
            status={applied.status}
            paymentMethod={applied.paymentMethod}
            merchants={merchants}
            refreshKey={refreshKey}
          />
        </div>
        <div
          className='mon-bottom-alert'
          style={trxHeight ? { height: trxHeight, maxHeight: trxHeight } : undefined}
        >
          <AlertMonitor
            activity={activity}
            todayCounts={todayCounts}
            failedRows={failedRows}
            loading={loading}
            referenceNow={referenceNow}
          />
        </div>
      </div>

      <div className='mon-perf-grid' key={`perf-${refreshKey}`}>
        <ClientPerformance series={perfSeries} loading={loading} referenceNow={referenceNow} />
        <PaymentMethodPerformance series={perfSeries} loading={loading} referenceNow={referenceNow} />
      </div>
    </section>
  )
}
