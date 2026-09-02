import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import DonutLargeOutlinedIcon from '@mui/icons-material/DonutLargeOutlined'
import { useColorScheme } from '@mui/material/styles'
import type { LiveKpi } from './MonitoringKpiCards'

ChartJS.register(ArcElement, Tooltip, Legend)

type Props = {
  kpi: LiveKpi
  loading?: boolean
}

export default function StatusBreakdown({ kpi, loading }: Props) {
  const { mode, systemMode } = useColorScheme()
  const isDark = ((mode === 'system' ? systemMode : mode) || 'dark') !== 'light'

  const totals = useMemo(
    () => ({
      success: kpi.success || 0,
      pending: kpi.pending || 0,
      failed: kpi.failed || 0,
    }),
    [kpi.success, kpi.pending, kpi.failed],
  )
  const sum = totals.success + totals.pending + totals.failed
  const successPct = sum ? (totals.success / sum) * 100 : 0
  const pendingPct = sum ? (totals.pending / sum) * 100 : 0
  const failedPct = sum ? (totals.failed / sum) * 100 : 0

  const data = {
    labels: ['Success', 'Pending', 'Failed'],
    datasets: [
      {
        data: sum ? [totals.success, totals.pending, totals.failed] : [1],
        backgroundColor: sum ? ['#10b981', '#fcd34d', '#ef4444'] : [isDark ? '#374151' : '#e5e7eb'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: Boolean(sum),
        callbacks: {
          label: (ctx: any) => {
            const value = Number(ctx.raw) || 0
            const pct = sum ? ((value / sum) * 100).toFixed(1) : '0.0'
            return ` ${ctx.label}: ${value.toLocaleString('id-ID')} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className='mon-panel mon-panel-donut'>
      <div className='mon-panel-head'>
        <div className='mon-panel-title'>
          <DonutLargeOutlinedIcon sx={{ fontSize: 18 }} />
          <h4>Status Breakdown</h4>
        </div>
      </div>
      <div className='mon-donut-body'>
        {loading && sum === 0 ? (
          <div className='mon-panel-empty'>Loading…</div>
        ) : (
          <div className='mon-donut-wrap'>
            <Doughnut data={data} options={options} />
            <div className='mon-donut-center'>
              <strong style={{ color: successPct > 0 ? '#10b981' : isDark ? '#9ca3af' : '#6b7280' }}>
                {successPct.toFixed(1)}%
              </strong>
              <span>Success Rate</span>
            </div>
          </div>
        )}
      </div>
      <div className='mon-donut-legend'>
        <span>
          <i style={{ background: '#10b981' }} /> {successPct.toFixed(1)}% Success
        </span>
        <span>
          <i style={{ background: '#fcd34d' }} /> {pendingPct.toFixed(1)}% Pending
        </span>
        <span>
          <i style={{ background: '#ef4444' }} /> {failedPct.toFixed(1)}% Failed
        </span>
      </div>
    </div>
  )
}
