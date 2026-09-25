// TransactionDetail.tsx
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import axios from 'axios'
import dayjs from 'dayjs'
import { Typography, Card, CircularProgress, Box } from '@mui/material'
import { useAuth } from '../provider/AuthProvider'
import { useNavigate } from 'react-router-dom'
import formatRupiah from '../utils/FormatRupiah'

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
    return <CircularProgress />
  }

  if (!transaction) {
    return <Typography variant='h6'>Transaction not found</Typography>
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

  return (
    <div>
      <Card className='transaction-detail-surface' sx={{ padding: 2 }}>
        <Typography variant='h5' sx={{ mb: 2 }}>
          Transaction Detail
        </Typography>
        <Box display='flex' flexDirection='column' gap={2}>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Merchant Transaction ID:</strong>
              </div>
              <div>{transaction.merchant_transaction_id}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>User MDN:</strong>
              </div>
              <div>{transaction.user_mdn}</div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong> User ID:</strong>
              </div>
              <div> {transaction.user_id}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong> Payment Method:</strong>
              </div>
              <div> {paymentMethod}</div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Currency:</strong>
              </div>
              <div>{transaction.currency}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Status:</strong>
              </div>
              <div>
                {status} {failReason}
              </div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong> Amount :</strong>
              </div>
              <div> {formatRupiah(transaction.amount)}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Item Name:</strong>
              </div>
              <div>{transaction.item_name}</div>
            </div>
          </Box>

          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Testing :</strong>
              </div>
              <div> {transaction.testing ? 'True' : 'False'}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Price:</strong>
              </div>
              <div>{formatRupiah(transaction.price)}</div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Route :</strong>
              </div>
              <div> {transaction.payment_method}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>App Name:</strong>
              </div>
              <div>{transaction.app_name}</div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Created At:</strong>
              </div>
              <div>{dayjs(transaction.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Updated At:</strong>
              </div>
              <div> {dayjs(transaction.updated_at).format('YYYY-MM-DD HH:mm:ss')}</div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Request Date:</strong>
              </div>
              <div> {dayjs(transaction.timestamp_request_date).format('YYYY-MM-DD HH:mm:ss')} </div>
            </div>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Callback Date:</strong>
              </div>
              <div>
                {transaction.timestamp_callback_date
                  ? dayjs(transaction.timestamp_callback_date).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}{' '}
              </div>
            </div>
          </Box>
          <Box display='flex'>
            <div className='w-full flex'>
              <div className='w-1/4'>
                <strong>Callback result:</strong>
              </div>
              <div>{transaction.timestamp_callback_result}</div>
            </div>
            {transaction.payment_method === 'telkomsel_airtime' ? (
              <div className='w-full flex'>
                <div className='w-1/4'>
                  <strong>SMS Code:</strong>
                </div>
                <div>{transaction.otp}</div>
              </div>
            ) : transaction.payment_method === 'va_bca' ? (
              <div className='w-full flex'>
                <div className='w-1/4'>
                  <strong>VA BCA:</strong>
                </div>
                <div>{transaction.va_bca}</div>
              </div>
            ) : (
              <div className='w-full flex'></div>
            )}
          </Box>
        </Box>
      </Card>
      {/* <div className='flex pl-4 pt-2'>
        <Button
          type='button'
          className='mt-3 mr-4'
          size='small'
          variant='contained'
          color='info'
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Button type='button' disabled className='mt-3 mr-4' variant='contained' color='success'>
          Make Success
        </Button>
      </div> */}
      <div className='flex pl-4 pt-2'>
        <Button
          type='button'
          className='mt-3 mr-4'
          size='small'
          variant='contained'
          color='primary'
          onClick={() => navigate(-1)}
        >
          Back
        </Button>

        {transaction.status_code === 1000 || transaction.status_code === 1003 ? (
          <Button
            type='button'
            className='mt-3 mr-4'
            variant='contained'
            color='success'
            size='small'
            onClick={handleResendCallback}
            disabled={resendDisabled || resendLoading}
            sx={{
              backgroundColor: '#4caf50',
              color: 'white',
              '&:hover': {
                backgroundColor: '#45a049',
              },
              '&:disabled': {
                backgroundColor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            {resendLoading ? 'Sending...' : resendDisabled ? `Resend (${countdown}s)` : 'Resend Callback'}
          </Button>
        ) : null}

        {isDev && (
          <>
            {transaction.status_code !== 1000 && (
              <Button
                type='button'
                className='mt-3 mr-4'
                variant='contained'
                color='success'
                size='small'
                onClick={handleMarkSuccess}
              >
                Mark Success
              </Button>
            )}

            {transaction.status_code !== 1005 && (
              <Button
                type='button'
                className='mt-3 mr-4'
                variant='contained'
                color='error'
                size='small'
                onClick={handleMarkFailed}
              >
                Mark Failed
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TransactionMerchantDetail
