import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import Badge from './Badge'
import MonitoringTransactionDetailModal from './MonitoringTransactionDetailModal'
import { MetricStatus } from './VolumePerHourChart'
import { useAuth } from '../provider/AuthProvider'
import { Merchant } from '../context/MerchantContext'
import formatRupiah from '../utils/FormatRupiah'

dayjs.extend(utc)

type Props = {
  dateRange: [Dayjs, Dayjs] | null
  merchant: string
  status: MetricStatus
  paymentMethod: string
  merchants: Merchant[]
  refreshKey?: number
}

function statusToCode(status: MetricStatus): number | undefined {
  if (status === 'success') return 1000
  if (status === 'pending') return 1001
  if (status === 'waiting') return 1003
  if (status === 'failed') return 1005
  return undefined
}

function getAppIds(merchants: Merchant[], merchantName: string) {
  if (!merchantName) return ''
  const merchant = merchants.find((m) => m.client_name === merchantName)
  if (!merchant) return ''
  return merchant.apps.map((app) => app.appid).filter(Boolean).join(',')
}

function formatPaymentMethod(value: string) {
  switch (value) {
    case 'xl_airtime':
      return 'XL'
    case 'telkomsel_airtime':
      return 'Telkomsel'
    case 'smartfren_airtime':
      return 'Smartfren'
    case 'indosat_airtime':
      return 'Indosat'
    case 'three_airtime':
      return 'Tri'
    default:
      return value
  }
}

export default function MonitoringTransactionList({
  dateRange,
  merchant,
  status,
  paymentMethod,
  merchants,
  refreshKey = 0,
}: Props) {
  const { token, apiUrl } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const columns: ColumnsType<any> = useMemo(
    () => [
      {
        title: 'Transaction ID',
        width: 170,
        dataIndex: 'u_id',
        key: 'u_id',
        ellipsis: true,
        render: (text: string) => (
          <Tooltip title='Copy Transaction ID'>
            <div
              className='mon-trx-copy'
              onClick={() => navigator.clipboard.writeText(text)}
            >
              {text}
            </div>
          </Tooltip>
        ),
      },
      {
        title: 'User MDN',
        width: 100,
        dataIndex: 'user_mdn',
        key: 'user_mdn',
        ellipsis: true,
      },
      {
        title: 'Date',
        width: 130,
        dataIndex: 'created_at',
        key: 'created_at',
        render: (text: string) => (
          <span className='mon-trx-date'>{text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : 'N/A'}</span>
        ),
      },
      {
        title: 'Payment Method',
        width: 110,
        align: 'center',
        dataIndex: 'payment_method',
        key: 'payment_method',
        render: (value: string) => formatPaymentMethod(value),
      },
      {
        title: 'Merchant',
        width: 150,
        dataIndex: 'merchant_name',
        key: 'merchant_name',
        ellipsis: true,
      },
      {
        title: 'App',
        width: 110,
        dataIndex: 'app_name',
        key: 'app_name',
        ellipsis: true,
      },
      {
        title: 'Denom',
        width: 90,
        align: 'right',
        dataIndex: 'amount',
        key: 'amount',
        render: (denom: number) => formatRupiah(denom),
      },
      {
        title: 'Status',
        width: 90,
        dataIndex: 'status_code',
        key: 'status_code',
        align: 'center',
        render: (code: number) => {
          let color: 'success' | 'error' | 'pending' | 'waiting-callback' = 'pending'
          let text = 'Pending'
          if (code === 1000) {
            color = 'success'
            text = 'Success'
          } else if (code === 1005) {
            color = 'error'
            text = 'Failed'
          } else if (code === 1003) {
            color = 'waiting-callback'
            text = 'Waiting'
          }
          return <Badge color={color} text={text} />
        },
      },
      {
        title: 'Route',
        width: 100,
        align: 'center',
        dataIndex: 'route',
        key: 'route',
        ellipsis: true,
      },
      {
        title: 'Fail Reason',
        width: 100,
        align: 'center',
        dataIndex: 'fail_reason',
        key: 'fail_reason',
        ellipsis: true,
      },
      {
        title: 'Merchant Trx ID',
        width: 140,
        dataIndex: 'merchant_transaction_id',
        key: 'merchant_transaction_id',
        ellipsis: true,
        render: (text: string) => (
          <Tooltip title='Copy Merchant Trx ID'>
            <div
              className='mon-trx-copy'
              onClick={() => text && navigator.clipboard.writeText(text)}
            >
              {text}
            </div>
          </Tooltip>
        ),
      },
      {
        title: 'Item Name',
        width: 120,
        align: 'center',
        dataIndex: 'item_name',
        key: 'item_name',
        ellipsis: true,
      },
      {
        title: 'Action',
        width: 80,
        key: 'action',
        align: 'center',
        fixed: 'right',
        render: (_: unknown, record: any) => (
          <Button
            size='small'
            className='mon-trx-detail-btn'
            onClick={() => {
              setDetailId(record.u_id)
              setDetailOpen(true)
            }}
          >
            Detail
          </Button>
        ),
      },
    ],
    [],
  )

  const load = useCallback(
    async (pageNum = page, limit = pageSize) => {
      if (!token || !apiUrl) return
      try {
        setLoading(true)
        const start = dateRange?.[0] ? dateRange[0].startOf('day') : dayjs().startOf('day')
        const end = dateRange?.[1] ? dateRange[1].endOf('day') : dayjs().endOf('day')
        const statusCode = statusToCode(status)

        const response = await axios.get(`${apiUrl}/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          params: {
            page: pageNum,
            limit,
            start_date: start.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            end_date: end.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
            app_id: getAppIds(merchants, merchant),
            payment_method: paymentMethod || undefined,
            status: statusCode,
            _ts: Date.now(),
          },
        })

        setData(response.data?.data || [])
        setTotal(response.data?.pagination?.total_items || 0)
      } catch (e) {
        console.error('Monitoring transactions fetch error:', e)
        setData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [apiUrl, token, dateRange, merchant, status, paymentMethod, merchants, page, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [dateRange, merchant, status, paymentMethod])

  useEffect(() => {
    load(page, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateRange, merchant, status, paymentMethod, merchants, refreshKey])

  return (
    <div className='mon-panel mon-panel-trx'>
      <div className='mon-panel-head mon-panel-head-border'>
        <div className='mon-panel-title'>
          <h4>Transaction List</h4>
        </div>
        <span className='mon-panel-meta'>{total.toLocaleString('id-ID')} transactions</span>
      </div>
      <div className='mon-trx-body'>
        <Table
          className='mon-trx-table'
          size='small'
          rowKey={(record) => record.u_id || record.id}
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: page,
            pageSize,
            total,
            size: 'small',
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize || 10)
            },
          }}
        />
      </div>

      <MonitoringTransactionDetailModal
        transactionId={detailId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailId(null)
        }}
      />
    </div>
  )
}
