import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import dayjs from 'dayjs'
import { Tag, Button, Skeleton, Table, Tooltip, Alert } from 'antd'
import {
  ArrowLeftOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  KeyOutlined,
  CopyOutlined,
} from '@ant-design/icons'

import { useAuth } from '../../provider/AuthProvider'

const useMerchantDetail = (id?: string) => {
  const [data, setData] = useState<MerchantListDataApi | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const { token, apiUrl } = useAuth()

  useEffect(() => {
    const getMerchantDetail = async () => {
      if (!id || id === 'undefined' || id.trim() === '') {
        setError('Invalid merchant ID')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError('')
      const url = `${apiUrl}/admin/merchant/${id}`

      try {
        const response = await axios.get<{ data: MerchantListDataApi }>(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        setData(response?.data?.data ?? null)
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          setError(error.response.data?.message || 'Failed to load merchant data')
        } else {
          setError('An unexpected error occurred')
        }
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      getMerchantDetail()
    } else {
      console.warn('[MerchantDetail] No id provided, skipping fetch')
      setIsLoading(false)
    }
  }, [id, token, apiUrl])

  return { isLoading, error, merchantDetail: data }
}

const DetailMerchant = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { merchantDetail, isLoading, error: merchantError } = useMerchantDetail(id)
  const { role } = useAuth()

  const [showClientSecret, setShowClientSecret] = useState(false)
  const [visibleAppKeys, setVisibleAppKeys] = useState<Record<number, boolean>>({})

  const isSuperAdmin = role === 'superadmin'

  const getStatusColor = (status: string | number) => {
    return status === 1 || status === '1' ? 'green' : 'red'
  }

  const getStatusText = (status: string | number) => {
    return status === 1 || status === '1' ? 'Active' : 'Inactive'
  }

  const toggleAppKeyVisibility = (appId: number) => {
    setVisibleAppKeys((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const maskSensitiveData = (data: string, visible: boolean) => {
    if (!data) return '-'
    if (visible || !isSuperAdmin) return data
    return '••••••••••••••••'
  }

  const renderSensitiveField = (value: string, visible: boolean, onToggle: () => void) => {
    if (!isSuperAdmin) {
      return <span className='tx-empty'>Hidden</span>
    }

    return (
      <span className='tx-secret'>
        <code>{maskSensitiveData(value, visible)}</code>
        <Button
          type='text'
          size='small'
          icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={onToggle}
        />
        {visible && <Button type='text' size='small' icon={<CopyOutlined />} onClick={() => copyToClipboard(value)} />}
      </span>
    )
  }

  const loadingBlock = (rows: number) => (
    <div className='tx-card-body'>
      <Skeleton active paragraph={{ rows }} />
    </div>
  )
  const ready = !!merchantDetail && !isLoading
  const fmtDate = (d?: string) => (d ? dayjs(d).format('DD MMM YYYY, HH:mm:ss') : '-')
  const label = (text: string) => text.replace(/_/g, ' ').toUpperCase()

  return (
    <div className='tx-page'>
      {/* Header */}
      <header className='tx-head'>
        <div className='tx-head-main'>
          <span className='tx-eyebrow'>Merchant</span>
          <h2 className='tx-title'>
            {merchantDetail?.client_name || 'Merchant Details'}
            {merchantDetail && (
              <Tag color={getStatusColor(merchantDetail.client_status)}>
                {getStatusText(merchantDetail.client_status)}
              </Tag>
            )}
          </h2>
          {merchantDetail && (
            <p className='tx-sub'>
              <span className='tx-mono dim'>{merchantDetail.u_id}</span>
              <span className='sep'>·</span>
              {merchantDetail.app_name || '-'}
            </p>
          )}
        </div>
        <div className='tx-actions'>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </header>

      {/* Error Message */}
      {merchantError && !isLoading && (
        <Alert message='Error' description={merchantError} type='error' showIcon closable />
      )}

      {id && (id === 'undefined' || id.trim() === '') && (
        <Alert
          message='Invalid ID'
          description={`The merchant ID "${id}" is invalid. Please go back to the previous page.`}
          type='warning'
          showIcon
          closable
        />
      )}

      {/* Content */}
      <div className='tx-detail-grid side'>
        <div className='tx-stack'>
          {/* Main Information */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Merchant Information</h3>
            </div>
            {ready && merchantDetail ? (
              <dl className='tx-kv'>
                <div>
                  <dt>Merchant Name</dt>
                  <dd>{merchantDetail.client_name || '-'}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <Tag color={getStatusColor(merchantDetail.client_status)}>
                      {getStatusText(merchantDetail.client_status)}
                    </Tag>
                  </dd>
                </div>
                <div>
                  <dt>
                    <PhoneOutlined />
                    Phone
                  </dt>
                  <dd className='mono'>{merchantDetail.phone || '-'}</dd>
                </div>
                <div>
                  <dt>
                    <MailOutlined />
                    Email
                  </dt>
                  <dd>{merchantDetail.email || '-'}</dd>
                </div>
                <div className='wide'>
                  <dt>Address</dt>
                  <dd>{merchantDetail.address || '-'}</dd>
                </div>
                <div>
                  <dt>UID</dt>
                  <dd className='mono'>{merchantDetail.u_id || '-'}</dd>
                </div>
                <div>
                  <dt>
                    <KeyOutlined />
                    Client Secret
                  </dt>
                  <dd>
                    {renderSensitiveField(merchantDetail.client_secret, showClientSecret, () =>
                      setShowClientSecret(!showClientSecret),
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              loadingBlock(5)
            )}
          </section>

          {/* Application Info */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Application Information</h3>
            </div>
            {ready && merchantDetail ? (
              <dl className='tx-kv'>
                <div>
                  <dt>Application Name</dt>
                  <dd>{merchantDetail.app_name || '-'}</dd>
                </div>
                <div>
                  <dt>Application Type</dt>
                  <dd>{merchantDetail.mobile ? 'Mobile App' : 'Web App'}</dd>
                </div>
                <div className='wide'>
                  <dt>
                    <LinkOutlined />
                    Callback URL
                  </dt>
                  <dd className='mono'>
                    {merchantDetail.callback_url ? (
                      <a href={merchantDetail.callback_url} target='_blank' rel='noopener noreferrer'>
                        {merchantDetail.callback_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Testing Mode</dt>
                  <dd>
                    <Tag color={merchantDetail.testing === 1 ? 'orange' : 'green'}>
                      {merchantDetail.testing === 1 ? 'Testing' : 'Production'}
                    </Tag>
                  </dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd className='mono'>{merchantDetail.lang || 'id'}</dd>
                </div>
                <div className='wide'>
                  <dt>Whitelisted IPs</dt>
                  <dd>
                    {merchantDetail.whitelisted_ips && merchantDetail.whitelisted_ips.trim() !== '' ? (
                      <div className='tx-tags'>
                        {merchantDetail.whitelisted_ips
                          .split(',')
                          .map((ip) => ip.trim())
                          .filter(Boolean)
                          .map((ip, index) => (
                            <span key={index} className='tx-code'>
                              {ip}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className='tx-empty'>All IPs allowed</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              loadingBlock(4)
            )}
          </section>

          {/* Apps Section */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Applications</h3>
              {merchantDetail && <span className='tx-count'>{merchantDetail.apps?.length || 0} apps</span>}
            </div>
            {ready && merchantDetail ? (
              <Table
                dataSource={merchantDetail.apps}
                rowKey='id'
                size='small'
                pagination={false}
                scroll={{ x: 'max-content' }}
                columns={[
                  {
                    title: 'App Name',
                    dataIndex: 'app_name',
                    key: 'app_name',
                  },
                  {
                    title: 'App ID',
                    dataIndex: 'appid',
                    key: 'appid',
                    render: (appid, record) =>
                      renderSensitiveField(appid, visibleAppKeys[record.id] || false, () =>
                        toggleAppKeyVisibility(record.id),
                      ),
                  },
                  {
                    title: 'App Key',
                    dataIndex: 'appkey',
                    key: 'appkey',
                    render: (appkey, record) =>
                      renderSensitiveField(appkey, visibleAppKeys[record.id] || false, () =>
                        toggleAppKeyVisibility(record.id),
                      ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
                  },
                  {
                    title: 'Testing',
                    dataIndex: 'testing',
                    key: 'testing',
                    render: (testing) => (
                      <Tag color={testing === 1 ? 'orange' : 'green'}>{testing === 1 ? 'Testing' : 'Production'}</Tag>
                    ),
                  },
                  {
                    title: 'Callback URL',
                    dataIndex: 'callback_url',
                    key: 'callback_url',
                    render: (url) =>
                      url ? (
                        <Tooltip title={url}>
                          <a href={url} target='_blank' rel='noopener noreferrer' className='tx-mono'>
                            {url.length > 30 ? `${url.substring(0, 30)}...` : url}
                          </a>
                        </Tooltip>
                      ) : (
                        '-'
                      ),
                  },
                ]}
              />
            ) : (
              loadingBlock(3)
            )}
          </section>

          {/* Settlements Section */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Settlement Configuration</h3>
            </div>
            {ready && merchantDetail ? (
              <Table
                dataSource={merchantDetail.settlements}
                rowKey='id'
                size='small'
                pagination={false}
                scroll={{ x: 'max-content' }}
                columns={[
                  {
                    title: 'Payment Method',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name) => <span className='tx-code'>{label(name)}</span>,
                  },
                  {
                    title: 'MDR',
                    dataIndex: 'mdr',
                    key: 'mdr',
                    align: 'right',
                    render: (mdr) => <span className='tx-amount'>{`${mdr}`}</span>,
                  },
                  {
                    title: 'PPN',
                    dataIndex: 'additional_percent',
                    key: 'additional_percent',
                    align: 'right',
                    render: (percent) => <span className='tx-amount'>{percent ? `${percent}%` : 'No'}</span>,
                  },
                  {
                    title: 'Tax 23',
                    dataIndex: 'tax23',
                    key: 'tax23',
                    render: (tax) => (tax === '1' ? 'Yes' : 'No'),
                  },
                  {
                    title: 'IS BHPUSO',
                    dataIndex: 'is_bhpuso',
                    key: 'is_bhpuso',
                    render: (isbhp) => (isbhp === '1' ? 'Yes' : 'No'),
                  },
                  {
                    title: 'Share Partner',
                    dataIndex: 'share_partner',
                    key: 'share_partner',
                    align: 'right',
                    render: (share) => <span className='tx-amount'>{`${share}%`}</span>,
                  },
                  {
                    title: 'Share Redision',
                    dataIndex: 'share_redision',
                    key: 'share_redision',
                    align: 'right',
                    render: (share) => <span className='tx-amount'>{`${share}%`}</span>,
                  },
                ]}
              />
            ) : (
              loadingBlock(3)
            )}
          </section>
        </div>

        {/* Sidebar Information */}
        <div className='tx-stack'>
          {/* Payment Methods */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Payment Methods</h3>
              {merchantDetail && <span className='tx-count'>{merchantDetail.payment_methods?.length || 0}</span>}
            </div>
            {ready && merchantDetail ? (
              <div className='tx-card-body'>
                {!merchantDetail.payment_methods || merchantDetail.payment_methods.length === 0 ? (
                  <span className='tx-empty'>No payment methods</span>
                ) : (
                  <div className='tx-tags'>
                    {merchantDetail.payment_methods.map((item, index) => (
                      <span key={index} className='tx-code'>
                        {label(item.name)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              loadingBlock(2)
            )}
          </section>

          {/* Route Weights */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Route Weights</h3>
            </div>
            {ready && merchantDetail ? (
              !merchantDetail.route_weights || merchantDetail.route_weights.length === 0 ? (
                <div className='tx-card-body'>
                  <span className='tx-empty'>No route weights</span>
                </div>
              ) : (
                <div className='tx-route-list'>
                  {merchantDetail.route_weights.map((rw, index) => (
                    <div key={index} className='tx-route'>
                      <div className='name'>
                        <strong>{label(rw.payment_method)}</strong>
                        <span>{rw.route}</span>
                      </div>
                      <div className='right'>
                        <span className='bar' aria-hidden='true'>
                          <i style={{ width: `${Math.max(0, Math.min(100, Number(rw.weight) || 0))}%` }} />
                        </span>
                        <span className='w'>{rw.weight}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              loadingBlock(2)
            )}
          </section>

          {/* Timestamps */}
          <section className='tx-card'>
            <div className='tx-card-head'>
              <h3>Timeline</h3>
            </div>
            {ready && merchantDetail ? (
              <dl className='tx-kv cols-1'>
                <div>
                  <dt>Date Created</dt>
                  <dd className='mono'>{fmtDate(merchantDetail.created_at)}</dd>
                </div>
                <div>
                  <dt>Last Updated</dt>
                  <dd className='mono'>{fmtDate(merchantDetail.updated_at)}</dd>
                </div>
              </dl>
            ) : (
              loadingBlock(3)
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default DetailMerchant
