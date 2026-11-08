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
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
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

  const healthy = successRate >= 90
  const health = healthy ? 'Normal' : successRate >= 75 ? 'Perlu dipantau' : 'Kritis'
  const healthTone = healthy ? 'good' : successRate >= 75 ? 'warn' : 'bad'
  const stats = [
    { label: 'Total transaksi', value: totals.total, note: `${WINDOW_HOURS} jam terakhir`, tone: 'primary', icon: <ReceiptLongOutlinedIcon /> },
    { label: 'Success', value: totals.success, note: `${percent(totals.success, totals.total).toFixed(1)}%`, tone: 'good', icon: <CheckCircleOutlinedIcon /> },
    { label: 'Pending', value: totals.pending, note: `${percent(totals.pending, totals.total).toFixed(1)}%`, tone: 'warn', icon: <PendingOutlinedIcon /> },
    { label: 'Failed', value: totals.failed, note: `${percent(totals.failed, totals.total).toFixed(1)}%`, tone: 'bad', icon: <CancelOutlinedIcon /> },
  ]
  const statCard = (s: (typeof stats)[number]) => (
    <article key={s.label} className='sf-card sn-stat'>
      <span className={`sn-avatar ${s.tone}`}>{s.icon}</span>
      <p>{s.label}</p>
      <h4>{formatNumber(s.value)}</h4>
      <small className={s.tone}>{s.note}</small>
    </article>
  )

  return (
    <section className='sf-dash sn' aria-busy={loading}>
      <div className='sn-row sn-top'>
        <article className='sf-card sn-welcome'>
          <div className='sn-welcome-body'>
            <h5>Halo {username}! 👋</h5>
            <p>
              Success rate {WINDOW_HOURS} jam terakhir <strong className={healthTone}>{successRate.toFixed(1)}%</strong>, status{' '}
              <strong className={healthTone}>{health}</strong>.
            </p>
            <p className='sn-meta'>
              <span>{role || 'user'}</span>
              <span className={`sf-env ${isDev ? 'dev' : 'prod'}`}>{isDev ? 'Dev' : 'Prod'}</span>
              <span>{updatedAt ? `Diperbarui ${updatedAt}` : 'Memuat'}</span>
            </p>
            <div className='sn-actions'>
              {shortcuts.map((s) =>
                s.path ? (
                  <Link key={s.label} to={s.path} className='sn-btn' title={s.label} aria-label={s.label}>
                    {s.icon}
                    <span>{s.label}</span>
                  </Link>
                ) : (
                  <button
                    key={s.label}
                    type='button'
                    className={`sn-btn${loading ? ' spin' : ''}`}
                    title={s.label}
                    aria-label={s.label}
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
          <img src='/img/man-with-laptop.png' alt='' className='sn-welcome-art' />
        </article>
        <div className='sn-stats'>{stats.slice(0, 2).map(statCard)}</div>
      </div>

      <div className='sn-row sn-mid'>
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

        <div className='sn-side'>
          <div className='sn-stats'>{stats.slice(2).map(statCard)}</div>
          <article className='sf-card sf-inbox'>
            <header className='sf-card-head'>
              <div>
                <h2>Klien bermasalah</h2>
                <small>Merchant dengan transaksi gagal</small>
              </div>
              <Link to={isAdmin ? '/monitoring' : '/transactions'} className='sf-link'>
                Lihat semua
              </Link>
            </header>
            <ul>
              {alerts.map((m, i) => (
                <li key={m.name} className={i === 0 ? 'featured' : ''}>
                  <span className='sf-inbox-avatar'>{initials(m.name)}</span>
                  <div>
                    <strong>{m.name}</strong>
                    <p>
                      {formatNumber(m.failed)} gagal dari {formatNumber(m.total)} · {percent(m.failed, m.total).toFixed(1)}%
                    </p>
                  </div>
                  <Link to='/transactions' className='sf-inbox-go' aria-label={`Open transactions for ${m.name}`}>
                    <ArrowOutwardRoundedIcon />
                  </Link>
                </li>
              ))}
              {!alerts.length && <li className='sf-empty'>{loading ? 'Memeriksa kegagalan…' : 'Tidak ada transaksi gagal.'}</li>}
            </ul>
          </article>
        </div>
      </div>

      <div className='sn-row sn-bottom'>
        <article className='sf-card sn-methods'>
          <header className='sf-card-head'>
            <div>
              <h2>Metode pembayaran</h2>
              <small>{formatNumber(totals.total)} transaksi · {WINDOW_HOURS} jam</small>
            </div>
          </header>
          <ul>
            {methods.map((m) => (
              <li key={m.name}>
                <span className='sn-avatar primary'>
                  <PaymentsOutlinedIcon />
                </span>
                <div>
                  <strong title={m.name}>{m.name}</strong>
                  <small>{m.merchants.length} merchant</small>
                </div>
                <span className='sn-methods-val'>
                  {formatNumber(m.total)}
                  <small>{percent(m.total, totals.total).toFixed(0)}%</small>
                </span>
              </li>
            ))}
            {!methods.length && <li className='sf-empty'>{loading ? 'Memuat metode pembayaran…' : 'Belum ada data traffic.'}</li>}
          </ul>
        </article>
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
