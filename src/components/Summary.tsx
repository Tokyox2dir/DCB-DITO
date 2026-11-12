import { useState } from 'react'

import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Select from '@mui/material/Select'
import { ChevronRight } from '@mui/icons-material'

type Status = 'success' | 'failed' | 'canceled'
interface Props {
  status: Status
  value: number | undefined
}

// Status is a small dot in the status colour; the card itself stays neutral.
const getStatus = (status: Status) => {
  switch (status) {
    case 'failed':
      return { label: 'Failed', tone: 'negative' }
    case 'success':
      return { label: 'Success', tone: 'positive' }
    case 'canceled':
      return { label: 'Canceled', tone: 'warning' }
  }
}

const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num)

const SummaryCard = ({ status, value }: Props) => {
  const { label, tone } = getStatus(status)

  return (
    <div className='rpt-kpi'>
      <span className='rpt-kpi-label'>
        <i className={`rpt-dot ${tone}`} />
        {label}
      </span>
      <span className='rpt-kpi-value'>{value === undefined ? <Skeleton width={100} /> : formatNumber(value)}</span>
      <span className='rpt-kpi-sub'>
        <Button sx={{ minHeight: 0, height: 22, px: 0 }} size='small' variant='text' endIcon={<ChevronRight />}>
          View Detail
        </Button>
      </span>
    </div>
  )
}

const Summary = () => {
  const [freq, setFreq] = useState('daily')
  const [paymentMethod, setPaymentMethod] = useState('all')

  return (
    <div className='rpt-page'>
      <div className='rpt-head'>
        <div>
          <h2 className='rpt-title'>Summary</h2>
        </div>
        <div className='rpt-actions'>
          <label className='rpt-field' htmlFor='paymentMethod'>
            <span>Payment Method</span>
            <Select
              sx={{ width: { xs: '100%', sm: 140 } }}
              id='paymentMethod'
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <MenuItem value='all'>All</MenuItem>
              <MenuItem value='ovo'>OVO</MenuItem>
              <MenuItem value='qris'>Qris</MenuItem>
              <MenuItem value='pulsa'>Pulsa</MenuItem>
            </Select>
          </label>
          <label className='rpt-field' htmlFor='frequency'>
            <span>Frequency</span>
            <Select
              sx={{ width: { xs: '100%', sm: 120 } }}
              id='frequency'
              value={freq}
              onChange={(event) => setFreq(event.target.value)}
            >
              <MenuItem value='daily'>Daily</MenuItem>
              <MenuItem value='monthly'>Monthly</MenuItem>
            </Select>
          </label>
          <Button variant='contained' color='primary'>
            Export Data
          </Button>
        </div>
      </div>

      <div className='rpt-kpis' style={{ ['--kpi-cols' as string]: 5 }}>
        <SummaryCard status='success' value={222} />
        <SummaryCard status='canceled' value={11} />
        <SummaryCard status='failed' value={9289} />
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Total Transactions</span>
          <span className='rpt-kpi-value'>{formatNumber(10000)}</span>
        </div>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Total Revenue</span>
          <span className='rpt-kpi-value'>${formatNumber(873337)}</span>
        </div>
      </div>
    </div>
  )
}

export default Summary
