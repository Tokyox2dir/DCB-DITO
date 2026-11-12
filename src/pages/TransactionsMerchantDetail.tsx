// TransactionDetail.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import axios from 'axios'
import dayjs from 'dayjs'
import { CircularProgress } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import { useAuth } from '../provider/AuthProvider'
import { useNavigate } from 'react-router-dom'
import formatRupiah from '../utils/FormatRupiah'
import Badge, { type BadgeProps } from '../components/Badge'

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

interface Transaction {
  u_id: string
  user_mdn: string
  payment_method: string
  timestamp_callback_date: number
  currency: string
  app_name: string
  user_id: string
  status_code: number
  fail_reason: string
  created_at: string
  timestamp_callback_result: string
  merchant_transaction_id: string
  updated_at: number
  amount: number
  item_name: number
  testing: boolean
  price: number
  otp: number
  va_bca: string
  timestamp_request_date: Date
}

const TransactionMerchantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [resendLoading, setResendLoading] = useState<boolean>(false)
  const [resendDisabled, setResendDisabled] = useState<boolean>(false)
  const [countdown, setCountdown] = useState<number>(0)
  const navigate = useNavigate()

  const { token, apiUrl, appId, appKey, isDev } = useAuth()

  let paymentMethod

  let status
  let failReason

  const handleMarkSuccess = async () => {
    if (!transaction) return
    try {
      await axios.get(`${apiUrl}/mark-paid/${transaction.u_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          appid: appId,
          appkey: appKey,
        },
      })
      alert('Marked as success')
      navigate(0) // reload halaman
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
          appid: appId,
          appkey: appKey,
        },
      })
      alert('Marked as failed')
      navigate(0)
    } catch (error) {
      console.error('Failed to mark as failed:', error)
      alert('Failed to mark as failed')
    }
  }

  const handleResendCallback = async () => {
    if (!transaction || resendDisabled) return

    setResendLoading(true)
    setResendDisabled(true)

    try {
      await axios.post(
        `${apiUrl}/merchant/resend-callback/${transaction.u_id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            appid: appId,
            appkey: appKey,
          },
        },
      )
      alert('Callback resent successfully')

      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setResendDisabled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      console.error('Failed to resend callback:', error)
      alert('Failed to resend callback')
      setResendDisabled(false)
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    const fetchTransactionDetail = async () => {
      try {
        const response = await axios.get(`${apiUrl}/merchant/transaction/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            appid: appId,
            appkey: appKey,
          },
        })
        setTransaction(response.data.data)
      } catch (error) {
        console.error('Error fetching transaction detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactionDetail()

    return () => {}
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

  failReason = transaction.fail_reason ? `(${transaction.fail_reason})` : ''

  switch (transaction.status_code) {
    case 1000:
      status = 'Success'
      break
    case 1005:
      status = 'Failed'
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

  const statusTone: BadgeProps['color'] =
    transaction.status_code === 1000 ? 'success' : transaction.status_code === 1005 ? 'error' : 'pending'
  const fmt = (d: Date | string | number) => dayjs(d).format('YYYY-MM-DD HH:mm:ss')

  return (
    <div className='tx-page'>
      <header className='tx-head'>
        <div className='tx-head-main'>
          <span className='tx-eyebrow'>Merchant transaction</span>
          <h2 className='tx-title'>
            <span className='tx-id'>{transaction.merchant_transaction_id}</span>
            <Badge color={statusTone} text={status} />
          </h2>
          <p className='tx-sub'>
            {transaction.app_name}
            <span className='sep'>·</span>
            <span className='tx-mono dim'>{fmt(transaction.created_at)}</span>
            {failReason && (
              <>
                <span className='sep'>·</span>
                <span className='tx-fail'>{failReason}</span>
              </>
            )}
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

          {transaction.status_code === 1000 || transaction.status_code === 1003 ? (
            <Button
              type='button'
              variant='contained'
              onClick={handleResendCallback}
              disabled={resendDisabled || resendLoading}
            >
              {resendLoading ? 'Sending...' : resendDisabled ? `Resend (${countdown}s)` : 'Resend Callback'}
            </Button>
          ) : null}
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
              <Badge color={statusTone} text={status} /> {failReason && <span className='tx-fail'>{failReason}</span>}
            </KV>
            <KV label='Currency'>{transaction.currency}</KV>
            <KV label='Payment Method'>{paymentMethod}</KV>
            <KV label='Route' mono>
              {transaction.payment_method}
            </KV>
            <KV label='Item Name'>{transaction.item_name}</KV>
            <KV label='Testing'>{transaction.testing ? 'True' : 'False'}</KV>
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
            <h3>Customer</h3>
          </div>
          <dl className='tx-kv'>
            <KV label='Merchant Transaction ID' mono>
              {transaction.merchant_transaction_id}
            </KV>
            <KV label='App Name'>{transaction.app_name}</KV>
            <KV label='User MDN' mono>
              {transaction.user_mdn}
            </KV>
            <KV label='User ID' mono>
              {transaction.user_id}
            </KV>
          </dl>
        </section>

        <section className='tx-card span-2'>
          <div className='tx-card-head'>
            <h3>Timeline</h3>
          </div>
          <dl className='tx-kv cols-3'>
            <KV label='Created At' mono>
              {fmt(transaction.created_at)}
            </KV>
            <KV label='Request Date' mono>
              {fmt(transaction.timestamp_request_date)}
            </KV>
            <KV label='Updated At' mono>
              {fmt(transaction.updated_at)}
            </KV>
            <KV label='Callback Date' mono>
              {transaction.timestamp_callback_date ? fmt(transaction.timestamp_callback_date) : '-'}
            </KV>
            <KV label='Callback result' mono>
              {transaction.timestamp_callback_result}
            </KV>
          </dl>
        </section>
      </div>
    </div>
  )
}

export default TransactionMerchantDetail
