import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PendingOutlinedIcon from '@mui/icons-material/PendingOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
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
}

function formatNum(n: number) {
  return n.toLocaleString('id-ID')
}

function pct(part: number, total: number) {
  return total ? (part / total) * 100 : 0
}

export default function MonitoringKpiCards({ kpi, loading, onSelectStatus }: Props) {
  const base = kpi.success + kpi.pending + kpi.failed
  const hasData = base > 0 || kpi.waiting > 0 || kpi.total > 0

  return (
    <div className='mon-kpi-grid'>
      <button type='button' className='mon-kpi-card mon-kpi-total' onClick={() => onSelectStatus?.('')}>
        <div className='mon-kpi-top'>
          <span>Total Transactions</span>
          <ReceiptLongOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        </div>
        <strong>{loading && !hasData ? '—' : formatNum(kpi.total)}</strong>
        <p>Today</p>
      </button>

      <button type='button' className='mon-kpi-card mon-kpi-success' onClick={() => onSelectStatus?.('success')}>
        <div className='mon-kpi-top'>
          <span>Success</span>
          <CheckCircleOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        </div>
        <strong>{loading && !hasData ? '—' : formatNum(kpi.success)}</strong>
        <p>{pct(kpi.success, base).toFixed(1)}%</p>
      </button>

      <button
        type='button'
        className={`mon-kpi-card mon-kpi-pending${kpi.pending > 0 ? ' is-live' : ''}`}
        onClick={() => onSelectStatus?.('pending')}
      >
        <div className='mon-kpi-top'>
          <span>Pending</span>
          <PendingOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        </div>
        <strong>{loading && !hasData ? '—' : formatNum(kpi.pending)}</strong>
        <p>{pct(kpi.pending, base).toFixed(1)}%</p>
      </button>

      <button
        type='button'
        className={`mon-kpi-card mon-kpi-waiting${kpi.waiting > 0 ? ' is-live' : ''}`}
        onClick={() => onSelectStatus?.('waiting')}
      >
        <div className='mon-kpi-top'>
          <span>Waiting</span>
          <HourglassEmptyOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        </div>
        <strong>{loading && !hasData ? '—' : formatNum(kpi.waiting)}</strong>
        <p>{pct(kpi.waiting, kpi.total || base + kpi.waiting).toFixed(1)}%</p>
      </button>

      <button type='button' className='mon-kpi-card mon-kpi-failed' onClick={() => onSelectStatus?.('failed')}>
        <div className='mon-kpi-top'>
          <span>Failed</span>
          <CancelOutlinedIcon sx={{ fontSize: 16, opacity: 0.7 }} />
        </div>
        <strong>{loading && !hasData ? '—' : formatNum(kpi.failed)}</strong>
        <p>{pct(kpi.failed, base).toFixed(1)}%</p>
      </button>
    </div>
  )
}
