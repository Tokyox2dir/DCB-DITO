import { LineChart } from '@mui/x-charts/LineChart'
import dayjs from 'dayjs'

const keyToLabel: { [key: string]: string } = {
  success: 'Success',
  canceled: 'Canceled',
  failed: 'Failed',
}
const mockData = [
  { datetime: 1740787200, success: 3804, canceled: 2500, failed: 2767 },
  { datetime: 1740873600, success: 4336, canceled: 1940, failed: 2826 },
  { datetime: 1740960000, success: 4654, canceled: 1938, failed: 1000 },
  { datetime: 1741046400, success: 4591, canceled: 2079, failed: 2825 },
  { datetime: 1741132800, success: 4755, canceled: 1274, failed: 2790 },
  { datetime: 1741219200, success: 3009, canceled: 2889, failed: 2811 },
  { datetime: 1741305600, success: 3005, canceled: 1707, failed: 2989 },
  { datetime: 1741392000, success: 3089, canceled: 2747, failed: 2893 },
  { datetime: 1741478400, success: 4992, canceled: 1781, failed: 2798 },
  { datetime: 1741564800, success: 4893, canceled: 2351, failed: 2705 },
  { datetime: 1741651200, success: 4641, canceled: 1795, failed: 2064 },
  { datetime: 1741737600, success: 4654, canceled: 1302, failed: 2914 },
  { datetime: 1741824000, success: 3327, canceled: 4500, failed: 500 },
]

// Status series use the console status tokens, so the chart follows light and dark mode.
const seriesColor: { [key: string]: string } = {
  success: 'var(--positive)',
  canceled: 'var(--warning)',
  failed: 'var(--negative)',
}

function Chart() {
  return (
    <section className='rpt-card'>
      <div className='rp-card-head'>
        <div>
          <h3>Transactions by status</h3>
          <small>Daily count per status</small>
        </div>
        <ul className='rpt-legend' aria-label='Legend'>
          {Object.keys(keyToLabel).map((key) => (
            <li key={key}>
              <i style={{ ['--key' as string]: seriesColor[key] }} />
              {keyToLabel[key]}
            </li>
          ))}
        </ul>
      </div>
      <div className='rpt-chart'>
        <LineChart
          colors={Object.keys(keyToLabel).map((key) => seriesColor[key])}
          dataset={mockData}
          xAxis={[
            {
              dataKey: 'datetime',
              scaleType: 'time',
              valueFormatter: (date) => dayjs(date * 1000).format('DD MMM'),
            },
          ]}
          series={Object.keys(keyToLabel).map((key) => ({
            dataKey: key,
            label: keyToLabel[key],
            showMark: false,
            curve: 'monotoneX' as const,
          }))}
          height={340}
          margin={{ left: 48, right: 12, top: 12, bottom: 28 }}
          grid={{ horizontal: true }}
          slotProps={{ legend: { hidden: true } }}
          sx={{ '& .MuiLineElement-root': { strokeWidth: 2 } }}
        />
      </div>
    </section>
  )
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)

const clientTransaction = [
  {
    name: 'Client 1',
    total: 80,
  },
  {
    name: 'Client 2',
    total: 809,
  },
  {
    name: 'Client 3',
    total: 100,
  },
]

const SummaryAdmin = () => {
  return (
    <div className='rpt-page'>

      <div className='rpt-kpis' style={{ ['--kpi-cols' as string]: clientTransaction.length + 1 }}>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Total transaction all client</span>
          <span className='rpt-kpi-value'>{formatNumber(1000)}</span>
          <span className='rpt-kpi-sub'>{clientTransaction.length} clients</span>
        </div>
        {clientTransaction.map((item) => (
          <div className='rpt-kpi' key={item.name}>
            <span className='rpt-kpi-label'>{item.name}</span>
            <span className='rpt-kpi-value'>{formatNumber(item.total)}</span>
            <span className='rpt-kpi-sub'>Transactions</span>
          </div>
        ))}
      </div>

      <Chart />
    </div>
  )
}

export default SummaryAdmin
