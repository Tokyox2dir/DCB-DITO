import { useState } from 'react'
import { useParams } from 'react-router-dom'
import Grid from '@mui/material/Grid2'

import CssBaseline from '@mui/material/CssBaseline'
import { TextField, OutlinedInput, Select, MenuItem } from '@mui/material'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
// import AppNavbar from '../components/AppNavbar'
// import Header from '../components/Header'
import CustomizedDataGrid from '../components/CustomizedDataGrid'
// import MainGrid from '../components/MainGrid'
// import SideMenu from '../components/SideMenu'
import Card from '@mui/material/Card'
// import CardContent from '@mui/material/CardContent'
import { FormLabel } from '@mui/material'

import Typography from '@mui/material/Typography'
import { capitalizeLetter } from '../utils/Capitalize'
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
  const { type } = useParams()

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

  return (
    <>
      <CssBaseline enableColorScheme />

      <Box
        component='main'
        sx={{
          flexGrow: 1,
          backgroundColor: 'background.default',
          overflow: 'auto',
          pt: 4,
        }}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: 'center',
            mx: 3,
            pb: 5,
            mt: { xs: 8, md: 0 },
          }}
        >
          {/* <Header /> */}
          <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
            {/* cards */}
            <Typography component='h2' variant='h6' sx={{ mb: 2 }}>
              Summary {capitalizeLetter(type)}
            </Typography>
            <Card variant='outlined'>
              <span className='font-semibold'>Filter Transaction</span>
              <div>
                <form onSubmit={handleSubmit}>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>User MDN</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='user_mdn'
                        type='number'
                        value={formData.user_mdn}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>User ID</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='user'
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>Merchant Trx ID</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='merchant_trx_id'
                        value={formData.merchant_trx_id}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>Transaction ID</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='trx_id'
                        value={formData.trx_id}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>Start Date</FormLabel>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {/* <DatePicker
                          label='Select date'
                          value={value}
                          onChange={(newValue) => {
                            setValue(newValue)
                          }}
                          renderInput={(params: any) => <TextField {...params} />}
                        /> */}
                      </LocalizationProvider>
                    </Grid>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>End Date</FormLabel>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {/* <DatePicker
                          label='Select date'
                          value={value}
                          onChange={(newValue) => {
                            setValue(newValue)
                          }}
                          renderInput={(params) => <TextField {...params} />}
                        /> */}
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>Payment Method</FormLabel>

                      <AntSelect
                        mode='multiple'
                        id='payment-method'
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val)}
                        style={{ width: '100%', minHeight: 56 }}
                        showSearch
                        allowClear
                        filterOption={(input, option: any) =>
                          String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {names.map((name) => (
                          <AntSelect.Option key={name} value={name}>
                            {name}
                          </AntSelect.Option>
                        ))}
                      </AntSelect>
                    </Grid>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>Status</FormLabel>

                      <Select
                        labelId='demo-multiple-name-label'
                        id='demo-multiple-name'
                        multiple
                        value={paymentMethod}
                        onChange={handlePaymentChange}
                        input={<OutlinedInput label='Name' />}
                        // MenuProps={MenuProps}
                      >
                        {names.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>Merchant</FormLabel>

                      <AntSelect
                        id='merchant'
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val)}
                        style={{ width: '100%', minHeight: 56 }}
                        showSearch
                        allowClear
                        filterOption={(input, option: any) =>
                          String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {names.map((name) => (
                          <AntSelect.Option key={name} value={name}>
                            {name}
                          </AntSelect.Option>
                        ))}
                      </AntSelect>
                    </Grid>
                    <Grid size={6} className='flex flex-col'>
                      <FormLabel className='font-medium'>App</FormLabel>

                      <AntSelect
                        id='app'
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val)}
                        style={{ width: '100%', minHeight: 56 }}
                        showSearch
                        allowClear
                        filterOption={(input, option: any) =>
                          String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      >
                        {names.map((name) => (
                          <AntSelect.Option key={name} value={name}>
                            {name}
                          </AntSelect.Option>
                        ))}
                      </AntSelect>
                    </Grid>
                  </Grid>
                  <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>Item Name</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='item_name'
                        type='number'
                        value={formData.item_name}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                    <Grid size={6}>
                      <FormLabel className='font-medium'>Denom</FormLabel>
                      <TextField
                        variant='outlined'
                        fullWidth
                        name='denom'
                        value={formData.denom}
                        onChange={handleChange}
                        required
                      />
                    </Grid>
                  </Grid>
                  <Button type='submit' className='mt-4' variant='contained' color='primary'>
                    Submit
                  </Button>
                </form>
              </div>
            </Card>
            <Grid container spacing={2} columns={12} sx={{ mb: (theme) => theme.spacing(2) }}>
              {/* {data.map((card, index) => (
                  <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard {...card} />
                  </Grid>
                ))} */}
              <Grid size={{ xs: 12, sm: 6, lg: 3 }}>{/* <HighlightedCard /> */}</Grid>
              <Grid size={{ xs: 12, md: 6 }}>{/* <SessionsChart /> */}</Grid>
              <Grid size={{ xs: 12, md: 6 }}>{/* <PageViewsBarChart /> */}</Grid>
            </Grid>
            <Typography component='h2' variant='h6' sx={{ mb: 2 }}>
              Details
            </Typography>
            <Grid container spacing={2} columns={2}>
              <Grid size={{ xs: 12, lg: 9 }}>
                <CustomizedDataGrid />
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </Box>
    </>
  )
}
