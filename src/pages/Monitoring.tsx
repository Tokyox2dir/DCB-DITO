import { paymentMethods } from '../utils/paymentMethods'
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
import { fetchTodayLastSeen, overlayTrafficBuckets, type LiveTrxRow } from '../utils/liveTrafficFromTransactions'

dayjs.extend(utc)

const { Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const REFRESH_MS = 30_000
const LIVE_PAGE_SIZE = 500
const LIVE_MAX_PAGES = 6
// Re-read slightly behind the newest row seen, for rows committed late; duplicates are merged by u_id.
const LIVE_OVERLAP_MS = 15_000
// Raw rows kept for the failed-spike alerts (two 5-minute windows plus margin).
const LIVE_KEEP_MINUTES = 11
// Never rebuild more than this from raw transactions; beyond it the aggregate is shown as is.
const LIVE_MAX_GAP_MINUTES = 30
// Fine traffic: refetch only the recent tail each refresh, plus a periodic full resync
// so late status changes (pending -> success) in older buckets are picked up.
const FINE_BUCKET_MINUTES = 10
const FINE_TAIL_MINUTES = 30
const FINE_FULL_RESYNC_MS = 10 * 60_000

/** The aggregate only fills a bucket once it has closed: the open bucket starts here. */
function aggregateCoverageEnd(series: TrafficSeries[]): number | null {
  let last = -Infinity
  series.forEach((s) =>
    (s.data || []).forEach((p) => {
      const total = p.total ?? p.success + p.pending + p.failed
      if (total > 0) last = Math.max(last, dayjs(p.timestamp).valueOf())
    }),
  )
  return Number.isFinite(last) ? last + FINE_BUCKET_MINUTES * 60_000 : null
}

type KpiCounts = { total: number; success: number; pending: number; waiting: number; failed: number }

const seriesKey = (s: TrafficSeries) => `${s.client_uid || ''}::${s.merchant_name || ''}::${s.payment_method || ''}`

/** Replace every cached point at/after `from` with the freshly fetched tail. */
function mergeTrafficTail(cached: TrafficSeries[], tail: TrafficSeries[], from: Dayjs): TrafficSeries[] {
  const fromMs = from.valueOf()
  const merged = cached.map((s) => ({
    ...s,
    data: (s.data || []).filter((p) => dayjs(p.timestamp).valueOf() < fromMs),
  }))
  const slots = new Map<string, number[]>()
  merged.forEach((s, i) => {
    const key = seriesKey(s)
    slots.set(key, [...(slots.get(key) || []), i])
  })
  tail.forEach((s) => {
    const index = slots.get(seriesKey(s))?.shift()
    if (index === undefined) merged.push({ ...s, data: [...(s.data || [])] })
    else merged[index] = { ...merged[index], data: [...merged[index].data, ...(s.data || [])] }
  })
  return merged
}

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [referenceNow, setReferenceNow] = useState<Dayjs>(() => dayjs())
  const trxWrapRef = useRef<HTMLDivElement>(null)
  const [trxHeight, setTrxHeight] = useState<number | null>(null)
  const loadGenRef = useRef(0)
  const loadingRef = useRef(false)
  const kpiScopeRef = useRef('')
  const kpiInFlightRef = useRef<string | null>(null)
  const fineCacheRef = useRef<{ scope: string; data: TrafficSeries[]; fullAt: number } | null>(null)
  // Raw transactions since the aggregate's last closed bucket, fetched incrementally.
  const liveRef = useRef<{
    scope: string
    rows: Map<string, LiveTrxRow>
    cursor: number
    validFrom: number
  } | null>(null)
  const liveInFlightRef = useRef(false)

  const withLiveOverlay = useCallback((base: TrafficSeries[], scope: string, now: Dayjs) => {
    const live = liveRef.current
    const coverageEnd = aggregateCoverageEnd(base)
    if (
      !live ||
      live.scope !== scope ||
      coverageEnd === null ||
      live.validFrom > coverageEnd ||
      coverageEnd < now.subtract(LIVE_MAX_GAP_MINUTES, 'minute').valueOf()
    )
      return base
    return overlayTrafficBuckets(base, Array.from(live.rows.values()), {
      from: coverageEnd,
      bucketMinutes: FINE_BUCKET_MINUTES,
    })
  }, [])

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
      // Past dates: compare the selected day against the day before it, not against today.
      setReferenceNow(bgIsLiveRange ? now : end)
      bgLiveScope = JSON.stringify([
        dayStart.format('YYYY-MM-DD'),
        appIds,
        applied.paymentMethod,
        applied.merchant,
      ])

      const trxCount = async (status?: number): Promise<number> => {
        const res = await axios.get(`${apiUrl}/transactions`, {
          headers: authHeaders,
          params: { page: 1, limit: 1, ...trxDateParams, status },
        })
        return Number(res.data?.pagination?.total_items) || 0
      }

      // Same source as Transaction List → live KPI / Status.
      // The counts can take longer than REFRESH_MS, so a batch is never discarded just because a newer
      // refresh started (that left the cards stuck on stale numbers), and a new batch is only sent once
      // the previous one for the same filters has finished, so slow counts don't pile up on the database.
      const kpiScope = JSON.stringify([
        dayStart.format('YYYY-MM-DD'),
        bgIsLiveRange ? 'live' : end.format('YYYY-MM-DD'),
        appIds,
        applied.paymentMethod,
      ])
      kpiScopeRef.current = kpiScope
      const kpiPromise =
        kpiInFlightRef.current === kpiScope
          ? Promise.resolve()
          : (() => {
              kpiInFlightRef.current = kpiScope
              return Promise.all([trxCount(), trxCount(1000), trxCount(1001), trxCount(1003), trxCount(1005)])
                .then(([total, success, pending, waiting, failed]) => {
                  if (kpiScopeRef.current !== kpiScope) return
                  const next: KpiCounts = { total, success, pending, waiting, failed }
                  setKpi(next)
                  setUpdatedAt(dayjs().format('HH:mm:ss'))
                })
                .catch((e) => {
                  // Keep the last good numbers instead of dropping the cards to 0.
                  console.warn('KPI count fetch failed:', e)
                })
                .finally(() => {
                  if (kpiInFlightRef.current === kpiScope) kpiInFlightRef.current = null
                })
            })()

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
      const fineScope = JSON.stringify([dayStart.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')])
      const fineCache = fineCacheRef.current
      const fineTailStart = (() => {
        const t = now.subtract(FINE_TAIL_MINUTES, 'minute').startOf('minute')
        return t.subtract(t.minute() % FINE_BUCKET_MINUTES, 'minute')
      })()
      const fineIncremental =
        bgIsLiveRange &&
        !!fineCache &&
        fineCache.scope === fineScope &&
        now.valueOf() - fineCache.fullAt < FINE_FULL_RESYNC_MS &&
        fineTailStart.isAfter(dayStart)
      const fineStart = fineIncremental ? fineTailStart : dayStart

      const finePromise = axios
        .get(`${apiUrl}/traffic/monitoring`, {
          headers: authHeaders,
          params: {
            start: fineStart.format('YYYY-MM-DDTHH:mm:ssZ'),
            end: end.format('YYYY-MM-DDTHH:mm:ssZ'),
            _ts: now.valueOf(),
          },
        })
        .then((res) => {
          const fetched: TrafficSeries[] = res.data?.data || []
          const data = fineIncremental && fineCache ? mergeTrafficTail(fineCache.data, fetched, fineTailStart) : fetched
          fineCacheRef.current = {
            scope: fineScope,
            data,
            fullAt: fineIncremental && fineCache ? fineCache.fullAt : now.valueOf(),
          }
          return data
        })
        .catch((e) => {
          console.warn('Fine traffic monitoring fetch failed, keeping last data:', e)
          return fineCache && fineCache.scope === fineScope ? fineCache.data : null
        })

      const [trafficRes, fineRes] = await Promise.all([trafficPromise, finePromise])

      if (gen !== loadGenRef.current) return

      const hourlyData: TrafficSeries[] = trafficRes.data?.data || []
      const fineData: TrafficSeries[] = fineRes || hourlyData

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
      // Only the fine aggregate (10-minute buckets) can be extended live; not the hourly fallback.
      bgFineData = fineRes ? fineData : null

      setSeries(hourlyData)
      setAlertSeries(bgIsLiveRange && fineRes ? withLiveOverlay(fineData, bgLiveScope, now) : fineData)
      setTodayCounts(nextToday)
      setReferenceNow(bgIsLiveRange ? dayjs() : end)
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

    // Live tail — background, does not block card refresh. The traffic aggregate only fills a
    // 10-minute bucket after it closes, so the open bucket is rebuilt from raw transactions. Only rows
    // newer than the last fetch are requested (a few dozen per refresh instead of the whole window).
    if (!bgAuthHeaders || !bgTrxDateParams || !bgFineData || !bgIsLiveRange || liveInFlightRef.current) return
    liveInFlightRef.current = true
    try {
      const liveEnd = dayjs()
      const keepFrom = liveEnd.subtract(LIVE_KEEP_MINUTES, 'minute').valueOf()
      const coverageEnd = aggregateCoverageEnd(bgFineData)
      const rawFrom = Math.max(
        Math.min(coverageEnd ?? keepFrom, keepFrom),
        liveEnd.subtract(LIVE_MAX_GAP_MINUTES, 'minute').valueOf(),
      )

      let live = liveRef.current
      if (!live || live.scope !== bgLiveScope) {
        live = { scope: bgLiveScope, rows: new Map(), cursor: 0, validFrom: Infinity }
        liveRef.current = live
      }
      const since = live.cursor ? Math.max(live.cursor - LIVE_OVERLAP_MS, rawFrom) : rawFrom

      const { activity: nextActivity, rows: newRows, complete } = await fetchTodayLastSeen(
        apiUrl,
        bgAuthHeaders,
        {
          ...bgTrxDateParams,
          start_date: dayjs(since).utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
          end_date: liveEnd.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
        },
        { maxPages: LIVE_MAX_PAGES, pageSize: LIVE_PAGE_SIZE },
      )
      if (liveRef.current !== live) return

      let oldestFetched = Infinity
      newRows.forEach((row, index) => {
        const ts = dayjs(row.created_at).valueOf()
        if (Number.isNaN(ts)) return
        oldestFetched = Math.min(oldestFetched, ts)
        live.cursor = Math.max(live.cursor, ts)
        const key = row.u_id || `${row.merchant_name || ''}:${row.payment_method || ''}:${row.created_at || ''}:${index}`
        live.rows.set(key, row)
      })
      // Incomplete = the window held more rows than we page through; only the newest part is known.
      live.validFrom = complete ? Math.min(live.validFrom, since) : oldestFetched
      const pruneBefore = Math.min(rawFrom, keepFrom)
      live.rows.forEach((row, key) => {
        if (dayjs(row.created_at).valueOf() < pruneBefore) live.rows.delete(key)
      })
      live.validFrom = Math.max(live.validFrom, pruneBefore)
      if (!complete) console.warn('Live tail: more new transactions than one refresh pages through; catching up')

      const liveRows = Array.from(live.rows.values())
      setFailedRows(liveRows.filter((row) => Number(row.status_code) === 1005))
      if (gen === loadGenRef.current) {
        setAlertSeries(withLiveOverlay(bgFineData, bgLiveScope, liveEnd))
        setReferenceNow(liveEnd)
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
      console.warn('Live tail fetch failed (cards already live):', activityErr)
    } finally {
      liveInFlightRef.current = false
    }
  }, [apiUrl, token, applied.dateRange, applied.merchant, applied.paymentMethod, merchants, withLiveOverlay])

  const isLiveView = !applied.dateRange?.[1] || applied.dateRange[1].isSame(dayjs(), 'day')

  useEffect(() => {
    load()
    // A past day's data no longer changes, so only poll while viewing today.
    if (!isLiveView) return
    const id = window.setInterval(load, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [load, isLiveView])

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
          {updatedAt
            ? isLiveView
              ? `Updated ${updatedAt} · refresh ${REFRESH_MS / 1000}s`
              : `Data ${referenceNow.format('DD MMM YYYY')} · tidak auto-refresh`
            : 'Live overview'}
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
            referenceNow={isLiveView ? referenceNow : undefined}
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
