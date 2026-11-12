import { paymentMethods } from '../utils/paymentMethods'
// import type {} from '@mui/x-date-pickers/themeAugmentation';
// import type {} from '@mui/x-charts/themeAugmentation';
// import type {} from '@mui/x-data-grid/themeAugmentation';
// import type {} from '@mui/x-tree-view/themeAugmentation';
import { useState, useEffect, useRef, useCallback } from 'react'
import { TextField, OutlinedInput, Select, MenuItem, Tooltip } from '@mui/material'
import Button from '@mui/material/Button'
import { Button as ButtonAnt } from 'antd'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import { Table, DatePicker, Modal, Select as AntSelect } from 'antd'
import { ColumnType } from 'antd/es/table'

import Badge from '../components/Badge'

import axios from 'axios'
import dayjs from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import { jwtDecode } from 'jwt-decode'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import formatRupiah from '../utils/FormatRupiah'
import { useMerchants } from '../context/MerchantContext'

dayjs.extend(utc)
dayjs.extend(timezone)

const copyCell = (text: string, label: string) =>
  text ? (
    <Tooltip title={`Copy ${label}`}>
      <button type='button' className='tx-copy tx-mono' onClick={() => navigator.clipboard.writeText(text)}>
        {text}
      </button>
    </Tooltip>
  ) : (
    <span className='tx-empty'>-</span>
  )

const columns: ColumnType<any>[] = [
  {
    title: 'Transaction ID',
    dataIndex: 'u_id',
    key: 'u_id',
    render: (text: string) => copyCell(text, 'Transaction ID'),
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
    title: 'Merchant',
    dataIndex: 'merchant_name',
    key: 'merchant_name',
  },
  {
    title: 'App',
    dataIndex: 'app_name',
    key: 'app_name',
    render: (text: string) => <span className='tx-dim'>{text}</span>,
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
      } else if (status == 1003) {
        color = 'waiting-callback'
        text = 'Waiting'
      }

      return <Badge color={color} text={text} />
    },
  },
  {
    title: 'Route',
    dataIndex: 'route',
    key: 'route',
    render: (text: string) => <span className='tx-mono dim'>{text}</span>,
  },

  {
    title: 'Fail Reason',
    dataIndex: 'fail_reason',
    key: 'fail_reason',
    render: (text: string) => (text ? <span className='tx-fail'>{text}</span> : <span className='tx-empty'>-</span>),
  },
  {
    title: 'Merchant Trx ID',
    dataIndex: 'merchant_transaction_id',
    key: 'merchant_transaction_id',
    render: (text: string) => copyCell(text, 'Merchant Trx ID'),
  },
  {
    title: 'Item Name',
    dataIndex: 'item_name',
    key: 'item_name',
  },
  {
    title: '',
    width: 72,
    key: 'action',
    align: 'right',
    fixed: 'right',
    render: (record: any) => (
      <button
        type='button'
        className='tx-link-btn'
        onClick={() => {
          window.location.href = `/transaction/${record.u_id}`
        }}
      >
        Detail
      </button>
    ),
  },
]

export default function Transactions() {
  const [formData, setFormData] = useState<{
    user_mdn: string
    user_id: string
    merchant_transaction_id: string
    transaction_id: string
    merchant_name: string[]
    payment_method: string[]
    payment_status: string
    status: number | null
    start_date: dayjs.Dayjs | null
    end_date: dayjs.Dayjs | null
    selected_app_id: string
    item_name: string
    denom: number | null
    otp: string
    keyword: string
  }>({
    user_mdn: '',
    user_id: '',
    merchant_transaction_id: '',
    transaction_id: '',
    merchant_name: [],
    payment_method: [],
    payment_status: '',
    status: null,
    start_date: dayjs().startOf('day'),
    end_date: dayjs().endOf('day'),
    selected_app_id: '',
    item_name: '',
    denom: null,
    otp: '',
    keyword: '',
  })

  const [data, setData] = useState([])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [isFiltered, setIsFiltered] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [isDateChanging, setIsDateChanging] = useState(false)
  const { token, apiUrl } = useAuth()
  const fetchDataRef = useRef<(page?: number, limit?: number) => Promise<void>>()
  const dateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const decoded: any = jwtDecode(token as string)
  const [loadingExport, setLoadingExport] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<any[]>([])
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const { merchants } = useMerchants()
  const { RangePicker } = DatePicker

  const isAlif = decoded.username == 'alifadmin'

  // Function to get app_ids from merchant names
  const getAppIdsFromMerchantNames = (merchantNames: string[]) => {
    if (isAlif) {
      return merchantNames // For Alif, return merchant names as is
    }

    const appIds: string[] = []
    merchantNames.forEach((merchantName) => {
      const merchant = merchants.find((m) => m.client_name === merchantName)
      if (merchant) {
        merchant.apps.forEach((app) => {
          appIds.push(app.appid)
        })
      }
    })
    return appIds
  }

  const merchantListAlif = [
    { id: 1, name: 'Evos Store' },
    { id: 2, name: 'Coda' },
  ]

  const appListAlif = [
    { id: 1, name: 'Evos Top Up' },
    { id: 2, name: 'Codashop' },
  ]

  const appList = merchants.flatMap((m) => m.apps)

  const denomList = [
    3000, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 70000, 75000, 100000, 125000, 150000, 200000,
    250000, 300000, 325000, 500000,
  ]

  // const denomList = [
  //   3000, 5000, 6000, 10000, 14000, 15000, 15800, 16338, 20000, 25000, 30000, 33000, 40000, 50000, 60000, 65000, 70000,
  //   75000, 100000, 125000, 130000, 150000, 200000, 250000, 300000, 325000, 500000, 700000, 1000000,
  // ]

  const fetchData = useCallback(
    async (page = 1, limit = 10) => {
      try {
        const start_date = formData.start_date
          ? dayjs(formData.start_date).utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
          : null

        const end_date = formData.end_date
          ? dayjs(formData.end_date).utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
          : null
        const response = await axios.get(`${apiUrl}/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
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
            app_id: formData.selected_app_id || getAppIdsFromMerchantNames(formData.merchant_name).join(','),
            payment_method: formData.payment_method.join(','),
            status: formData.status,
            item_name: formData.item_name,
            denom: formData.denom,
            otp: formData.otp,
            keyword: formData.keyword,
          },
        })

        const allData = response.data.data || []

        setData(allData)

        setTotal(response.data.pagination.total_items)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    },
    [formData, token, apiUrl, merchants, isAlif],
  )

  // Simpan referensi fetchData
  fetchDataRef.current = fetchData

  // useEffect untuk initial load dan reset (hindari re-fetch saat formData berubah)
  useEffect(() => {
    if (decoded.role === 'merchant') {
      window.location.href = '/merchant-transactions'
      return
    }

    fetchDataRef.current?.(currentPage, pageSize)
  }, [currentPage, pageSize, resetTrigger, decoded.role])

  // useEffect untuk auto-refresh (hindari ketergantungan pada formData/fetchData)
  useEffect(() => {
    if (decoded.role === 'merchant') {
      return
    }

    if (!isFiltered && !isDateChanging) {
      const interval = setInterval(() => {
        fetchDataRef.current?.(currentPage, pageSize)
      }, 20000)

      return () => clearInterval(interval)
    }
  }, [currentPage, pageSize, isFiltered, isDateChanging, decoded.role])

  // Cleanup timeout saat component unmount
  useEffect(() => {
    return () => {
      if (dateChangeTimeoutRef.current) {
        clearTimeout(dateChangeTimeoutRef.current)
      }
    }
  }, [])

  const routes = paymentMethods

  const status = [
    { name: 'All', value: '' },
    { name: 'Success', value: 1000 },
    { name: 'Pending', value: 1001 },
    { name: 'Waiting', value: 1003 },
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

    if (typeof name === 'string') {
      if (name === 'payment_method' || name === 'merchant_name') {
        const newValue = typeof value === 'string' ? value.split(',') : value
        setFormData({ ...formData, [name]: newValue })
      } else {
        setFormData({ ...formData, [name]: value })
      }
    }
  }

  const handleDateChange = (dates: any) => {
    const [start, end] = dates
    setIsDateChanging(true)
    setFormData({
      ...formData,
      start_date: start,
      end_date: end,
    })

    // Clear timeout sebelumnya jika ada
    if (dateChangeTimeoutRef.current) {
      clearTimeout(dateChangeTimeoutRef.current)
    }

    // Reset isDateChanging setelah 3 detik untuk memungkinkan auto-refresh kembali
    // Waktu lebih lama untuk memastikan user selesai memilih tanggal
    dateChangeTimeoutRef.current = setTimeout(() => {
      setIsDateChanging(false)
    }, 10000)
  }

  const handleReset = () => {
    // Clear timeout jika ada
    if (dateChangeTimeoutRef.current) {
      clearTimeout(dateChangeTimeoutRef.current)
    }

    setFormData({
      user_mdn: '',
      user_id: '',
      merchant_transaction_id: '',
      transaction_id: '',
      merchant_name: [],
      selected_app_id: '',
      payment_method: [],
      payment_status: '',
      status: null,
      item_name: '',
      denom: null,
      otp: '',
      keyword: '',
      start_date: dayjs().startOf('day'),
      end_date: dayjs().endOf('day'),
    })
    setIsFiltered(false)
    setIsDateChanging(false)
    setResetTrigger((prev) => prev + 1)
  }

  const handleExport = async (type: string) => {
    try {
      setLoadingExport(true)
      const start_date = formData.start_date
        ? dayjs(formData.start_date).utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null

      const end_date = formData.end_date
        ? dayjs(formData.end_date).utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]')
        : null

      const response = await axios.get(`${apiUrl}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          export_csv: type == 'csv' ? 'true' : 'false',
          export_excel: type == 'excel' ? 'true' : 'false',
          // selaraskan dengan parameter fetchData agar export menghormati filter aktif
          user_mdn: formData.user_mdn,
          user_id: formData.user_id,
          merchant_transaction_id: formData.merchant_transaction_id,
          transaction_id: formData.transaction_id,
          app_id: formData.selected_app_id || getAppIdsFromMerchantNames(formData.merchant_name).join(','),
          payment_method: formData.payment_method.join(','),
          status: formData.status,
          item_name: formData.item_name,
          denom: formData.denom,
          otp: formData.otp,
          keyword: formData.keyword,
          start_date,
          end_date,
        },
        responseType: 'blob',
      })

      const extension = type == 'csv' ? 'csv' : 'xlsx'
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `transactions.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setLoadingExport(false)
    }
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setCurrentPage(page)
    setPageSize(pageSize)
  }

  const handleBatchManualCallback = async () => {
    try {
      const confirmed = window.confirm(
        `Send a manual callback for ${selectedRows.length} transactions?`,
      )
      if (!confirmed) return

      const promises = selectedRows.map((transaction) =>
        fetch(`${apiUrl}/manual-callback/${transaction.u_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            transaction_id: transaction.u_id,
            merchant_transaction_id: transaction.merchant_transaction_id,
            status_code: 1000,
            message: 'Transaction updated',
          }),
        })
          .then((res) => res.json())
          .then((res) => ({
            transactionId: transaction.u_id,
            success: res.status === 200 || res.code === 200 || res.success === true,
            message: res.message,
          })),
      )

      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.success)

      if (failed.length === 0) {
        Modal.success({
          title: 'Batch Manual Callback Success',
          content: `Manual callback sent for ${results.length} transactions.`,
        })
      } else {
        Modal.warning({
          title: 'Partially failed',
          content: `${failed.length} of ${results.length} transactions failed to send. Check the log for details.`,
        })
        console.error('Failed callbacks:', failed)
      }

      // Refresh data
      fetchData(currentPage, pageSize)
      setSelectedRowKeys([])
      setSelectedRows([])
    } catch (error) {
      console.error('Batch callback error:', error)
      Modal.error({
        title: 'Batch Callback Error',
        content: 'Something went wrong while running the batch callback.',
      })
    }
  }

  // Hanya transaksi dengan status_code 1003 dan timestamp_callback_result "ok" yang boleh di-mark success
  const eligibleMarkSuccessRows = selectedRows.filter(
    (transaction) => transaction.status_code === 1003 && transaction.timestamp_callback_result === 'ok',
  )

  const handleBatchMarkSuccess = async () => {
    try {
      const confirmed = window.confirm(
        `Mark ${eligibleMarkSuccessRows.length} transactions as success?`,
      )
      if (!confirmed) return

      const promises = eligibleMarkSuccessRows.map((transaction) =>
        fetch(`${apiUrl}/transactions/paid-to-success/${transaction.u_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => res.json())
          .then((res) => ({
            transactionId: transaction.u_id,
            success: res.status === 200 || res.code === 200 || res.success === true,
            message: res.message,
          })),
      )

      const results = await Promise.all(promises)
      const failed = results.filter((r) => !r.success)

      if (failed.length === 0) {
        Modal.success({
          title: 'Mark Success',
          content: `${results.length} transactions marked as success.`,
        })
      } else {
        Modal.warning({
          title: 'Partially failed',
          content: `${failed.length} of ${results.length} transactions could not be marked as success. Check the log for details.`,
        })
        console.error('Failed mark success:', failed)
      }

      // Refresh data
      fetchData(currentPage, pageSize)
      setSelectedRowKeys([])
      setSelectedRows([])
    } catch (error) {
      console.error('Batch mark success error:', error)
      Modal.error({
        title: 'Mark Success Error',
        content: 'Something went wrong while marking transactions as success.',
      })
    }
  }

  // Display only: how many of the filters behind "More filters" are set.
  const moreFilterCount = [
    formData.merchant_transaction_id,
    formData.user_id,
    formData.selected_app_id,
    formData.payment_method.length,
    formData.otp,
    formData.keyword,
    formData.denom,
  ].filter(Boolean).length

  return (
    <div className='tx-page'>
      <header className='tx-head'>
        <div className='tx-actions'>
          <Button
            variant='outlined'
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={loadingExport || total > 1400000}
            onClick={() => handleExport('csv')}
          >
            {loadingExport ? 'Processing...' : 'Export CSV'}
          </Button>
          <Button
            variant='contained'
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={loadingExport || total > 120000}
            onClick={() => handleExport('excel')}
          >
            {loadingExport ? 'Processing...' : 'Export Excel'}
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
              name='transaction_id'
              placeholder='Transaction ID'
              inputProps={{ 'aria-label': 'Transaction ID' }}
              value={formData.transaction_id}
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
              mode='multiple'
              id='merchant_name'
              aria-label='Merchant name'
              value={formData.merchant_name}
              onChange={(val) => handleChange({ target: { name: 'merchant_name', value: val } })}
              maxTagCount='responsive'
              showSearch
              allowClear
              filterOption={(input, option: any) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Merchant'
            >
              {isAlif
                ? merchantListAlif.map((merchant) => (
                    <AntSelect.Option key={merchant.id} value={merchant.name}>
                      {merchant.name}
                    </AntSelect.Option>
                  ))
                : merchants.map((merchant) => (
                    <AntSelect.Option key={merchant.u_id} value={merchant.client_name}>
                      {merchant.client_name}
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
                <label htmlFor='f-merchant-trx'>Merchant Trx ID</label>
                <TextField
                  id='f-merchant-trx'
                  variant='outlined'
                  fullWidth
                  name='merchant_transaction_id'
                  value={formData.merchant_transaction_id}
                  onChange={handleChange}
                />
              </div>
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
                <label htmlFor='selected_app_id'>App</label>
                <AntSelect
                  id='selected_app_id'
                  value={formData.selected_app_id || undefined}
                  onChange={(val) => handleChange({ target: { name: 'selected_app_id', value: val || '' } })}
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                  filterOption={(input, option: any) =>
                    String(option?.children ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  placeholder='Select App'
                >
                  {isAlif
                    ? appListAlif.map((app) => (
                        <AntSelect.Option key={app.id} value={app.id}>
                          {app.name}
                        </AntSelect.Option>
                      ))
                    : appList.map((app) => (
                        <AntSelect.Option key={app.appid} value={app.appid}>
                          {app.app_name}
                        </AntSelect.Option>
                      ))}
                </AntSelect>
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
                <label htmlFor='f-otp'>OTP</label>
                <TextField
                  id='f-otp'
                  variant='outlined'
                  fullWidth
                  name='otp'
                  value={formData.otp}
                  onChange={handleChange}
                />
              </div>
              <div className='tx-field'>
                <label htmlFor='f-keyword'>Keyword Tsel</label>
                <TextField
                  id='f-keyword'
                  variant='outlined'
                  fullWidth
                  name='keyword'
                  value={formData.keyword}
                  onChange={handleChange}
                />
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
          <h3>Transaction Details</h3>
          <span className='tx-count'>{total.toLocaleString('id-ID')} items</span>
        </div>

        {formData.status === 1003 && isFiltered && (
          <div className='tx-batchbar'>
            <span>
              <strong>{selectedRows.length}</strong> selected
            </span>
            <ButtonAnt
              type='primary'
              disabled={formData.status !== 1003 || selectedRows.length === 0}
              onClick={handleBatchManualCallback}
            >
              Manual Callback Selected
            </ButtonAnt>
            <ButtonAnt type='default' disabled={eligibleMarkSuccessRows.length === 0} onClick={handleBatchMarkSuccess}>
              Mark Success Selected
            </ButtonAnt>
          </div>
        )}

        <Table
          rowKey='u_id'
          columns={columns}
          dataSource={data}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys)
              setSelectedRows(rows)
            },
          }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: handlePageChange,
            showTotal: (t, range) => `${range[0]}–${range[1]} of ${t.toLocaleString('id-ID')}`,
          }}
          size='small'
          className='transactions-table'
          scroll={{ x: 'max-content' }}
        />
      </section>
    </div>
  )
}
