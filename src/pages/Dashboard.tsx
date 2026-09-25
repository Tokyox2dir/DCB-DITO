import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { jwtDecode } from 'jwt-decode'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
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

const METHOD_TONES = ['peach', 'sky', 'rose'] as const
const SLOTS_PER_HOUR = 60 / BUCKET_MINUTES

type HeatLevel = 'empty' | 'low' | 'mid' | 'high' | 'alert' | 'now'

function heatLevel(bucket: TrafficBucket, isNow: boolean, high: number, mid: number): HeatLevel {
  if (isNow) return 'now'
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
  const { isDev, token } = useAuth()
  const { username, role } = useMemo(() => {
    try {
      const decoded = token ? (jwtDecode(token) as any) : {}
      return { username: (decoded.username as string) || 'user', role: (decoded.role as string) || '' }
    } catch {
      return { username: 'user', role: '' }
    }
  }, [token])
  const { loading, refresh, updatedAt, merchants, successLeaders, totals, methods, merchantStats, buckets } =
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
    const rows: { label: string; cells: { bucket: TrafficBucket; level: HeatLevel }[] }[] = []
    for (let h = 0; h < WINDOW_HOURS; h += 1) {
      const slice = buckets.slice(h * SLOTS_PER_HOUR, (h + 1) * SLOTS_PER_HOUR)
      if (!slice.length) continue
      rows.push({
        label: dayjs(slice[0].start).format('HH:mm'),
        cells: slice.map((bucket, i) => ({
          bucket,
          level: heatLevel(bucket, h * SLOTS_PER_HOUR + i === buckets.length - 1, high, mid),
        })),
      })
    }
    return rows
  }, [buckets])

  const successRate = percent(totals.success, totals.total)
  const shortcuts = [
    { label: 'Refresh', icon: <RefreshRoundedIcon />, onClick: refresh },
    { label: 'Transactions', icon: <ReceiptLongOutlinedIcon />, path: '/transactions' },
    { label: 'Reports', icon: <DescriptionOutlinedIcon />, path: '/report' },
    ...(isAdmin ? [{ label: 'Monitoring', icon: <MonitorHeartOutlinedIcon />, path: '/monitoring' }] : []),
  ]

  const details = [
    { label: 'Total transactions', value: formatNumber(totals.total), icon: <SwapHorizRoundedIcon /> },
    { label: 'Success', value: formatNumber(totals.success), icon: <TaskAltOutlinedIcon />, tone: 'good' },
    { label: 'Pending', value: formatNumber(totals.pending), icon: <HourglassEmptyRoundedIcon />, tone: 'warn' },
    { label: 'Failed', value: formatNumber(totals.failed), icon: <ErrorOutlineOutlinedIcon />, tone: 'bad' },
    { label: 'Success rate', value: `${successRate.toFixed(1)}%`, icon: <SpeedRoundedIcon />, badge: totals.total > 0 },
  ]

  return (
    <section className='sf-dash' aria-busy={loading}>
      <article className='sf-card sf-user'>
        <div className='sf-user-head'>
          <span className='sf-user-avatar'>{initials(username)}</span>
          <div>
            <strong>{username}</strong>
            <small>{role || 'user'}</small>
          </div>
          <span className={`sf-env ${isDev ? 'dev' : 'prod'}`}>{isDev ? 'Dev' : 'Prod'}</span>
        </div>
        <div className='sf-user-actions'>
          {shortcuts.map((s) =>
            s.path ? (
              <Link key={s.label} to={s.path} className='sf-round' title={s.label} aria-label={s.label}>
                {s.icon}
              </Link>
            ) : (
              <button
                key={s.label}
                type='button'
                className={`sf-round${loading ? ' spin' : ''}`}
                title={s.label}
                aria-label={s.label}
                onClick={s.onClick}
                disabled={loading}
              >
                {s.icon}
              </button>
            ),
          )}
        </div>
        <div className='sf-user-meta'>
          <small>Time window</small>
          <div>
            <span className='sf-chip'>
              <ScheduleRoundedIcon /> Last {WINDOW_HOURS} hours
            </span>
            <span className='sf-chip dark'>{updatedAt ? `Updated ${updatedAt}` : 'Loading'}</span>
          </div>
        </div>
      </article>

      <article className='sf-card sf-details'>
        <h2>Traffic details</h2>
        <ul>
          {details.map((d) => (
            <li key={d.label}>
              <div>
                <small>{d.label}</small>
                <strong className={d.tone}>{d.value}</strong>
              </div>
              {d.badge ? (
                <span className={`sf-badge ${successRate >= 90 ? 'good' : successRate >= 75 ? 'warn' : 'bad'}`}>
                  {successRate >= 90 ? 'Healthy' : successRate >= 75 ? 'Watch' : 'Low'}
                </span>
              ) : (
                <span className='sf-detail-icon'>{d.icon}</span>
              )}
            </li>
          ))}
        </ul>
      </article>

      <div className='sf-methods'>
        <div className='sf-method-grid'>
          {methods.slice(0, 3).map((m, i) => {
            const share = percent(m.total, totals.total)
            return (
              <article key={m.name} className={`sf-method sf-tone-${METHOD_TONES[i]}`}>
                <div className='sf-method-top'>
                  <span className='sf-chip light'>#{i + 1}</span>
                  <small>{formatNumber(m.total)} trx</small>
                </div>
                <h3 title={m.name}>{m.name}</h3>
                <p>Top payment method · last {WINDOW_HOURS}h</p>
                <div className='sf-progress-label'>
                  <span>{share.toFixed(0)}%</span>
                  <small>Share</small>
                </div>
                <div className='sf-progress'>
                  <i style={{ width: `${share}%` }} />
                </div>
                <div className='sf-method-foot'>
                  <div className='sf-avatars'>
                    {m.merchants.slice(0, 3).map((name) => (
                      <span key={name} title={name}>
                        {initials(name)}
                      </span>
                    ))}
                    {m.merchants.length > 3 && <span className='more'>+{m.merchants.length - 3}</span>}
                  </div>
                  <small>
                    {m.merchants.length} merchant{m.merchants.length === 1 ? '' : 's'}
                  </small>
                </div>
              </article>
            )
          })}
          {!methods.length && (
            <article className='sf-method sf-method-empty'>
              {loading ? 'Loading payment methods…' : 'No traffic data yet.'}
            </article>
          )}
        </div>
      </div>

      <article className='sf-card sf-heat'>
        <header className='sf-card-head'>
          <div>
            <h2>Traffic heatmap</h2>
            <small>{BUCKET_MINUTES}-minute slots</small>
          </div>
        </header>
        {!hours.length && <p className='sf-heat-empty'>{loading ? 'Loading traffic…' : 'No traffic data yet.'}</p>}
        <div className='sf-heat-grid' role='table' aria-label='Transactions per time slot'>
          {hours.map((row) => (
            <div key={row.label} className='sf-heat-row' role='row'>
              <span className='sf-heat-hour' role='rowheader'>
                {row.label}
              </span>
              {row.cells.map(({ bucket, level }) => (
                <span
                  key={bucket.start}
                  role='cell'
                  className={`sf-heat-cell ${level}`}
                  title={`${dayjs(bucket.start).format('HH:mm')} · ${formatNumber(bucket.total)} trx, ${formatNumber(bucket.failed)} failed`}
                >
                  {bucket.total > 0 ? formatCompact(bucket.total) : ''}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className='sf-legend'>
          <span>
            <i className='low' /> Low
          </span>
          <span>
            <i className='mid' /> Busy
          </span>
          <span>
            <i className='high' /> Peak
          </span>
          <span>
            <i className='alert' /> ≥30% failed
          </span>
          <span>
            <i className='now' /> Now
          </span>
        </div>
      </article>

      <article className='sf-card sf-inbox'>
        <header className='sf-card-head'>
          <div>
            <h2>Failure alerts</h2>
            <small>Merchants with failed transactions</small>
          </div>
          <Link to={isAdmin ? '/monitoring' : '/transactions'} className='sf-link'>
            View all
          </Link>
        </header>
        <ul>
          {alerts.map((m, i) => (
            <li key={m.name} className={i === 0 ? 'featured' : ''}>
              <span className='sf-inbox-avatar'>{initials(m.name)}</span>
              <div>
                <strong>{m.name}</strong>
                <p>
                  {formatNumber(m.failed)} failed of {formatNumber(m.total)} · {percent(m.failed, m.total).toFixed(1)}%
                  failure rate
                </p>
              </div>
              <Link to='/transactions' className='sf-inbox-go' aria-label={`Open transactions for ${m.name}`}>
                <ArrowOutwardRoundedIcon />
              </Link>
            </li>
          ))}
          {!alerts.length && <li className='sf-empty'>{loading ? 'Checking failures…' : 'No failed transactions.'}</li>}
        </ul>
      </article>

      <div className='sf-ranks'>
        <RankingCard
          title='Top Merchants'
          subtitle='By transaction volume'
          variant='client'
          icon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={merchants}
          loading={loading && merchants.length === 0}
        />
        <RankingCard
          title='Top Success'
          subtitle='Merchants by successful transactions'
          variant='sender'
          icon={<TaskAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={successLeaders}
          loading={loading && successLeaders.length === 0}
        />
      </div>
    </section>
  )
}
