import { useEffect, useState } from 'react'

import { Table, Button, Input } from 'antd'
import { ColumnType } from 'antd/es/table'
import axios from 'axios'
import { useAuth } from '../../provider/AuthProvider'
import { Link } from 'react-router-dom'
import EditMerchant from './components/EditMerchant'
import AddMerchant from './components/AddMerchant'
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons'

const { Search } = Input

const Merchant = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [data, setData] = useState<MerchantListDataModel[]>([])
  const [filteredData, setFilteredData] = useState<MerchantListDataModel[]>([])
  const [searchText, setSearchText] = useState<string>('')
  const { token, apiUrl } = useAuth()

  const onGetMerchant = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get<{ data?: MerchantListDataApi[] }>(`${apiUrl}/admin/merchants`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const merchantsData = Array.isArray(response.data?.data) ? response.data.data : []

      const data: MerchantListDataModel[] = merchantsData.map((item) => {
        return {
          uid: item.u_id,
          clientName: item.client_name,
          clientAppkey: item.client_appkey,
          clientSecret: item.client_secret,
          clientAppid: item.client_appid,
          appName: item.app_name,
          mobile: item.mobile,
          clientStatus: item.client_status,
          phone: item.phone,
          email: item.email,
          testing: item.testing,
          lang: item.lang,
          callbackUrl: item.callback_url,
          failCallback: item.fail_callback,
          isdcb: item.isdcb,
          updatedAt: item.updated_at,
          createdAt: item.created_at,
          paymentMethods: item.payment_methods.map((method) => ({
            id: method.id,
            name: method.name,
            route: Array.isArray(method.route)
              ? method.route.reduce(
                  (acc, routeName, index) => ({ ...acc, [index]: [routeName] }),
                  {} as { [key: string]: any[] },
                )
              : (method.route as { [key: string]: any[] }) || {},
            flexible: method.flexible,
            status: method.status,
            msisdn: method.msisdn,
            clientId: method.client_id,
          })),
          settlements: item.settlements.map((settlement) => ({
            id: settlement.id,
            clientId: settlement.client_id,
            name: settlement.name,
            isBhpuso: settlement.is_bhpuso,
            serviceCharge: settlement.servicecharge,
            tax23: settlement.tax23,
            ppn: settlement.ppn,
            mdr: settlement.mdr,
            mdrType: settlement.mdr_type,
            additionalFee: settlement.additionalfee,
            additionalPercent: settlement.additional_percent,
            additionalFeeType: settlement.additionalfee_type,
            paymentType: settlement.payment_type,
            shareRedision: settlement.share_redision,
            sharePartner: settlement.share_partner,
            isDivide1poin1: settlement.is_divide_1poin1,
            updatedAt: settlement.updated_at,
            createdAt: settlement.created_at,
          })),
          apps: item.apps.map((app) => ({
            id: app.id,
            appName: app.app_name,
            appid: app.appid,
            appkey: app.appkey,
            callbackUrl: app.callback_url,
            testing: app.testing,
            status: app.status,
            mobile: app.mobile,
            failCallback: app.fail_callback,
            clientId: app.client_id,
            createdAt: app.created_at,
            updatedAt: app.updated_at,
          })),
        }
      })

      setData(data)
      setFilteredData(data)
    } catch (error) {
      console.log('err: ', error)
    }
    setIsLoading(false)
  }

  const handleSearch = (value: string) => {
    setSearchText(value)
    if (!value.trim()) {
      setFilteredData(data)
      return
    }

    const filtered = data.filter((merchant) => {
      const searchLower = value.toLowerCase()
      const firstApp = merchant.apps && merchant.apps.length > 0 ? merchant.apps[0] : null

      return (
        merchant.clientName?.toLowerCase().includes(searchLower) ||
        merchant.uid?.toLowerCase().includes(searchLower) ||
        merchant.email?.toLowerCase().includes(searchLower) ||
        merchant.phone?.toLowerCase().includes(searchLower) ||
        merchant.appName?.toLowerCase().includes(searchLower) ||
        firstApp?.appName?.toLowerCase().includes(searchLower)
      )
    })

    setFilteredData(filtered)
  }

  const dash = <span className='tx-empty'>-</span>

  const columns: ColumnType<any>[] = [
    {
      title: 'Merchant Name',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (text) => (text ? <span style={{ fontWeight: 500 }}>{text}</span> : dash),
    },
    {
      title: 'User ID',
      dataIndex: 'uid',
      key: 'uid',
      render: (text) => (text ? <span className='tx-mono dim'>{text}</span> : dash),
    },

    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => (text ? <span className='tx-dim'>{text}</span> : dash),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text) => (text ? <span className='tx-mono'>{text}</span> : dash),
    },
    {
      title: 'App Name',
      dataIndex: 'apps',
      key: 'firstAppName',
      render: (apps) => {
        const firstApp = apps && apps.length > 0 ? apps[0] : null
        const appName = firstApp?.appName || '-'
        return <span>{appName}</span>
      },
    },
    {
      title: '',
      key: 'action',
      dataIndex: 'uid',
      align: 'right',
      fixed: 'right',
      render: (uid, record) => {
        // const isValidClientid = uid && uid !== 'undefined' && uid.trim() !== ''

        return (
          <span className='tx-row-actions'>
            <Link to={`/merchant/${uid}`} className='tx-link-btn'>
              <EyeOutlined />
              View
            </Link>

            <EditMerchant id={uid} data={record} />

            <Button
              size='small'
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                // TODO: Implement delete functionality
                console.log('[Merchant] Delete merchant:', uid, record)
              }}
              // disabled={!isValidClientid}
            >
              Delete
            </Button>
          </span>
        )
      },
    },
  ]

  useEffect(() => {
    onGetMerchant()
  }, [])

  return (
    <div className='tx-page'>
      <header className='tx-head'>
        <div className='tx-actions'>
          <AddMerchant onSuccess={onGetMerchant} />
        </div>
      </header>

      <section className='tx-card'>
        <div className='tx-filterbar'>
          <Search
            placeholder='Search merchants (name, email, phone, UID, app name...)'
            allowClear
            className='tx-search'
            onSearch={handleSearch}
            onChange={(e) => {
              setSearchText(e.target.value)
              if (!e.target.value) {
                handleSearch('')
              }
            }}
            value={searchText}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
          size='small'
          className='transactions-table'
          rowKey='uid'
          scroll={{ x: 'max-content' }}
          pagination={{
            total: filteredData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} merchants`,
          }}
        />
      </section>
    </div>
  )
}

export default Merchant
