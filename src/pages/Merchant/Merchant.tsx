import { useEffect, useState } from 'react'

import { Box, Stack, Typography } from '@mui/material'
import { Table, Button, Input, Space } from 'antd'
import { ColumnType } from 'antd/es/table'
import axios from 'axios'
import { useAuth } from '../../provider/AuthProvider'
import { Link } from 'react-router-dom'
import EditMerchant from './components/EditMerchant'
import AddMerchant from './components/AddMerchant'
import { EyeOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'

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

  const columns: ColumnType<any>[] = [
    {
      title: 'Merchant Name',
      dataIndex: 'clientName',
      key: 'clientName',
      align: 'center',
      render: (text) => {
        if (!text) return <span style={{ paddingLeft: '8px' }}>-</span>
        return <span style={{ paddingLeft: '8px' }}>{text}</span>
      },
    },
    {
      title: 'User ID',
      dataIndex: 'uid',
      key: 'uid',
      align: 'center',
      render: (text) => {
        if (!text) return <span style={{ paddingLeft: '8px' }}>-</span>
        return <span style={{ paddingLeft: '8px' }}>{text}</span>
      },
    },

    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      align: 'center',
      render: (text) => {
        if (!text) return <span style={{ paddingLeft: '8px' }}>-</span>
        return <span style={{ paddingLeft: '8px' }}>{text}</span>
      },
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      align: 'center',
      render: (text) => {
        if (!text) return <span style={{ paddingLeft: '8px' }}>-</span>
        return <span style={{ paddingLeft: '8px' }}>{text}</span>
      },
    },
    {
      title: 'App Name',
      dataIndex: 'apps',
      key: 'firstAppName',
      align: 'center',
      render: (apps) => {
        const firstApp = apps && apps.length > 0 ? apps[0] : null
        const appName = firstApp?.appName || '-'
        return <span style={{ paddingLeft: '8px' }}>{appName}</span>
      },
    },
    {
      title: 'Action',
      key: 'action',
      dataIndex: 'uid',
      width: 300,
      align: 'center',
      render: (uid, record) => {
        // const isValidClientid = uid && uid !== 'undefined' && uid.trim() !== ''

        return (
          <Stack direction='row' justifyContent='center' alignItems='center' spacing={1} sx={{ minHeight: 40 }}>
            <Link to={`/merchant/${uid}`}>
              <Button
                type='primary'
                size='small'
                icon={<EyeOutlined />}
                style={{
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  height: 28,
                  minWidth: 70,
                }}
              >
                View
              </Button>
            </Link>

            <EditMerchant id={uid} data={record} />

            <Button
              type='primary'
              danger
              size='small'
              icon={<DeleteOutlined />}
              style={{
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                height: 28,
                minWidth: 70,
              }}
              onClick={() => {
                // TODO: Implement delete functionality
                console.log('[Merchant] Delete merchant:', uid, record)
              }}
              // disabled={!isValidClientid}
            >
              Delete
            </Button>
          </Stack>
        )
      },
    },
  ]

  useEffect(() => {
    onGetMerchant()
  }, [])

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
          mx: 3,
          pb: 5,
          mt: { xs: 8, md: 0 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '96vw' }}>
          <Typography component='h2' variant='h6' sx={{ mb: 2 }}>
            Merchant Data
          </Typography>

          <Space direction='vertical' style={{ width: '100%', marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <AddMerchant onSuccess={onGetMerchant} />
              <Search
                placeholder='Cari merchant (nama, email, phone, UID, app name...)'
                allowClear
                enterButton={<SearchOutlined />}
                size='middle'
                style={{ width: 400 }}
                onSearch={handleSearch}
                onChange={(e) => {
                  setSearchText(e.target.value)
                  if (!e.target.value) {
                    handleSearch('')
                  }
                }}
                value={searchText}
              />
            </Space>
          </Space>

          <Table
            columns={columns}
            dataSource={filteredData}
            loading={isLoading}
            size='small'
            className='transactions-table'
            pagination={{
              total: filteredData.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} merchant`,
            }}
          />
        </Box>
      </Stack>
    </Box>
  )
}

export default Merchant
