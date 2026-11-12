import { useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import type { LiveKpi } from './MonitoringKpiCards'
import { chartTooltip, useChartTokens } from './VolumePerHourChart'

ChartJS.register(ArcElement, Tooltip, Legend)

type Props = {
  kpi: LiveKpi
  loading?: boolean
}

export default function StatusBreakdown({ kpi, loading }: Props) {
  const t = useChartTokens()

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
        backgroundColor: sum ? [t.positive, t.warning, t.negative] : [t.raised],
        borderColor: t.surface,
        borderWidth: sum ? 2 : 0,
        hoverOffset: 3,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '78%',
    plugins: {
      legend: { display: false },
      tooltip: {
        ...chartTooltip(t),
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
          <h4>Status Breakdown</h4>
          <small>Success, pending and failed</small>
        </div>
      </div>
      <div className='mon-donut-body'>
        {loading && sum === 0 ? (
          <div className='mon-panel-empty'>Loading…</div>
        ) : (
          <div className='mon-donut-wrap'>
            <Doughnut data={data} options={options} />
            <div className='mon-donut-center'>
              <strong className={successPct > 0 ? 'good' : ''}>{successPct.toFixed(1)}%</strong>
              <span>Success Rate</span>
            </div>
          </div>
        )}
      </div>
      <div className='mon-donut-legend'>
        <span>
          <i className='g' /> Success <b>{successPct.toFixed(1)}%</b>
        </span>
        <span>
          <i className='y' /> Pending <b>{pendingPct.toFixed(1)}%</b>
        </span>
        <span>
          <i className='r' /> Failed <b>{failedPct.toFixed(1)}%</b>
        </span>
      </div>
    </div>
  )
}
