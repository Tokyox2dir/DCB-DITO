import { useState, type ReactNode } from 'react'

import CssBaseline from '@mui/material/CssBaseline'
import { TextField, OutlinedInput, Select, MenuItem } from '@mui/material'
import Button from '@mui/material/Button'
// import AppNavbar from '../components/AppNavbar'
// import Header from '../components/Header'
import CustomizedDataGrid from '../components/CustomizedDataGrid'
// import MainGrid from '../components/MainGrid'
// import SideMenu from '../components/SideMenu'
// import AppTheme from '../styles/theme/shared-theme/AppTheme'

import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { Select as AntSelect } from 'antd'

// interface SummaryProps {
//   type?: 'Hourly' | 'Daily' | 'Monthly'
// }

export default function Summary() {
  const [formData, setFormData] = useState({
    user_mdn: null,
    password: '',
    user_id: '',
    merchant_trx_id: null,
    trx_id: null,
    start_date: null,
    end_date: null,
    payment_method: '',
    payment_status: '',
    merchant: '',
    app: '',
    item_name: '',
    denom: null,
  })
  // const [value, setValue] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState<string[]>([])

  // const [summaryType, setSummaryType] = useState<string | undefined>(type)

  const names = [
    'Oliver Hansen',
    'Van Henry',
    'April Tucker',
    'Ralph Hubbard',
    'Omar Alexander',
    'Carlos Abbott',
    'Miriam Wagner',
    'Bradley Wilkerson',
    'Virginia Andrews',
    'Kelly Snyder',
  ]

  const handleSubmit = (e: any) => {
    e.preventDefault()
    console.log('Form data submitted:', formData)
  }

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handlePaymentChange = (event: any) => {
    const {
      target: { value },
    } = event
    setPaymentMethod(typeof value === 'string' ? value.split(',') : value)
  }

  const field = (label: string, control: ReactNode) => (
    <div className='rpt-stack'>
      <span className='rpt-label'>{label}</span>
      {control}
    </div>
  )

  const antSelect = (id: string, multiple = false) => (
    <AntSelect
      mode={multiple ? 'multiple' : undefined}
      id={id}
      value={paymentMethod}
      onChange={(val) => setPaymentMethod(val)}
      style={{ width: '100%' }}
      showSearch
      allowClear
      filterOption={(input, option: any) => String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
    >
      {names.map((name) => (
        <AntSelect.Option key={name} value={name}>
          {name}
        </AntSelect.Option>
      ))}
    </AntSelect>
  )

  return (
    <>
      <CssBaseline enableColorScheme />

      <div className='rpt-page'>
        {/* <Header /> */}

        <section className='rpt-card'>
          <div className='rp-card-head'>
            <div>
              <h3>Filter Transaction</h3>
              <small>All fields are required.</small>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className='rpt-form'>
              {field(
                'User MDN',
                <TextField
                  variant='outlined'
                  fullWidth
                  name='user_mdn'
                  type='number'
                  value={formData.user_mdn}
                  onChange={handleChange}
                  required
                />,
              )}
              {field(
                'User ID',
                <TextField variant='outlined' fullWidth name='user' value={formData.password} onChange={handleChange} required />,
              )}
              {field(
                'Merchant Trx ID',
                <TextField
                  variant='outlined'
                  fullWidth
                  name='merchant_trx_id'
                  value={formData.merchant_trx_id}
                  onChange={handleChange}
                  required
                />,
              )}
              {field(
                'Transaction ID',
                <TextField variant='outlined' fullWidth name='trx_id' value={formData.trx_id} onChange={handleChange} required />,
              )}
              {field(
                'Start Date',
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  {/* <DatePicker
                    label='Select date'
                    value={value}
                    onChange={(newValue) => {
                      setValue(newValue)
                    }}
                    renderInput={(params: any) => <TextField {...params} />}
                  /> */}
                </LocalizationProvider>,
              )}
              {field(
                'End Date',
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  {/* <DatePicker
                    label='Select date'
                    value={value}
                    onChange={(newValue) => {
                      setValue(newValue)
                    }}
                    renderInput={(params) => <TextField {...params} />}
                  /> */}
                </LocalizationProvider>,
              )}
              {field('Payment Method', antSelect('payment-method', true))}
              {field(
                'Status',
                <Select
                  labelId='demo-multiple-name-label'
                  id='demo-multiple-name'
                  multiple
                  value={paymentMethod}
                  onChange={handlePaymentChange}
                  input={<OutlinedInput />}
                  // MenuProps={MenuProps}
                >
                  {names.map((name) => (
                    <MenuItem key={name} value={name}>
                      {name}
                    </MenuItem>
                  ))}
                </Select>,
              )}
              {field('Merchant', antSelect('merchant'))}
              {field('App', antSelect('app'))}
              {field(
                'Item Name',
                <TextField
                  variant='outlined'
                  fullWidth
                  name='item_name'
                  type='number'
                  value={formData.item_name}
                  onChange={handleChange}
                  required
                />,
              )}
              {field(
                'Denom',
                <TextField variant='outlined' fullWidth name='denom' value={formData.denom} onChange={handleChange} required />,
              )}
            </div>
            <div className='rpt-form-foot'>
              <Button type='submit' variant='contained' color='primary'>
                Submit
              </Button>
            </div>
          </form>
        </section>

        {/* {data.map((card, index) => (
            <StatCard {...card} />
          ))} */}
        {/* <HighlightedCard /> <SessionsChart /> <PageViewsBarChart /> */}

        <section>
          <h3 className='sf-section-title'>Details</h3>
          <CustomizedDataGrid />
        </section>
      </div>
    </>
  )
}
