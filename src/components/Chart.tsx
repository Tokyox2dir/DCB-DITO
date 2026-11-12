import { useTheme } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

import { LineChart } from '@mui/x-charts/LineChart'
import dayjs from 'dayjs'

const keyToLabel: { [key: string]: string } = {
  success: 'Success',
  canceled: 'Canceled',
  failed: 'Failed',
}

interface ChartData {
  datetime: number
  success: number
  canceled: number
  failed: number
  [key: string]: number
}

interface ChartProps {
  data?: ChartData[]
  height?: number
  title?: string
}

function Chart({ data = [], height = 360, title }: ChartProps) {
  const theme = useTheme()

  return (
    <Card variant='outlined' sx={{ width: '100%' }}>
      <CardContent>
        {title && <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 'bold' }}>{title}</div>}
        <LineChart
          colors={[theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main]}
          dataset={data}
          xAxis={[
            {
              dataKey: 'datetime',
              scaleType: 'time',
              valueFormatter: (date) => dayjs(date * 1000).format('DD MMM'),
              tickNumber: data.length > 7 ? 7 : data.length,
            },
          ]}
          series={Object.keys(keyToLabel).map((key) => ({
            dataKey: key,
            label: keyToLabel[key],
            showMark: true,
            area: false,
          }))}
          height={height}
          margin={{ left: 50, right: 20, bottom: 20 }}
          grid={{ horizontal: true }}
          slotProps={{
            legend: {
              position: { vertical: 'top', horizontal: 'left' },
              labelStyle: {
                fontSize: 14,
              },
            },
          }}
          // tooltip prop dihapus karena 'formatter' tidak dikenali oleh tipe 'ChartsTooltipProps<"line">'
        />
      </CardContent>
    </Card>
  )
}

export default Chart
