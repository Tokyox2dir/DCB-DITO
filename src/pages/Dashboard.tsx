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
  const failedRate = percent(totals.failed, totals.total)
  const kpis = [
    { label: 'Success', value: totals.success, share: percent(totals.success, totals.total), tone: '' },
    { label: 'Pending', value: totals.pending, share: percent(totals.pending, totals.total), tone: '' },
    { label: 'Failed', value: totals.failed, share: failedRate, tone: failedRate >= 5 ? 'bad' : '' },
  ]

  return (
    <section className='ov' aria-busy={loading}>
      <header className='ov-head'>
        <div>
          <h2>Overview</h2>
          <p>
            Success rate <strong className={healthTone}>{successRate.toFixed(1)}%</strong> dalam {WINDOW_HOURS} jam terakhir ·{' '}
            {formatNumber(totals.failed)} gagal · status <strong className={healthTone}>{health}</strong>
          </p>
        </div>
        <div className='ov-actions'>
          <span className='ov-stamp'>
            <span className={`sf-env ${isDev ? 'dev' : 'prod'}`}>{isDev ? 'Dev' : 'Prod'}</span>
            {updatedAt ? `Diperbarui ${updatedAt}` : 'Memuat…'} · {username}
            {role ? ` (${role})` : ''}
          </span>
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
      </header>

      <div className='ov-kpis' role='list'>
        <div className='ov-kpi lead' role='listitem'>
          <span>Total transaksi · {WINDOW_HOURS} jam</span>
          <strong>{formatNumber(totals.total)}</strong>
        </div>
        {kpis.map((k) => (
          <div key={k.label} className='ov-kpi' role='listitem'>
            <span>{k.label}</span>
            <strong>{formatNumber(k.value)}</strong>
            <small className={k.tone}>{totals.total ? `${k.share.toFixed(1)}% dari total` : '—'}</small>
          </div>
        ))}
      </div>

      <div className='ov-row ov-main'>
        <article className='rp-card sf-heat'>
          <header className='rp-card-head'>
            <div>
              <h3>Traffic per {BUCKET_MINUTES} menit</h3>
              <small>Setiap kotak = satu slot {BUCKET_MINUTES} menit, angka = jumlah transaksi</small>
            </div>
            <div className='sf-legend'>
              <span><i className='low' /> Sepi</span>
              <span><i className='mid' /> Ramai</span>
              <span><i className='high' /> Puncak</span>
              <span><i className='alert' /> ≥30% gagal</span>
              <span><i className='now' /> Sekarang</span>
            </div>
          </header>
          {!hours.length && <p className='sf-heat-empty'>{loading ? 'Memuat traffic…' : 'Belum ada data traffic.'}</p>}
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
        </article>

        <article className='rp-card ov-issues'>
          <header className='rp-card-head'>
            <div>
              <h3>Klien bermasalah</h3>
              <small>Merchant dengan transaksi gagal terbanyak</small>
            </div>
            <Link to={isAdmin ? '/monitoring' : '/transactions'} className='rp-link'>
              Lihat semua
            </Link>
          </header>
          <ul>
            {alerts.map((m) => {
              const rate = percent(m.failed, m.total)
              return (
                <li key={m.name}>
                  <span className='ov-avatar'>{initials(m.name)}</span>
                  <div>
                    <strong title={m.name}>{m.name}</strong>
                    <small>
                      {formatNumber(m.failed)} gagal dari {formatNumber(m.total)}
                    </small>
                  </div>
                  <span className={`ov-rate${rate >= 5 ? ' bad' : ''}`}>{rate.toFixed(1)}%</span>
                  <Link to='/transactions' className='ov-go' aria-label={`Open transactions for ${m.name}`}>
                    <ArrowOutwardRoundedIcon />
                  </Link>
                </li>
              )
            })}
            {!alerts.length && <li className='ov-empty'>{loading ? 'Memeriksa kegagalan…' : 'Tidak ada transaksi gagal.'}</li>}
          </ul>
        </article>
      </div>

      <div className='ov-row ov-bottom'>
        <article className='rp-card ov-methods'>
          <header className='rp-card-head'>
            <div>
              <h3>Metode pembayaran</h3>
              <small>{formatNumber(totals.total)} transaksi · {WINDOW_HOURS} jam</small>
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>Metode</th>
                <th className='num'>Merchant</th>
                <th className='num'>Transaksi</th>
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
                    {loading ? 'Memuat metode pembayaran…' : 'Belum ada data traffic.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
        <RankingCard
          title='Top merchants'
          subtitle='Berdasarkan volume transaksi'
          variant='client'
          icon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={merchants}
          loading={loading && merchants.length === 0}
        />
        <RankingCard
          title='Top success'
          subtitle='Merchant dengan transaksi sukses terbanyak'
          variant='sender'
          icon={<TaskAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={successLeaders}
          loading={loading && successLeaders.length === 0}
        />
      </div>
    </section>
  )
}
