import React, { useEffect, useState } from 'react'
import { Table, Typography, Spin, message, DatePicker, Select, Input, Button } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAuth } from '../provider/AuthProvider'
import { useMerchants } from '../context/MerchantContext'

import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'

const { Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

export interface TypeDailySummary {
  date: string
  status: string
  payment_method: string
  amount: number
  price: number
  route: string
  merchant_name: string
  total: number
  revenue: number
}

const paymentMethods = [
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
]

const TransactionSummaryPage: React.FC = () => {
  const [data, setData] = useState<TypeDailySummary[]>([])
  const [loading, setLoading] = useState(false)
  const { merchants, error } = useMerchants()

  // Filter state
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [merchantName, setMerchantName] = useState('')
  const [status, setStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [route, setRoute] = useState('')
  const { apiUrl, token } = useAuth()

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params: any = {}

      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD')
        params.end_date = dateRange[1].format('YYYY-MM-DD')
      }
      if (merchantName) params.merchant = merchantName
      if (status) params.status = status
      if (paymentMethod) params.payment_method = paymentMethod
      if (route) params.route = route

      const res = await axios.get<{ data: TypeDailySummary[] }>(`${apiUrl}/summary/transaction`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setData(res.data.data)
    } catch (error) {
      message.error('Failed to fetch summary data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams()

    if (dateRange) {
      if (dateRange[0]) params.append('start_date', dayjs(dateRange[0]).format('YYYY-MM-DD'))
      if (dateRange[1]) params.append('end_date', dayjs(dateRange[1]).format('YYYY-MM-DD'))
    }

    if (merchantName) params.append('merchant', merchantName)
    if (status) params.append('status', status)
    if (paymentMethod) params.append('payment_method', paymentMethod)
    if (route) params.append('route', route)

    params.append('format', format)

    const url = `${apiUrl}/summary/transaction?${params.toString()}`

    try {
      // Buat request dengan token untuk download
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      })

      // Buat blob URL dan download
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `summary-${format}-${dayjs().format('YYYY-MM-DD')}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      message.error('Failed to export data')
      console.error(error)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const columns: ColumnsType<TypeDailySummary> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <span className='rpt-num'>{dayjs(date).format('DD MMMM YYYY')}</span>,
    },
    {
      title: 'Merchant',
      dataIndex: 'merchant_name',
      key: 'merchant_name',
      render: (v: string) => <span className='rpt-strong'>{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let tone = ''
        if (status === 'success') tone = 'positive'
        else if (status === 'pending') tone = 'warning'
        else if (status === 'failed') tone = 'negative'
        return (
          <span className='rpt-status'>
            <i className={`rpt-dot ${tone}`} />
            {status}
          </span>
        )
      },
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
        return paymentMethod
      },
    },
    {
      title: 'Channel',
      dataIndex: 'route',
      key: 'route',
      render: (text) => (
        <Text ellipsis={{ tooltip: text }} className='rpt-mono'>
          {text}
        </Text>
      ),
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      align: 'right',
      render: (price: number) => `Rp ${price?.toLocaleString('id-ID')}`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (revenue: number, record) => {
        if (record.status?.toLowerCase() !== 'success') {
          return <span className='rpt-muted'>-</span>
        }
        return `Rp ${revenue?.toLocaleString('id-ID')}`
      },
    },
  ]

  const handleFilter = () => {
    fetchSummary()
  }

  const handleReset = () => {
    setDateRange(null)
    setMerchantName('')
    setStatus('')
    setPaymentMethod('')
    setRoute('')
    fetchSummary()
  }

  return (
    <div className='rpt-page'>
      <div className='rpt-head'>
        <div className='rpt-actions'>
          <Button onClick={() => handleExport('csv')}>Export CSV</Button>
          <Button onClick={() => handleExport('xlsx')}>Export Excel</Button>
        </div>
      </div>

      <div className='rpt-filters'>
        <div className='rpt-field'>
          <span>Date</span>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs])}
            style={{ width: 240 }}
          />
        </div>
        <div className='rpt-field'>
          <span>Merchant</span>
          <Select
            showSearch
            placeholder='Select merchant'
            value={merchantName}
            onChange={(value) => setMerchantName(value)}
            allowClear
            style={{ width: 200 }}
            optionFilterProp='children'
            filterOption={(input, option: any) =>
              (option?.children?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            loading={!merchants.length && !error}
          >
            {merchants.map((merchant) => (
              <Option key={merchant.u_id} value={merchant.client_name}>
                {merchant.client_name}
              </Option>
            ))}
          </Select>
        </div>
        <div className='rpt-field'>
          <span>Status</span>
          <Select
            placeholder='Select status'
            value={status}
            onChange={(value) => setStatus(value)}
            allowClear
            style={{ width: 120 }}
          >
            <Option value='success'>Success</Option>
            <Option value='pending'>Pending</Option>
            <Option value='failed'>Failed</Option>
          </Select>
        </div>
        <div className='rpt-field'>
          <span>Method</span>
          <Select
            style={{ width: 140 }}
            placeholder='Select Payment Method'
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value)}
            allowClear
            showSearch
            optionFilterProp='children'
          >
            {paymentMethods.map((pm) => (
              <Select.Option key={pm.value} value={pm.value}>
                {pm.name}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className='rpt-field'>
          <span>Route</span>
          <Input placeholder='Route' value={route} onChange={(e) => setRoute(e.target.value)} style={{ width: 130 }} />
        </div>
        <span className='rpt-spacer' />
        <Button onClick={handleReset}>Reset</Button>
        <Button type='primary' onClick={handleFilter}>
          Filter
        </Button>
      </div>

      <div className='rpt-table'>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey={(record, index) => `${record.date}-${record.merchant_name}-${index}`}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </div>
    </div>
  )
}

export default TransactionSummaryPage
