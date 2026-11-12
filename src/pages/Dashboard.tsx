import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { jwtDecode } from 'jwt-decode'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import RankingCard from '../components/RankingCard'
import useDashboardData, { BUCKET_MINUTES, TrafficBucket, WINDOW_HOURS } from '../hooks/useDashboardData'
import { useAuth } from '../provider/AuthProvider'

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part * 100) / whole : 0
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

const SLOTS_PER_HOUR = 60 / BUCKET_MINUTES

type HeatLevel = 'empty' | 'low' | 'mid' | 'high' | 'alert'

function heatLevel(bucket: TrafficBucket, high: number, mid: number): HeatLevel {
  if (bucket.total === 0) return 'empty'
  if (bucket.total >= 10 && bucket.failed / bucket.total >= 0.3) return 'alert'
  if (bucket.total >= high) return 'high'
  if (bucket.total >= mid) return 'mid'
  return 'low'
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

export default function Dashboard() {
  const { token } = useAuth()
  const role = useMemo(() => {
    try {
      const decoded = token ? (jwtDecode(token) as any) : {}
      return (decoded.role as string) || ''
    } catch {
      return ''
    }
  }, [token])
  const { loading, refresh, merchants, successLeaders, totals, methods, merchantStats, buckets } =
    useDashboardData()
  const isAdmin = role === 'admin' || role === 'superadmin'

  const alerts = useMemo(
    () =>
      merchantStats
        .filter((m) => m.failed > 0)
        .sort((a, b) => b.failed - a.failed)
        .slice(0, 5),
    [merchantStats],
  )

  const hours = useMemo(() => {
    const volumes = buckets
      .map((b) => b.total)
      .filter((v) => v > 0)
      .sort((a, b) => a - b)
    const high = quantile(volumes, 0.75)
    const mid = quantile(volumes, 0.4)
    const rows: { label: string; cells: { bucket: TrafficBucket; level: HeatLevel; isNow: boolean }[] }[] = []
    for (let h = 0; h < WINDOW_HOURS; h += 1) {
      const slice = buckets.slice(h * SLOTS_PER_HOUR, (h + 1) * SLOTS_PER_HOUR)
      if (!slice.length) continue
      rows.push({
        label: dayjs(slice[0].start).format('HH:mm'),
        cells: slice.map((bucket, i) => ({
          bucket,
          level: heatLevel(bucket, high, mid),
          isNow: h * SLOTS_PER_HOUR + i === buckets.length - 1,
        })),
      })
    }
    return rows
  }, [buckets])

  const shortcuts = [
    { label: 'Refresh', icon: <RefreshRoundedIcon />, onClick: refresh },
    { label: 'Transactions', icon: <ReceiptLongOutlinedIcon />, path: '/transactions' },
    { label: 'Reports', icon: <DescriptionOutlinedIcon />, path: '/report' },
    ...(isAdmin ? [{ label: 'Monitoring', icon: <MonitorHeartOutlinedIcon />, path: '/monitoring' }] : []),
  ]

  const failedRate = percent(totals.failed, totals.total)
  const kpis = [
    { label: 'Success', dot: 'good', value: totals.success, share: percent(totals.success, totals.total), tone: '' },
    { label: 'Pending', dot: 'warn', value: totals.pending, share: percent(totals.pending, totals.total), tone: '' },
    { label: 'Failed', dot: 'bad', value: totals.failed, share: failedRate, tone: failedRate >= 5 ? 'bad' : '' },
  ]
  const slotOffsets = Array.from({ length: SLOTS_PER_HOUR }, (_, i) => `+${String(i * BUCKET_MINUTES).padStart(2, '0')}`)

  return (
    <section className='ov' aria-busy={loading}>
      <header className='ov-head'>
        <div className='ov-actions'>
          <div className='ov-buttons'>
            {shortcuts.map((s) =>
              s.path ? (
                <Link key={s.label} to={s.path} className='rp-btn'>
                  {s.icon}
                  <span>{s.label}</span>
                </Link>
              ) : (
                <button
                  key={s.label}
                  type='button'
                  className={`rp-btn primary${loading ? ' spin' : ''}`}
                  onClick={s.onClick}
                  disabled={loading}
                >
                  {s.icon}
                  <span>{s.label}</span>
                </button>
              ),
            )}
          </div>
        </div>
      </header>

      <div className='ov-kpis' role='list'>
        <div className='ov-kpi lead' role='listitem'>
          <span>Total transactions</span>
          <strong>{formatNumber(totals.total)}</strong>
          <small>Last {WINDOW_HOURS} hours</small>
        </div>
        {kpis.map((k) => (
          <div key={k.label} className='ov-kpi' role='listitem'>
            <span>
              <i className={`ov-dot ${k.dot}`} aria-hidden='true' />
              {k.label}
            </span>
            <strong>{formatNumber(k.value)}</strong>
            <small className={k.tone}>
              {totals.total ? (
                <>
                  <b className='mono'>{k.share.toFixed(1)}%</b> of total
                </>
              ) : (
                '—'
              )}
            </small>
            <span className={`ov-kpi-bar ${k.dot}`} aria-hidden='true'>
              <i style={{ width: `${Math.min(k.share, 100)}%` }} />
            </span>
          </div>
        ))}
      </div>

      <div className='ov-row ov-main'>
        <article className='rp-card sf-heat'>
          <header className='rp-card-head'>
            <div>
              <h3>Traffic per {BUCKET_MINUTES} minutes</h3>
              <small>Each cell = one {BUCKET_MINUTES}-minute slot, number = transaction count</small>
            </div>
            <div className='sf-legend'>
              <span><i className='low' /> Sepi</span>
              <span><i className='mid' /> Ramai</span>
              <span><i className='high' /> Puncak</span>
              <span><i className='alert' /> ≥30% failed</span>
              <span><i className='now' /> Sekarang</span>
            </div>
          </header>
          {!hours.length && <p className='sf-heat-empty'>{loading ? 'Loading traffic…' : 'No traffic data yet.'}</p>}
          {hours.length > 0 && (
            <div
              className='sf-heat-grid'
              role='table'
              aria-label='Transactions per time slot'
              style={{ ['--heat-cols' as string]: hours.length, ['--heat-rows' as string]: SLOTS_PER_HOUR }}
            >
              <div className='sf-heat-row sf-heat-axis' aria-hidden='true'>
                <span className='sf-heat-hour' />
                {slotOffsets.map((o) => (
                  <span key={o} className='sf-heat-offset'>
                    {o}
                  </span>
                ))}
              </div>
              {hours.map((row) => (
                <div key={row.label} className='sf-heat-row' role='row'>
                  <span className='sf-heat-hour' role='rowheader'>
                    {row.label}
                  </span>
                  {row.cells.map(({ bucket, level, isNow }) => (
                    <span
                      key={bucket.start}
                      role='cell'
                      className={`sf-heat-cell ${level}${isNow ? ' now' : ''}`}
                      title={`${dayjs(bucket.start).format('HH:mm')} · ${formatNumber(bucket.total)} trx, ${formatNumber(bucket.failed)} failed${isNow ? ' · now' : ''}`}
                    >
                      {bucket.total > 0 ? formatCompact(bucket.total) : ''}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className='rp-card ov-issues'>
          <header className='rp-card-head'>
            <div>
              <h3>Klien bermasalah</h3>
              <small>Merchants with the most failed transactions</small>
            </div>
            <Link to={isAdmin ? '/monitoring' : '/transactions'} className='rp-link'>
              View all
            </Link>
          </header>
          <div className='ov-issues-cols' aria-hidden='true'>
            <span>Merchant</span>
            <span>Failed</span>
          </div>
          <ul>
            {alerts.map((m) => {
              const rate = percent(m.failed, m.total)
              return (
                <li key={m.name}>
                  <span className='ov-avatar'>{initials(m.name)}</span>
                  <div>
                    <strong title={m.name}>{m.name}</strong>
                    <small>
                      <b className='mono'>{formatNumber(m.failed)}</b> failed of{' '}
                      <b className='mono'>{formatNumber(m.total)}</b>
                    </small>
                  </div>
                  <span className={`ov-rate${rate >= 5 ? ' bad' : ''}`}>{rate.toFixed(1)}%</span>
                  <Link to='/transactions' className='ov-go' aria-label={`Open transactions for ${m.name}`}>
                    <ArrowOutwardRoundedIcon />
                  </Link>
                </li>
              )
            })}
            {!alerts.length && <li className='ov-empty'>{loading ? 'Checking failures…' : 'No failed transactions.'}</li>}
          </ul>
        </article>
      </div>

      <div className='ov-row ov-bottom'>
        <article className='rp-card ov-methods'>
          <header className='rp-card-head'>
            <div>
              <h3>Payment methods</h3>
              <small>
                {formatNumber(totals.total)} transactions · {WINDOW_HOURS}h
              </small>
            </div>
          </header>
          <div className='ov-table'>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th className='num'>Merchant</th>
                  <th className='num'>Transactions</th>
                  <th className='num'>Porsi</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => {
                  const share = percent(m.total, totals.total)
                  return (
                    <tr key={m.name}>
                      <td>
                        <strong title={m.name}>{m.name}</strong>
                        <span className='ov-share' aria-hidden='true'>
                          <i style={{ width: `${share}%` }} />
                        </span>
                      </td>
                      <td className='num'>{m.merchants.length}</td>
                      <td className='num'>{formatNumber(m.total)}</td>
                      <td className='num'>{share.toFixed(0)}%</td>
                    </tr>
                  )
                })}
                {!methods.length && (
                  <tr>
                    <td colSpan={4} className='ov-empty'>
                      {loading ? 'Loading payment methods…' : 'No traffic data yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
        <RankingCard
          title='Top merchants'
          subtitle='By transaction volume'
          variant='client'
          icon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={merchants}
          loading={loading && merchants.length === 0}
        />
        <RankingCard
          title='Top success'
          subtitle='Merchants with the most successful transactions'
          variant='sender'
          icon={<TaskAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={successLeaders}
          loading={loading && successLeaders.length === 0}
        />
      </div>
    </section>
  )
}
