// TransactionDetail.tsx
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import { Modal } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { CircularProgress } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { useAuth } from '../provider/AuthProvider'
import formatRupiah from '../utils/FormatRupiah'
import Badge, { type BadgeProps } from '../components/Badge'

interface Transaction {
  u_id: string
  user_mdn: string
  payment_method: string
  user_id: string
  status_code: number
  created_at: string
  merchant_transaction_id: string
  currency: string
  amount: number
  item_name: string
  client_appkey: string
  testing: boolean
  price: number
  appid: string
  merchant_name: string
  app_name: string
  updated_at: Date
  va_bca: string
  ximpay_id: string
  reference_id: string
  otp: number
  route: string
  midtrans_transaction_id: string
  timestamp_request_date: Date
  receive_callback_date: Date
  timestamp_submit_date: Date
  timestamp_callback_date: Date
  timestamp_callback_result: string
  user_ip: string
}

// One key-value pair in a detail card.
const KV: React.FC<{ label: string; mono?: boolean; amount?: boolean; children?: React.ReactNode }> = ({
  label,
  mono,
  amount,
  children,
}) => (
  <div>
    <dt>{label}</dt>
    <dd className={amount ? 'amount' : mono ? 'mono' : undefined}>
      {children === undefined || children === null || children === '' ? <span className='tx-empty'>-</span> : children}
    </dd>
  </div>
)

interface NotificationHistory {
  timestamp: string
  level: string
  endpoint: string
  method: string
  status_code: number
  duration_ms: number
  response_body: unknown
  request_body: unknown
}

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>() // Ambil u_id dari URL
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [transactionStatus, setTransactionStatus] = useState<{
    status: string
    responseDesc: string
    json: string
  } | null>(null)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationHistory[]>([])
  const [expandedNotifications, setExpandedNotifications] = useState<Record<number, boolean>>({})

  const toggleNotification = (index: number) => {
    setExpandedNotifications((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const { token, apiUrl, isDev } = useAuth()

  let paymentMethod

  let status

  const handleMarkSuccess = async () => {
    if (!transaction) return
    try {
      await axios.get(`${apiUrl}/mark-paid/${transaction.u_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      alert('Marked as success')
      navigate(0)
    } catch (error) {
      console.error('Failed to mark as success:', error)
      alert('Failed to mark as success')
    }
  }

  const handleMarkFailed = async () => {
    if (!transaction) return
    try {
      await axios.get(`${apiUrl}/mark-failed/${transaction.u_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      alert('Marked as failed')
      navigate(0)
    } catch (error) {
      console.error('Failed to mark as failed:', error)
      alert('Failed to mark as failed')
    }
  }

  const handleCheckCharging = async () => {
    try {
      const requestOptions = {
        method: 'GET',
      }

      const response = await fetch(`${apiUrl}/check/${id}`, requestOptions)

      const result = await response.json()
      console.log('result', result.data.transactionInquiryStatusTO.responseCode)

      if (result.data.transactionInquiryStatusTO.responseCode == '00') {
        setTransactionStatus({
          status: 'Success',
          responseDesc: result.data.transactionInquiryStatusTO.responseDesc,
          json: '',
        })
      } else {
        setTransactionStatus({
          status: 'error',
          responseDesc: 'Transaction failed',
          json: '',
        })
      }

      setOpen(true)
    } catch (error) {
      console.error('Error checking charging:', error)
      setTransactionStatus({
        status: 'Error',
        responseDesc: 'Failed to fetch transaction status',
        json: '',
      })
      setOpen(true)
    }
  }

  const handleCheckStatusDana = async () => {
    try {
      const response = await fetch(`${apiUrl}/check-status/dana/${transaction?.reference_id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (response.ok && result.data?.response?.body?.statusDetail?.acquirementStatus == 'SUCCESS') {
        setTransactionStatus({
          status: 'Success',
          responseDesc: '',
          json: result.data?.response,
        })
      } else {
        setTransactionStatus({
          status: 'Failed',
          // responseDesc: result.data?.response || 'Transaction failed or unknown response',
          responseDesc: '',
          json: result.data?.response,
        })
      }
    } catch (error) {
      console.error('Error checking DANA transaction:', error)
      setTransactionStatus({
        status: 'Error',
        responseDesc: 'Failed to check transaction status with DANA.',
        json: '',
      })
    } finally {
      setOpen(true)
    }
  }

  const handleCheckStatusOvo = async () => {
    try {
      const response = await fetch(`${apiUrl}/check-status/ovo/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      console.log('result: ', result)
      if (response.ok && result.data?.responseCode == '00') {
        setTransactionStatus({
          status: 'Success',
          responseDesc: '',
          json: result.data,
        })
      } else {
        setTransactionStatus({
          status: 'Failed',
          // responseDesc: result.data?.response || 'Transaction failed or unknown response',
          responseDesc: '',
          json: result.data,
        })
      }
    } catch (error) {
      console.error('Error checking OVO transaction:', error)
      setTransactionStatus({
        status: 'Error',
        responseDesc: 'Failed to check transaction status with OVO.',
        json: '',
      })
    } finally {
      setOpen(true)
    }
  }

  const handleCheckStatusQrisHarsya = async () => {
    try {
      const response = await fetch(`${apiUrl}/check-status/qris-harsya/${transaction?.reference_id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      console.log('result: ', result)
      if (response.ok && result.data?.data?.status == 'PAID') {
        setTransactionStatus({
          status: 'Success',
          responseDesc: '',
          json: result.data,
        })
      } else {
        setTransactionStatus({
          status: 'Failed',
          // responseDesc: result.data?.response || 'Transaction failed or unknown response',
          responseDesc: '',
          json: result.data,
        })
      }
    } catch (error) {
      console.error('Error checking OVO transaction:', error)
      setTransactionStatus({
        status: 'Error',
        responseDesc: 'Failed to check transaction status with OVO.',
        json: '',
      })
    } finally {
      setOpen(true)
    }
  }

  const handleManualCallback = async () => {
    try {
      const response = await fetch(`${apiUrl}/manual-callback/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transaction_id: transaction?.u_id,
          merchant_transaction_id: transaction?.merchant_transaction_id,
          status_code: 1000,
          message: 'Transaction updated',
        }),
      })

      const result = await response.json()
      console.log('Manual callback result:', result)

      if (response.ok) {
        Modal.success({
          title: 'Manual Callback Success',
          content: `Message: ${result.message}`,
        })
      } else {
        throw new Error(result.message || 'Failed to update transaction')
      }
    } catch (error) {
      console.error('Error during manual callback:', error)
      Modal.error({
        title: 'Manual Callback Failed',
        content: 'An error occurred while processing the manual callback.',
      })
    }
  }

  const handleOk = () => {
    setOpen(false)
  }

  const handleCancel = () => {
    console.log('Clicked cancel button')
    setOpen(false)
  }

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      try {
        const response = await axios.get(`${apiUrl}/transaction/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        setTransaction(response.data.data)
      } catch (error) {
        console.error('Error fetching transaction detail:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchNotificationHistory = async () => {
      try {
        const response = await axios.get(`${apiUrl}/transactions/${id}/notification-history`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        setNotifications(response.data.data || [])
      } catch (error) {
        console.error('Error fetching notification history:', error)
      }
    }

    fetchTransactionDetail()
    fetchNotificationHistory()
  }, [id, token])

  if (loading) {
    return (
      <div className='tx-page'>
        <CircularProgress size={22} />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className='tx-page'>
        <h2 className='tx-title'>Transaction not found</h2>
      </div>
    )
  }

  switch (transaction.status_code) {
    case 1000:
      status = 'Success'
      break
    case 1005:
      status = 'Failed'
      break
    case 1003:
      status = 'waiting notification'
      break
    default:
      status = 'Pending'
      break
  }

  switch (transaction.payment_method) {
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
    case 'tri_airtime':
      paymentMethod = 'Tri'
      break
    case 'qris':
      paymentMethod = 'Qris'
      break
    case 'gopay':
      paymentMethod = 'Gopay'
      break
    case 'shopeepay':
      paymentMethod = 'Shopeepay'
      break
  }

  let referenceId

  switch (transaction.payment_method) {
    case 'three_airtime':
      referenceId = transaction.ximpay_id
      break
    case 'indosat_airtime':
      referenceId = transaction.ximpay_id
      break
    case 'smartfren_airtime':
      referenceId = transaction.ximpay_id
      break
    case 'gopay':
      referenceId = transaction.midtrans_transaction_id
      break
    case 'shopeepay':
      referenceId = transaction.midtrans_transaction_id
      break
    case 'qris':
      if (transaction.route == 'qris_harsya') {
        transaction.reference_id
      }
      referenceId = transaction.midtrans_transaction_id
      break
    default:
      referenceId = transaction.reference_id
      break
  }

  const checkCharging =
    transaction.payment_method == 'xl_airtime' ||
    transaction.payment_method == 'dana' ||
    transaction.payment_method == 'ovo' ||
    transaction.route == 'qris_harsya'

  const statusTone: BadgeProps['color'] =
    transaction.status_code === 1000
      ? 'success'
      : transaction.status_code === 1005
        ? 'error'
        : transaction.status_code === 1003
          ? 'waiting-callback'
          : 'pending'
  const fmt = (d: Date | string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss.SSS')

  return (
    <div className='tx-page'>
      <header className='tx-head'>
        <div className='tx-head-main'>
          <span className='tx-eyebrow'>Transaction</span>
          <h2 className='tx-title'>
            <span className='tx-id'>{transaction.u_id}</span>
            <Badge color={statusTone} text={status} />
          </h2>
          <p className='tx-sub'>
            {transaction.merchant_name}
            <span className='sep'>·</span>
            {transaction.app_name}
            <span className='sep'>·</span>
            <span className='tx-mono dim'>{dayjs(transaction.created_at).format('YYYY-MM-DD HH:mm:ss')}</span>
          </p>
        </div>
        <div className='tx-actions'>
          <Button type='button' variant='outlined' startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          {isDev && (
            <>
              {transaction.status_code !== 1000 && (
                <Button type='button' variant='outlined' color='success' onClick={handleMarkSuccess}>
                  Mark Success
                </Button>
              )}

              {transaction.status_code !== 1005 && (
                <Button type='button' variant='outlined' color='error' onClick={handleMarkFailed}>
                  Mark Failed
                </Button>
              )}
            </>
          )}
          <Button
            type='button'
            onClick={() => {
              if (transaction.payment_method === 'dana') {
                handleCheckStatusDana()
              } else if (transaction.payment_method === 'ovo') {
                handleCheckStatusOvo()
              } else if (transaction.payment_method === 'qris_harsya' || transaction.route === 'qris_harsya') {
                handleCheckStatusQrisHarsya()
              } else {
                handleCheckCharging()
              }
            }}
            disabled={!checkCharging}
            variant='outlined'
          >
            Check Charging
          </Button>
          <Button
            type='button'
            disabled={transaction.status_code != 1003 && transaction.status_code != 1000}
            onClick={handleManualCallback}
            variant='contained'
          >
            Manual Callback
          </Button>
        </div>
      </header>

      <div className='tx-detail-grid'>
        <section className='tx-card'>
          <div className='tx-card-head'>
            <h3>Payment</h3>
          </div>
          <dl className='tx-kv'>
            <KV label='Amount' amount>
              {formatRupiah(transaction.amount)}
            </KV>
            <KV label='Price' amount>
              {formatRupiah(transaction.price)}
            </KV>
            <KV label='Status'>
              <Badge color={statusTone} text={status} />
            </KV>
            <KV label='Currency'>{transaction.currency}</KV>
            <KV label='Payment Method'>{paymentMethod}</KV>
            <KV label='Route' mono>
              {transaction.route}
            </KV>
            <KV label='Reference ID' mono>
              {referenceId}
            </KV>
            <KV label='Item Name'>{transaction.item_name}</KV>
            {transaction.payment_method === 'telkomsel_airtime' && (
              <KV label='SMS Code' mono>
                {transaction.otp}
              </KV>
            )}
            {transaction.payment_method === 'va_bca' && (
              <KV label='VA BCA' mono>
                {transaction.va_bca}
              </KV>
            )}
          </dl>
        </section>

        <section className='tx-card'>
          <div className='tx-card-head'>
            <h3>Merchant and customer</h3>
          </div>
          <dl className='tx-kv'>
            <KV label='Merchant Name'>{transaction.merchant_name}</KV>
            <KV label='App Name'>{transaction.app_name}</KV>
            <KV label='Transaction ID' mono>
              {transaction.u_id}
            </KV>
            <KV label='Merchant Transaction ID' mono>
              {transaction.merchant_transaction_id}
            </KV>
            <KV label='User MDN' mono>
              {transaction.user_mdn}
            </KV>
            <KV label='User ID' mono>
              {transaction.user_id}
            </KV>
            <KV label='App ID' mono>
              {transaction.appid}
            </KV>
            <KV label='Client IP' mono>
              {transaction.user_ip}
            </KV>
            <KV label='Client AppKey' mono>
              {transaction.client_appkey}
            </KV>
          </dl>
        </section>

        <section className='tx-card span-2'>
          <div className='tx-card-head'>
            <h3>Timeline</h3>
            <small>Local time, millisecond precision</small>
          </div>
          <dl className='tx-kv cols-3'>
            <KV label='Created At' mono>
              {fmt(transaction.created_at)}
            </KV>
            <KV label='Request Date' mono>
              {transaction.payment_method !== 'va_bca'
                ? fmt(transaction.timestamp_request_date)
                : fmt(transaction.created_at)}
            </KV>
            <KV label='Updated At' mono>
              {fmt(transaction.updated_at)}
            </KV>
            <KV label='Receive Callback Date' mono>
              {transaction.receive_callback_date ? fmt(transaction.receive_callback_date) : '-'}
            </KV>
            <KV label='Callback Date' mono>
              {transaction.timestamp_callback_date ? fmt(transaction.timestamp_callback_date) : '-'}
            </KV>
            <KV label='Callback result' mono>
              {transaction.timestamp_callback_result}
            </KV>
          </dl>
        </section>

        {notifications.length > 0 && (
          <section className='tx-card span-2'>
            <div className='tx-card-head'>
              <h3>Payment Notification History</h3>
              <span className='tx-count'>{notifications.length} events</span>
            </div>
            <div className='tx-log'>
              {notifications.map((notification, index) => {
                const isExpanded = !!expandedNotifications[index]
                const isSuccess = notification.status_code >= 200 && notification.status_code < 300
                return (
                  <div key={index} className={`tx-log-item${isExpanded ? ' open' : ''}`}>
                    <button
                      type='button'
                      className='tx-log-row'
                      aria-expanded={isExpanded}
                      onClick={() => toggleNotification(index)}
                    >
                      <span className='chev'>▶</span>
                      <span className='tx-mono'>{dayjs(notification.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
                      <span className='tx-code'>{notification.method}</span>
                      <span className={`tx-code ${isSuccess ? 'ok' : 'bad'}`}>{notification.status_code}</span>
                      <span className='dur'>{notification.duration_ms.toFixed(2)} ms</span>
                    </button>
                    {isExpanded && (
                      <div className='tx-log-body'>
                        <dl className='tx-kv'>
                          <KV label='Level'>{notification.level}</KV>
                          <KV label='Endpoint' mono>
                            {notification.endpoint}
                          </KV>
                        </dl>
                        <div>
                          <div className='tx-pre-label'>Request Body</div>
                          <pre className='tx-pre'>{JSON.stringify(notification.request_body, null, 2)}</pre>
                        </div>
                        <div>
                          <div className='tx-pre-label'>Response Body</div>
                          <pre className='tx-pre'>{JSON.stringify(notification.response_body, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <Modal
        title='Transaction'
        className='tx-modal'
        open={open}
        onOk={handleOk}
        width={480}
        onCancel={handleCancel}
        centered
      >
        <dl className='tx-modal-kv'>
          <dt>Status</dt>
          <dd>{transactionStatus?.status}</dd>
          <dt>Desc</dt>
          <dd>{transactionStatus?.responseDesc || '-'}</dd>
        </dl>
        <div className='tx-pre-label'>Response JSON</div>
        <pre className='tx-pre'>
          {typeof transactionStatus?.json === 'string'
            ? transactionStatus.json
            : JSON.stringify(transactionStatus?.json, null, 2)}
        </pre>
      </Modal>
    </div>
  )
}
//
export default TransactionDetail
