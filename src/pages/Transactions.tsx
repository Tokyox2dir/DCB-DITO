import { paymentMethods } from '../utils/paymentMethods'
// import type {} from '@mui/x-date-pickers/themeAugmentation';
// import type {} from '@mui/x-charts/themeAugmentation';
// import type {} from '@mui/x-data-grid/themeAugmentation';
// import type {} from '@mui/x-tree-view/themeAugmentation';
import { useState, useEffect, useRef, useCallback } from 'react'
import Grid from '@mui/material/Grid2'
// import CssBaseline from '@mui/material/CssBaseline'
import { TextField, OutlinedInput, Select, MenuItem, Tooltip } from '@mui/material'
import Button from '@mui/material/Button'
import { Button as ButtonAnt } from 'antd'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
// import AppNavbar from '../components/AppNavbar'
// import Header from '../components/Header'
// import CustomizedDataGrid from '../components/CustomizedDataGrid'
// import MainGrid from '../components/MainGrid'
// import SideMenu from '../components/SideMenu'
import Card from '@mui/material/Card'
// import CardContent from '@mui/material/CardContent'
import { FormLabel } from '@mui/material'

import Typography from '@mui/material/Typography'
// import AppTheme from '../styles/theme/shared-theme/AppTheme'
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

const columns: ColumnType<any>[] = [
  {
    title: 'Transaction ID',
    width: 220,
    dataIndex: 'u_id',
    key: 'u_id',
    render: (text: string) => (
      <Tooltip title='Copy Transaction ID'>
        <div onClick={() => navigator.clipboard.writeText(text)} style={{ display: 'flex', alignItems: 'center' }}>
          {text}
        </div>
      </Tooltip>
    ),
  },
  {
    title: 'User MDN',
    width: 120,
    dataIndex: 'user_mdn',
    key: 'user_mdn',
  },
  {
    title: ' Date',
    width: 100,
    dataIndex: 'created_at',
    key: 'created_at',
    render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : 'N/A'),
  },
  {
    title: 'Payment Method',
    width: 140,
    align: 'center',
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
      return paymentMethod
    },
  },
  {
    title: 'Merchant',
    width: 220,
    dataIndex: 'merchant_name',
    key: 'merchant_name',
  },
  {
    title: 'App',
    dataIndex: 'app_name',
    key: 'app_name',
  },
  {
    title: 'Denom',
    width: 100,
    align: 'center',
    dataIndex: 'amount',
    key: 'amount',
    render: (denom: number) => {
      return <p>{formatRupiah(denom)}</p>
    },
  },
  {
    title: 'Status',
    dataIndex: 'status_code',
    key: 'status_code',
    align: 'center',
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
    width: 170,
    align: 'center',
    dataIndex: 'route',
    key: 'route',
  },

  {
    title: 'Fail Reason',
    width: 120,
    align: 'center',
    dataIndex: 'fail_reason',
    key: 'fail_reason',
  },
  {
    title: 'Merchant Trx ID',
    width: 200,
    dataIndex: 'merchant_transaction_id',
    key: 'merchant_transaction_id',
    render: (text: string) => (
      <Tooltip title='Copy Merchant Trx ID'>
        <div onClick={() => navigator.clipboard.writeText(text)} style={{ display: 'flex', alignItems: 'center' }}>
          {text}
        </div>
      </Tooltip>
    ),
  },
  {
    title: 'Item Name',
    width: 170,
    align: 'center',
    dataIndex: 'item_name',
    key: 'item_name',
  },
  {
    title: 'Action',
    width: 120,
    key: 'action',
    align: 'center',
    fixed: 'right',
    render: (record: any) => (
      <Button
        variant='outlined'
        color='success'
        className='h-6 text-sky-700 '
        onClick={() => {
          window.location.href = `/transaction/${record.u_id}`
        }}
      >
        Detail
      </Button>
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
        `Kamu yakin ingin mengirim manual callback untuk ${selectedRows.length} transaksi?`,
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
          content: `${results.length} transaksi berhasil dikirim manual callback.`,
        })
      } else {
        Modal.warning({
          title: 'Sebagian Gagal',
          content: `${failed.length} dari ${results.length} transaksi gagal dikirim. Cek log untuk detail.`,
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
        content: 'Terjadi kesalahan saat menjalankan batch callback.',
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
        `Kamu yakin ingin mark success untuk ${eligibleMarkSuccessRows.length} transaksi?`,
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
          content: `${results.length} transaksi berhasil di-mark success.`,
        })
      } else {
        Modal.warning({
          title: 'Sebagian Gagal',
          content: `${failed.length} dari ${results.length} transaksi gagal di-mark success. Cek log untuk detail.`,
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
        content: 'Terjadi kesalahan saat menjalankan mark success.',
      })
    }
  }

  return (
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
          mx: 0,
          pb: 5,
          mt: 0,
        }}
      >
        {/* <Header /> */}
        <Box sx={{ width: '100%', maxWidth: '96vw' }}>
          {/* cards */}
          <Typography component='h2' variant='h6' className='sf-page-title'>
            Redpay Transactions
          </Typography>
          <Card variant='outlined' className='transaction-filter'>
            <span className='font-semibold'>Filter Transaction</span>
            <div className='mt-3'>
              <form className='transaction-filter-form' onSubmit={handleSubmit}>
                <Grid container rowSpacing={2} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>User MDN</FormLabel>
                    <TextField
                      variant='outlined'
                      fullWidth
                      name='user_mdn'
                      type='number'
                      value={formData.user_mdn}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>Merchant Trx ID</FormLabel>
                    <TextField
                      variant='outlined'
                      fullWidth
                      name='merchant_transaction_id'
                      value={formData.merchant_transaction_id}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>User ID</FormLabel>
                    <TextField
                      variant='outlined'
                      fullWidth
                      name='user_id'
                      value={formData.user_id}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
                <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }} className='flex flex-col'>
                    <FormLabel className='font-medium'>Filter Date</FormLabel>

                    <RangePicker
                      size='large'
                      showTime={{ format: 'HH:mm:ss' }}
                      format='YYYY-MM-DD HH:mm'
                      onChange={handleDateChange}
                      value={[formData.start_date, formData.end_date]}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>Transaction ID</FormLabel>
                    <TextField
                      variant='outlined'
                      fullWidth
                      name='transaction_id'
                      value={formData.transaction_id}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }} className='flex flex-col'>
                    <FormLabel className='font-medium'>App</FormLabel>
                    <AntSelect
                      id='selected_app_id'
                      value={formData.selected_app_id || undefined}
                      onChange={(val) => handleChange({ target: { name: 'selected_app_id', value: val || '' } })}
                      style={{ width: '100%', height: 38 }}
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
                  </Grid>
                </Grid>

                <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
                  <Grid size={{ xs: 12, md: 4 }} className='flex flex-col'>
                    <FormLabel className='font-medium'>Payment Method</FormLabel>
                    <AntSelect
                      mode='multiple'
                      id='payment-method'
                      value={formData.payment_method}
                      onChange={(val) => handleChange({ target: { name: 'payment_method', value: val } })}
                      style={{ width: '100%', minHeight: 38 }}
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
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }} className='flex flex-col'>
                    <FormLabel className='font-medium'>Status</FormLabel>

                    <Select
                      labelId='status-label'
                      id='status'
                      onChange={handleChange}
                      name='status'
                      value={formData.status}
                      input={<OutlinedInput />}
                    >
                      {status.map((s) => (
                        <MenuItem key={s.value} value={s.value}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }} className='flex flex-col'>
                    <FormLabel className='font-medium'>Merchant Name</FormLabel>

                    <AntSelect
                      mode='multiple'
                      id='merchant_name'
                      value={formData.merchant_name}
                      onChange={(val) => handleChange({ target: { name: 'merchant_name', value: val } })}
                      style={{ width: '100%', minHeight: 38 }}
                      showSearch
                      allowClear
                      filterOption={(input, option: any) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      placeholder='Select Merchant Name'
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
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>OTP</FormLabel>
                    <TextField variant='outlined' fullWidth name='otp' value={formData.otp} onChange={handleChange} />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>Keyword Tsel</FormLabel>
                    <TextField
                      variant='outlined'
                      fullWidth
                      name='keyword'
                      value={formData.keyword}
                      onChange={handleChange}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <FormLabel className='font-medium'>Denom</FormLabel>
                    <Select

                      fullWidth
                      labelId='denom-label'
                      id='denom'
                      name='denom'
                      type='number'
                      value={formData.denom}
                      onChange={handleChange}
                      input={<OutlinedInput />}
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
                  </Grid>
                </Grid>
                {/* <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}>

                </Grid> */}
                <Grid container rowSpacing={1} className='mb-2' columnSpacing={{ xs: 1, sm: 2, md: 3 }}></Grid>
                <div className='transaction-filter-actions'>
                <Button type='submit' variant='contained' color='primary'>
                  Submit
                </Button>
                <Button type='button' variant='outlined' color='inherit' onClick={handleReset}>
                  Reset
                </Button>
                </div>
              </form>
            </div>
          </Card>
          <Grid container spacing={2} columns={12} sx={{ mb: (theme) => theme.spacing(4) }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>{/* <HighlightedCard /> */}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{/* <SessionsChart /> */}</Grid>
            <Grid size={{ xs: 12, md: 6 }}>{/* <PageViewsBarChart /> */}</Grid>
          </Grid>
          <Typography component='h2' variant='h6' className='sf-section-title'>
            Transaction Details
          </Typography>
          <div className='flex items-center justify-between'>
            <div>
              <Button
                size='small'
                className='border-sky-400'
                variant='outlined'
                disabled={loadingExport || total > 1400000}
                color='primary'
                onClick={() => handleExport('csv')}
              >
                {loadingExport ? 'Processing...' : 'Export CSV'}
              </Button>

              <Button
                size='small'
                disabled={loadingExport || total > 120000}
                className='border-sky-400 ml-4'
                variant='contained'
                color='primary'
                onClick={() => handleExport('excel')}
              >
                {loadingExport ? 'Processing...' : 'Export Excel'}
              </Button>
            </div>
          </div>
          <div className='flex '>
            <span className='ml-auto'>
              {isFiltered && <Typography variant='subtitle1'>Total Items: {total}</Typography>}
            </span>
          </div>

          {/* 1540px */}
          {formData.status === 1003 && isFiltered && (
            <Stack direction='row' spacing={2} sx={{ alignItems: 'center' }}>
              <ButtonAnt
                type='primary'
                disabled={formData.status !== 1003 || selectedRows.length === 0}
                onClick={handleBatchManualCallback}
              >
                Manual Callback Selected
              </ButtonAnt>
              <ButtonAnt
                type='primary'
                disabled={eligibleMarkSuccessRows.length === 0}
                onClick={handleBatchMarkSuccess}
              >
                Mark Success Selected
              </ButtonAnt>
            </Stack>
          )}
          <div className='mt-5'>
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
              }}
              size='small'
              className='transactions-table'
              scroll={{ x: 'max-content' }}
            />
          </div>
        </Box>
      </Stack>
    </Box>
  )
}
