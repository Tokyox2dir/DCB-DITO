// import type {} from '@mui/x-date-pickers/themeAugmentation';
// import type {} from '@mui/x-charts/themeAugmentation';
// import type {} from '@mui/x-data-grid/themeAugmentation';
// import type {} from '@mui/x-tree-view/themeAugmentation';
import { useState, useEffect } from 'react'
import { TextField, OutlinedInput, Select, MenuItem, Tooltip } from '@mui/material'
import Button from '@mui/material/Button'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { Table, DatePicker, Select as AntSelect } from 'antd'

import Badge from '../components/Badge'
import { ColumnType } from 'antd/es/table'
import formatRupiah from '../utils/FormatRupiah'

import axios from 'axios'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuth } from '../provider/AuthProvider'

dayjs.extend(utc)
dayjs.extend(timezone)
import { jwtDecode } from 'jwt-decode'
import { useClient } from '../context/ClientContext'

const columns: ColumnType<any>[] = [
  {
    title: 'Merchant Transaction ID',
    dataIndex: 'merchant_transaction_id',
    key: 'merchant_transaction_id',
    render: (text: string) => (
      <Tooltip title='Copy Merchant Transaction ID'>
        <button type='button' className='tx-copy tx-mono' onClick={() => navigator.clipboard.writeText(text)}>
          {text}
        </button>
      </Tooltip>
    ),
  },
  {
    title: 'User MDN',
    dataIndex: 'user_mdn',
    key: 'user_mdn',
    render: (text: string) => <span className='tx-mono'>{text}</span>,
  },
  {
    title: 'Date',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (text: string) => (
      <span className='tx-mono dim'>{text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</span>
    ),
  },
  {
    title: 'Payment Method',
    dataIndex: 'payment_method',
    key: 'payment_method',
    render: (paymentMethod: string) => {
      switch (paymentMethod) {
        case 'xl_airtime':
          paymentMethod = 'XL'
          break
        case 'telkomsel_airtime':
          paymentMethod = 'Telkomsel'
          break
        case 'smartfren_airtime':
          paymentMethod = 'Smartfren'
          break
        case 'indosat_airtime':
          paymentMethod = 'Indosat'
          break
        case 'three_airtime':
          paymentMethod = 'Tri'
          break
      }
      return <span className='tx-method'>{paymentMethod}</span>
    },
  },
  {
    title: 'App',
    dataIndex: 'app_name',
    key: 'app_name',
  },
  {
    title: 'Denom',
    align: 'right',
    dataIndex: 'amount',
    key: 'amount',
    render: (denom: number) => {
      return <span className='tx-amount'>{formatRupiah(denom)}</span>
    },
  },
  {
    title: 'Status',
    dataIndex: 'status_code',
    key: 'status_code',
    render: (status: number) => {
      let color: 'success' | 'error' | 'pending' | 'waiting-callback' = 'pending'
      let text = 'Pending'

      if (status === 1000) {
        color = 'success'
        text = 'Success'
      } else if (status === 1005) {
        color = 'error'
        text = 'Failed'
      } else if (status === 1003) {
        color = 'waiting-callback'
        text = 'Pending notification'
      }

      return <Badge color={color} text={text} />
    },
  },
  {
    title: 'Item Name',
    dataIndex: 'item_name',
    key: 'item_name',
  },
  {
    title: 'Item ID',
    dataIndex: 'item_id',
    key: 'item_id',
    render: (text: string) => <span className='tx-mono dim'>{text}</span>,
  },
  {
    title: 'User ID',
    dataIndex: 'user_id',
    key: 'user_id',
    render: (text: string) => <span className='tx-mono dim'>{text}</span>,
  },
  {
    title: '',
    key: 'action',
    width: 72,
    align: 'right',
    fixed: 'right',
    render: (record: any) => (
      <button
        type='button'
        className='tx-link-btn'
        onClick={() => {
          window.location.href = `/merchant-transaction/${record.u_id}` // Ganti dengan rute yang sesuai
        }}
      >
        Detail
      </button>
    ),
  },
]

export default function TransactionsMerchant() {
  const [formData, setFormData] = useState<{
    user_mdn: string
    user_id: string
    merchant_transaction_id: string
    transaction_id: string
    payment_method: string[]
    status: number | string | null
    start_date: dayjs.Dayjs | null
    end_date: dayjs.Dayjs | null
    selected_app_id: string
    app_name: string
    item_name: string
    denom: number | null
  }>({
    user_mdn: '',
    user_id: '',
    merchant_transaction_id: '',
    transaction_id: '',
    payment_method: [],
    status: null,
    start_date: dayjs().startOf('day'),
    end_date: dayjs().endOf('day'),
    selected_app_id: '',
    app_name: '',
    item_name: '',
    denom: null,
  })

  const handleReset = () => {
    setFormData({
      user_mdn: '',
      user_id: '',
      merchant_transaction_id: '',
      transaction_id: '',
      payment_method: [],
      status: null,
      start_date: dayjs().startOf('day'),
      end_date: dayjs().endOf('day'),
      selected_app_id: '',
      app_name: '',
      item_name: '',
      denom: null,
    })
    setIsFiltered(false)

    setResetTrigger((prev) => prev + 1)
  }

  const [data, setData] = useState([])
  // const [value, setValue] = useState(null)
  // const [paymentMethod] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [, setIsFiltered] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [total, setTotal] = useState(0)
  const [loadingExport, setLoadingExport] = useState(false)
  const [exportCooldown, setExportCooldown] = useState(false)
  const [exportCountdown, setExportCountdown] = useState(0)
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const { token, apiUrl, appId, appKey } = useAuth()
  const { client } = useClient()
  const decoded: any = jwtDecode(token as string)
  const { RangePicker } = DatePicker

  const denomList = [3000, 5000, 10000, 15000, 20000, 25000, 30000, 50000, 100000]

  const fetchData = async (page = 1, limit = 10) => {
    try {
      const start_date = formData.start_date
        ? dayjs
            .tz(formData.start_date.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta')
            .utc()
            .format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null

      const end_date = formData.end_date
        ? dayjs
            .tz(formData.end_date.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta')
            .utc()
            .format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null

      const statusParam = formData.status === 1000 ? '1000,1003' : formData.status

      const response = await axios.get(`${apiUrl}/merchant/transactions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          appkey: appKey,
          appid: appId,
        },
        params: {
          page: page,
          limit: limit,
          start_date,
          end_date,
          user_mdn: formData.user_mdn,
          user_id: formData.user_id,
          merchant_transaction_id: formData.merchant_transaction_id,
          transaction_id: formData.transaction_id,
          selected_app_id: formData.selected_app_id,
          app_name: formData.app_name,
          payment_method: formData.payment_method.join(','),
          status: statusParam,
          item_name: formData.item_name,
          denom: formData.denom,
        },
      })
      setData(response.data.data)

      setTotal(response.data.pagination.total_items)

      // const filtered = response.data.data.filter((item: any) => {
      //   // if (item.status_code == formData.status) {
      //   console.log('Tes:', item.status_code)
      //   console.log('formdata status:', formData.status)
      //   // }
      //   if (formData.status) {
      //     return item.status_code == formData.status
      //   }
      //   return true // Jika tidak ada filter, ambil semua
      // })

      // setFilteredData(filtered)
      // console.log('status:', formData.status)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  useEffect(() => {
    if (decoded.role !== 'merchant') {
      window.location.href = '/merchant-transactions'
    }

    fetchData(currentPage, pageSize)
  }, [currentPage, pageSize, resetTrigger, appId, appKey])

  const routes = [
    { name: 'All', value: '' },
    { name: 'Xl', value: 'xl_airtime' },
    { name: 'Telkomsel', value: 'telkomsel_airtime' },
    { name: 'Tri', value: 'three_airtime' },
    { name: 'Indosat', value: 'indosat_airtime' },
    { name: 'Smartfren', value: 'smartfren_airtime' },
    { name: 'Gopay', value: 'gopay' },
    { name: 'Shopeepay', value: 'shopeepay' },
    { name: 'Qris', value: 'qris' },
    { name: 'Ovo', value: 'ovo' },
    { name: 'Dana', value: 'dana' },
    { name: 'Va Bca', value: 'va_bca' },
    { name: 'Va BRI', value: 'va_bri' },
    { name: 'Va Mandiri', value: 'va_mandiri' },
    { name: 'Va Permata', value: 'va_permata' },
    { name: 'Va BNI', value: 'va_bni' },
    { name: 'Va Sinarmas', value: 'va_sinarmas' },
  ]

  const status = [
    { name: 'All', value: '' },
    { name: 'Success', value: 1000 },
    { name: 'Pending', value: 1001 },
    { name: 'Failed', value: 1005 },
  ]

  const handleSubmit = (e: any) => {
    e.preventDefault() // Prevents the default form submission behaviour
    // Process and send formData to the server or perform other actions
    // console.log('filteredData: ', filteredData)
    setIsFiltered(true)
    fetchData()
  }

  const handleChange = (e: any) => {
    const { name, value } = e.target
    // Handle multiple select for payment_method
    if (name === 'payment_method') {
      setFormData({ ...formData, [name]: typeof value === 'string' ? value.split(',') : value })
    } else if (name === 'app_name') {
      // When app_name is selected, also set selected_app_id
      const selectedApp = client?.apps?.find((app) => app.app_name === value)
      setFormData({
        ...formData,
        app_name: value,
        selected_app_id: selectedApp?.appid || '',
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  // const handlePaymentChange = (event: SelectChangeEvent<typeof paymentMethod>) => {
  //   const {
  //     target: { value },
  //   } = event
  //   setPaymentMethod(
  //     // On autofill we get a stringified value.
  //     typeof value === 'string' ? value.split(',') : value,
  //   )
  // }

  const handleExport = async (type: string) => {
    try {
      const start = formData.start_date ? dayjs(formData.start_date) : null
      const end = formData.end_date ? dayjs(formData.end_date) : null

      if (!start || !end) {
        alert('Please select start date and end date')
        return
      }

      setLoadingExport(true)

      const start_date = start.format('YYYY-MM-DD HH:mm:ss')
        ? dayjs.tz(start.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta').utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null
      const end_date = end.format('YYYY-MM-DD HH:mm:ss')
        ? dayjs.tz(end.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta').utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null

      const statusParam = formData.status === 1000 ? '1000,1003' : formData.status

      const response = await axios.get(`${apiUrl}/export/transactions-merchant`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          appkey: decoded.appkey,
          appid: decoded.appid,
        },
        params: {
          export_csv: type == 'csv' ? 'true' : 'false',
          export_excel: type == 'excel' ? 'true' : 'false',
          status: statusParam,
          payment_method: formData.payment_method[0] || '',
          app_id: formData.selected_app_id || '',
          start_date,
          end_date,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      const extension = type == 'csv' ? 'csv' : 'xlsx'

      link.setAttribute('download', `transactions.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Start 10-second cooldown
      setExportCooldown(true)
      setExportCountdown(10)
      const timer = setInterval(() => {
        setExportCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setExportCooldown(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setLoadingExport(false)
    }
  }

  const handleDateChange = (dates: any) => {
    const [start, end] = dates
    setFormData({
      ...formData,
      start_date: start,
      end_date: end,
    })
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setCurrentPage(page)
    setPageSize(pageSize)
  }

  // Display only: how many of the filters behind "More filters" are set.
  const moreFilterCount = [formData.user_id, formData.payment_method.length, formData.denom].filter(Boolean).length

  return (
    <div className='tx-page'>
      <header className='tx-head'>
        <div className='tx-actions'>
          <Button
            variant='outlined'
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => handleExport('csv')}
            disabled={loadingExport || total > 500000 || exportCooldown}
          >
            {loadingExport ? 'Exporting...' : exportCooldown ? `Export CSV (${exportCountdown}s)` : 'Export CSV'}
          </Button>
          <Button
            variant='contained'
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={loadingExport || total > 30000 || exportCooldown}
            onClick={() => handleExport('excel')}
          >
            {loadingExport ? 'Exporting...' : exportCooldown ? `Export Excel (${exportCountdown}s)` : 'Export Excel'}
          </Button>
        </div>
      </header>

      <section className='tx-card'>
        <form onSubmit={handleSubmit}>
          <div className='tx-filterbar'>
            <RangePicker
              className='tx-f-date'
              showTime={{ format: 'HH:mm:ss' }}
              format='YYYY-MM-DD HH:mm'
              onChange={handleDateChange}
              value={[formData.start_date, formData.end_date]}
            />
            <TextField
              className='tx-f-grow'
              variant='outlined'
              name='merchant_transaction_id'
              placeholder='Merchant Trx ID'
              inputProps={{ 'aria-label': 'Merchant Trx ID' }}
              value={formData.merchant_transaction_id}
              onChange={handleChange}
            />
            <TextField
              className='tx-f-sm'
              variant='outlined'
              name='user_mdn'
              type='number'
              placeholder='User MDN'
              inputProps={{ 'aria-label': 'User MDN' }}
              value={formData.user_mdn}
              onChange={handleChange}
            />
            <AntSelect
              className='tx-f-md'
              id='app_name'
              aria-label='App name'
              value={formData.app_name || undefined}
              onChange={(val) => handleChange({ target: { name: 'app_name', value: val || '' } })}
              showSearch
              allowClear
              filterOption={(input, option: any) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='All Apps'
            >
              {client?.apps?.map((app) => (
                <AntSelect.Option key={app.id} value={app.app_name}>
                  {app.app_name}
                </AntSelect.Option>
              ))}
            </AntSelect>
            <Select
              className='tx-f-sm'
              id='status'
              onChange={handleChange}
              name='status'
              value={formData.status}
              input={<OutlinedInput inputProps={{ 'aria-label': 'Status' }} />}
              displayEmpty
              renderValue={(v: any) =>
                v === null || v === undefined || v === '' ? (
                  <span className='tx-placeholder'>All statuses</span>
                ) : (
                  (status.find((s) => s.value === v)?.name ?? String(v))
                )
              }
            >
              {status.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
            <Button
              type='button'
              variant='outlined'
              className='tx-more-btn'
              aria-expanded={showMoreFilters}
              startIcon={<TuneRoundedIcon />}
              onClick={() => setShowMoreFilters((v) => !v)}
            >
              More filters
              {moreFilterCount > 0 && <span className='tx-more-count'>{moreFilterCount}</span>}
            </Button>
            <div className='tx-filter-btns'>
              <Button type='button' variant='outlined' onClick={handleReset}>
                Reset
              </Button>
              <Button type='submit' variant='contained'>
                Apply
              </Button>
            </div>
          </div>

          {showMoreFilters && (
            <div className='tx-filter-more'>
              <div className='tx-field'>
                <label htmlFor='f-user-id'>User ID</label>
                <TextField
                  id='f-user-id'
                  variant='outlined'
                  fullWidth
                  name='user_id'
                  value={formData.user_id}
                  onChange={handleChange}
                />
              </div>
              <div className='tx-field'>
                <label htmlFor='payment-method'>Payment Method</label>
                <AntSelect
                  mode='multiple'
                  id='payment-method'
                  value={formData.payment_method}
                  onChange={(val) => handleChange({ target: { name: 'payment_method', value: val } })}
                  style={{ width: '100%' }}
                  maxTagCount='responsive'
                  showSearch
                  allowClear
                  filterOption={(input, option: any) =>
                    String(option?.children ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  placeholder='Select Payment Method'
                >
                  {routes.map((method) => (
                    <AntSelect.Option key={method.value} value={method.value}>
                      {method.name}
                    </AntSelect.Option>
                  ))}
                </AntSelect>
              </div>
              <div className='tx-field'>
                <label htmlFor='denom'>Denom</label>
                <Select
                  fullWidth
                  id='denom'
                  name='denom'
                  type='number'
                  value={formData.denom}
                  onChange={handleChange}
                  input={<OutlinedInput />}
                  displayEmpty
                  renderValue={(v: any) =>
                    v === null || v === undefined ? (
                      <span className='tx-placeholder'>Any</span>
                    ) : v === 0 ? (
                      'All'
                    ) : (
                      String(v)
                    )
                  }
                >
                  <MenuItem key='all' value={0}>
                    All
                  </MenuItem>
                  {denomList.map((denom) => (
                    <MenuItem key={denom} value={denom}>
                      {denom}
                    </MenuItem>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </form>

        <div className='tx-card-head'>
          <h3>Merchant Transaction Details</h3>
          <span className='tx-count'>{total.toLocaleString('id-ID')} items</span>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total >= 20000 ? 20000 : total,
            onChange: handlePageChange,
            showTotal: (_t, range) => `${range[0]}–${range[1]} of ${total.toLocaleString('id-ID')}`,
          }}
          size='small'
          className='transactions-table'
          rowKey={(record) => record.u_id || record.merchant_transaction_id || record.id}
          scroll={{ x: 'max-content' }}
        />
      </section>
    </div>
  )
}
