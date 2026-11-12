import { useEffect, useState } from 'react'
import { Descriptions, Modal, Spin } from 'antd'
import axios from 'axios'
import dayjs from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import formatRupiah from '../utils/FormatRupiah'

type Props = {
  transactionId: string | null
  open: boolean
  onClose: () => void
}

function statusLabel(code?: number) {
  if (code === 1000) return { text: 'Success', tone: 'success' }
  if (code === 1005) return { text: 'Failed', tone: 'failed' }
  if (code === 1003) return { text: 'Waiting', tone: 'waiting' }
  return { text: 'Pending', tone: 'pending' }
}

function paymentLabel(method?: string) {
  switch (method) {
    case 'xl_airtime':
      return 'XL'
    case 'telkomsel_airtime':
      return 'Telkomsel'
    case 'smartfren_airtime':
      return 'Smartfren'
    case 'indosat_airtime':
      return 'Indosat'
    case 'three_airtime':
    case 'tri_airtime':
      return 'Tri'
    default:
      return method || '-'
  }
}

export default function MonitoringTransactionDetailModal({ transactionId, open, onClose }: Props) {
  const { token, apiUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [trx, setTrx] = useState<any | null>(null)

  useEffect(() => {
    if (!open || !transactionId || !token || !apiUrl) return

    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setTrx(null)
        const res = await axios.get(`${apiUrl}/transaction/${transactionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!cancelled) setTrx(res.data?.data || null)
      } catch (e) {
        console.error('Monitoring transaction detail error:', e)
        if (!cancelled) setTrx(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, transactionId, token, apiUrl])

  const status = statusLabel(trx?.status_code)

  return (
    <Modal
      title='Transaction Detail'
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      className='mon-trx-modal'
      destroyOnClose
      centered
      zIndex={2200}
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: 24 }}>
          <Spin />
        </div>
      ) : !trx ? (
        <div style={{ padding: 24, textAlign: 'left', color: 'var(--faint)' }}>Transaction not found</div>
      ) : (
        <Descriptions bordered size='small' column={2} className='mon-trx-detail'>
          <Descriptions.Item label='Transaction ID' span={2}>
            <span className='mon-trx-mono'>{trx.u_id || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='Merchant Trx ID'>
            <span className='mon-trx-mono'>{trx.merchant_transaction_id || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='Status'>
            <span className={`mon-status ${status.tone}`}>{status.text}</span>
          </Descriptions.Item>
          <Descriptions.Item label='User MDN'>
            <span className='mon-trx-mono'>{trx.user_mdn || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='User ID'>{trx.user_id || '-'}</Descriptions.Item>
          <Descriptions.Item label='Merchant'>{trx.merchant_name || '-'}</Descriptions.Item>
          <Descriptions.Item label='App'>{trx.app_name || '-'}</Descriptions.Item>
          <Descriptions.Item label='Payment Method'>{paymentLabel(trx.payment_method)}</Descriptions.Item>
          <Descriptions.Item label='Route'>{trx.route || '-'}</Descriptions.Item>
          <Descriptions.Item label='Amount'>{formatRupiah(trx.amount)}</Descriptions.Item>
          <Descriptions.Item label='Price'>{formatRupiah(trx.price)}</Descriptions.Item>
          <Descriptions.Item label='Item Name' span={2}>
            {trx.item_name || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Created At'>
            <span className='mon-trx-mono'>{trx.created_at ? dayjs(trx.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='Updated At'>
            <span className='mon-trx-mono'>{trx.updated_at ? dayjs(trx.updated_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='Fail Reason' span={2}>
            {trx.fail_reason || '-'}
          </Descriptions.Item>
          <Descriptions.Item label='Client IP'>
            <span className='mon-trx-mono'>{trx.user_ip || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label='App ID'>
            <span className='mon-trx-mono'>{trx.appid || '-'}</span>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  )
}
