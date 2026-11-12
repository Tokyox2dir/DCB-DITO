import { MetricStatus } from './VolumePerHourChart'

export type LiveKpi = {
  total: number
  success: number
  pending: number
  waiting: number
  failed: number
}

type Props = {
  kpi: LiveKpi
  loading?: boolean
  onSelectStatus?: (status: MetricStatus) => void
  /** The status filter in force, so its cell reads as selected. */
  activeStatus?: MetricStatus
}

function formatNum(n: number) {
  return n.toLocaleString('id-ID')
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0
}

export default function MonitoringKpiCards({ kpi, loading, onSelectStatus, activeStatus }: Props) {
  const base = kpi.success + kpi.pending + kpi.failed
  const hasData = base > 0 || kpi.waiting > 0 || kpi.total > 0
  const value = (n: number) => (loading && !hasData ? '—' : formatNum(n))

  const cells: { status: MetricStatus; key: string; label: string; value: number; sub: string; live?: boolean }[] = [
    { status: '', key: 'total', label: 'Total Transactions', value: kpi.total, sub: 'Today' },
    { status: 'success', key: 'success', label: 'Success', value: kpi.success, sub: `${pct(kpi.success, base).toFixed(1)}%` },
    {
      status: 'pending',
      key: 'pending',
      label: 'Pending',
      value: kpi.pending,
      sub: `${pct(kpi.pending, base).toFixed(1)}%`,
      live: kpi.pending > 0,
    },
    {
      status: 'waiting',
      key: 'waiting',
      label: 'Waiting',
      value: kpi.waiting,
      sub: `${pct(kpi.waiting, kpi.total || base + kpi.waiting).toFixed(1)}%`,
      live: kpi.waiting > 0,
    },
    { status: 'failed', key: 'failed', label: 'Failed', value: kpi.failed, sub: `${pct(kpi.failed, base).toFixed(1)}%` },
  ]

  return (
    <div className='mon-kpi-grid' role='group' aria-label='Transaction status'>
      {cells.map((c) => (
        <button
          key={c.key}
          type='button'
          className={`mon-kpi-card mon-kpi-${c.key}${c.live ? ' is-live' : ''}${activeStatus === c.status ? ' is-active' : ''}`}
          aria-pressed={activeStatus === c.status}
          title={c.status ? `Show ${c.label.toLowerCase()} only` : 'Show all statuses'}
          onClick={() => onSelectStatus?.(c.status)}
        >
          <span className='mon-kpi-top'>
            <i className='mon-kpi-dot' />
            {c.label}
          </span>
          <strong>{value(c.value)}</strong>
          <span className='mon-kpi-sub'>{c.sub}</span>
        </button>
      ))}
    </div>
  )
}
