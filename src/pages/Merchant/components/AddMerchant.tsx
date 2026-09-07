import { useState } from 'react'
import { Button, Form, Modal, Input, Select, Card, Row, Col, message, Space, Table } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import axios from 'axios'
import { useAuth } from '../../../provider/AuthProvider'

const { Option } = Select
const { TextArea } = Input

interface AddMerchantProps {
  onSuccess?: () => void
}

interface PaymentMethodAPI {
  id: number
  slug: string
  description: string
  type: string
  status: string
  flexible: boolean
  min_denom: number
  denom: string[] | null
  prefix: string[] | null
  route: string[] | null
}

interface SelectedRoute {
  route: string
  weight: number
}

interface SettlementConfig {
  is_bhpuso: string
  servicecharge: string
  tax23: string
  ppn: number | null
  mdr: string
  mdr_type: string
  additionalfee: number
  additional_percent: number
  additionalfee_type: number | null
  payment_type: string
  share_redision: number
  share_partner: number
  is_divide_1poin1: string
}

interface SelectedPaymentMethod {
  payment_method_slug: string
  selected_routes: SelectedRoute[]
  status: number
  msisdn: number
  settlement_config: SettlementConfig
}

interface ClientApp {
  app_name: string
  callback_url: string
  testing: number
  status: number
  mobile: string
  fail_callback?: string
}

interface MerchantFormData {
  client_name: string
  app_name: string
  mobile: string
  address: string
  client_status: number
  testing: number
  lang: string
  callback_url: string
  email: string
  phone: string
  fail_callback: string
  fail_callback_url?: string
  isdcb: string
  whitelisted_ips?: string
}

const AddMerchant = ({ onSuccess }: AddMerchantProps) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<MerchantFormData>()
  const [apps, setApps] = useState<ClientApp[]>([])
  const [appModalOpen, setAppModalOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<number | null>(null)
  const [appForm] = Form.useForm()
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<SelectedPaymentMethod[]>([])
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethodAPI[]>([])
  const [paymentConfigModalOpen, setPaymentConfigModalOpen] = useState(false)
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null)
  const [paymentConfigForm] = Form.useForm()

  const { token, apiUrl } = useAuth()

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get<{ data: PaymentMethodAPI[]; success: boolean }>(
        `${apiUrl}/admin/payment-methods`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.data.success) {
        setAvailablePaymentMethods(response.data.data)
        // Initialize selected payment methods as empty - user will select manually
        setSelectedPaymentMethods([])
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      message.error('Failed to load payment methods')
      setSelectedPaymentMethods([])
    }
  }

  const handleOpen = () => {
    setOpen(true)
    fetchPaymentMethods()
  }
  const handleClose = () => {
    setOpen(false)
    form.resetFields()
    setApps([])
    setAppModalOpen(false)
    setEditingApp(null)
    appForm.resetFields()
    setSelectedPaymentMethods([])
    setAvailablePaymentMethods([])
    setPaymentConfigModalOpen(false)
    setEditingPaymentIndex(null)
    paymentConfigForm.resetFields()
  }

  //   const defaultPaymentMethods: PaymentMethod[] = [
  //     { name: 'qris', route: { qris_midtrans: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'gopay', route: { gopay_midtrans: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'shopeepay', route: { shopeepay_midtrans: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'dana', route: { dana: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'ovo', route: { ovo: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'telkomsel_airtime', route: { telkomsel_airtime_sms: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'xl_airtime', route: { xl_twt: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'indosat_airtime', route: { indosat_triyakom: [] }, status: 1, msisdn: 1, flexible: true },
  //     { name: 'smartfren_airtime', route: { smartfren_triyakom: [] }, status: 1, msisdn: 1, flexible: true },
  //     {
  //       name: 'three_airtime',
  //       route: {
  //         three_triyakom: [
  //           '1000',
  //           '2000',
  //           '3000',
  //           '5000',
  //           '10000',
  //           '20000',
  //           '25000',
  //           '30000',
  //           '50000',
  //           '60000',
  //           '100000',
  //           '200000',
  //           '250000',
  //           '500000',
  //         ],
  //       },
  //       status: 1,
  //       msisdn: 1,
  //       flexible: false,
  //     },
  //   ]

  //   const defaultSettlements: Settlement[] = [
  //     {
  //       name: 'gopay',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'shopeepay',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'dana',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 0,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'qris',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 0,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'ovo',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 0,
  //       payment_type: 'idr',
  //       share_redision: 25,
  //       share_partner: 75,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'telkomsel_airtime',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'xl_airtime',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'indosat_airtime',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'smartfren_airtime',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //     {
  //       name: 'three_airtime',
  //       is_bhpuso: '0',
  //       servicecharge: '0',
  //       tax23: '0',
  //       mdr: '0',
  //       mdr_type: '',
  //       additional_percent: 11,
  //       payment_type: 'idr',
  //       share_redision: 10,
  //       share_partner: 90,
  //       is_divide_1poin1: '0',
  //     },
  //   ]

  const handleAddApp = () => {
    setEditingApp(null)
    appForm.resetFields()
    setAppModalOpen(true)
  }

  const handleEditApp = (index: number) => {
    setEditingApp(index)
    appForm.setFieldsValue(apps[index])
    setAppModalOpen(true)
  }

  const handleDeleteApp = (index: number) => {
    const newApps = apps.filter((_, i) => i !== index)
    setApps(newApps)
  }

  const handleAppSubmit = (values: ClientApp) => {
    if (editingApp !== null) {
      // Edit existing app
      const newApps = [...apps]
      newApps[editingApp] = values
      setApps(newApps)
    } else {
      // Add new app
      setApps([...apps, values])
    }
    setAppModalOpen(false)
    appForm.resetFields()
    setEditingApp(null)
  }

  const handleAddPaymentMethod = () => {
    setEditingPaymentIndex(null)
    paymentConfigForm.resetFields()
    setPaymentConfigModalOpen(true)
  }

  const handleEditPaymentMethod = (index: number) => {
    setEditingPaymentIndex(index)
    const payment = selectedPaymentMethods[index]

    // Prepare routes for editing - if single route, don't show weight as it will be auto-set to 100
    let routesForEdit = payment.selected_routes
    if (routesForEdit.length === 1) {
      routesForEdit = routesForEdit.map((route) => ({
        ...route,
        // Remove weight for single route as it will be auto-handled
      }))
    }

    paymentConfigForm.setFieldsValue({
      payment_method_slug: payment.payment_method_slug,
      status: payment.status,
      msisdn: payment.msisdn,
      selected_routes: routesForEdit,
      settlement_config: payment.settlement_config,
    })
    setPaymentConfigModalOpen(true)
  }

  const handleDeletePaymentMethod = (index: number) => {
    const newPayments = selectedPaymentMethods.filter((_, i) => i !== index)
    setSelectedPaymentMethods(newPayments)
  }

  const handlePaymentConfigSubmit = (values: any) => {
    // Auto-set weight to 100 if only one route
    let processedRoutes = values.selected_routes || []
    if (processedRoutes.length === 1) {
      processedRoutes = processedRoutes.map((route: any) => ({
        ...route,
        weight: 100,
      }))
    } else if (processedRoutes.length > 1) {
      // Convert weights to numbers and validate total weight = 100%
      processedRoutes = processedRoutes.map((route: any) => ({
        ...route,
        weight: Number(route.weight) || 0,
      }))

      const totalWeight = processedRoutes.reduce((sum: number, route: any) => sum + route.weight, 0)
      if (totalWeight !== 100) {
        message.error(`Total weight harus 100%. Saat ini: ${totalWeight}%`)
        return
      }
    }

    const newPaymentMethod: SelectedPaymentMethod = {
      payment_method_slug: values.payment_method_slug,
      selected_routes: processedRoutes,
      status: values.status,
      msisdn: values.msisdn,
      settlement_config: {
        ...values.settlement_config,
        share_redision: Number(values.settlement_config.share_redision),
        share_partner: Number(values.settlement_config.share_partner),
      },
    }

    if (editingPaymentIndex !== null) {
      // Edit existing payment
      const newPayments = [...selectedPaymentMethods]
      newPayments[editingPaymentIndex] = newPaymentMethod
      setSelectedPaymentMethods(newPayments)
    } else {
      // Add new payment
      setSelectedPaymentMethods([...selectedPaymentMethods, newPaymentMethod])
    }
    setPaymentConfigModalOpen(false)
    paymentConfigForm.resetFields()
    setEditingPaymentIndex(null)
  }

  const handleSubmit = async (values: MerchantFormData) => {
    if (apps.length === 0) {
      message.error('Minimal harus ada satu aplikasi!')
      return
    }

    if (selectedPaymentMethods.length === 0) {
      message.error('Please select at least one payment method!')
      return
    }

    setLoading(true)
    try {
      const failCallbackUrl = values.fail_callback === '1' ? values.fail_callback_url || '' : ''

      const payload = {
        client_name: values.client_name,
        app_name: values.app_name,
        mobile: values.mobile,
        client_status: values.client_status,
        testing: values.testing,
        address: values.address,
        phone: values.phone,
        email: values.email,
        lang: values.lang,
        callback_url: values.callback_url,
        isdcb: values.isdcb,
        whitelisted_ips: values.whitelisted_ips || '',
        selected_payment_methods: selectedPaymentMethods,
        client_app: apps.map((app) => ({
          app_name: app.app_name,
          callback_url: app.callback_url,
          testing: app.testing,
          status: app.status,
          mobile: values.mobile,
          fail_callback: failCallbackUrl,
        })),
      }

      console.log('Add Merchant Payload:', payload)

      await axios.post(`${apiUrl}/admin/merchant/v2`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      message.success('Merchant berhasil ditambahkan!')
      handleClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error adding merchant:', error)
      message.error(error.response?.data?.message || 'Gagal menambahkan merchant')
    }
    setLoading(false)
  }

  const appColumns = [
    {
      title: 'Nama Aplikasi',
      dataIndex: 'app_name',
      key: 'app_name',
    },
    {
      title: 'Callback URL',
      dataIndex: 'callback_url',
      key: 'callback_url',
      render: (text: string) => text || '-',
    },
    {
      title: 'Testing',
      dataIndex: 'testing',
      key: 'testing',
      render: (value: number) => (value === 1 ? 'Yes' : 'No'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: number) => (value === 1 ? 'Active' : 'Inactive'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button size='small' icon={<EditOutlined />} onClick={() => handleEditApp(index)}>
            Edit
          </Button>
          <Button size='small' danger icon={<DeleteOutlined />} onClick={() => handleDeleteApp(index)}>
            Hapus
          </Button>
        </Space>
      ),
    },
  ]

  const selectedPaymentColumns = [
    {
      title: 'Payment Methods',
      dataIndex: 'payment_method_slug',
      key: 'payment_method_slug',
      render: (slug: string) => {
        const method = availablePaymentMethods.find((m) => m.slug === slug)
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>{slug.replace(/_/g, ' ').toUpperCase()}</div>
            {method && (
              <div style={{ fontSize: '12px', color: 'var(--dash-muted)' }}>
                {method.type} {method.description && `- ${method.description}`}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Routes & Weight',
      dataIndex: 'selected_routes',
      key: 'selected_routes',
      render: (routes: SelectedRoute[]) => (
        <div style={{ fontSize: '12px' }}>
          {routes.map((route, index) => (
            <div key={index}>
              {route.route}: {route.weight}%
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: number) =>
        value === 1 ? (
          <span style={{ color: 'var(--theme-success)' }}>Active</span>
        ) : (
          <span style={{ color: 'var(--theme-danger)' }}>Inactive</span>
        ),
    },
    {
      title: 'Settlement',
      dataIndex: 'settlement_config',
      key: 'settlement_config',
      render: (config: SettlementConfig) => (
        <div style={{ fontSize: '12px' }}>
          <div>MDR: {config.mdr}%</div>
          <div>
            Share: {config.share_redision}% / {config.share_partner}%
          </div>
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button size='small' icon={<EditOutlined />} onClick={() => handleEditPaymentMethod(index)}>
            Edit
          </Button>
          <Button size='small' danger icon={<DeleteOutlined />} onClick={() => handleDeletePaymentMethod(index)}>
            Hapus
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Button
        type='primary'
        icon={<PlusOutlined />}
        onClick={handleOpen}
        style={{
          marginBottom: 16,
          borderRadius: '6px',
          fontWeight: 600,
        }}
      >
        Tambah Merchant
      </Button>

      <Modal
        title='Tambah Merchant Baru'
        open={open}
        onCancel={handleClose}
        width={800}
        footer={[
          <Button key='cancel' onClick={handleClose}>
            Batal
          </Button>,
          <Button key='submit' type='primary' loading={loading} onClick={() => form.submit()}>
            Simpan
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{
            client_status: 1,
            testing: 1,
            lang: 'id',
            fail_callback: '0',
            isdcb: '1',
          }}
        >
          <Card title='Informasi Dasar' style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label='Client Name'
                  name='client_name'
                  rules={[{ required: true, message: 'Client name is required!' }]}
                >
                  <Input placeholder='Enter client name' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label='Application Name'
                  name='app_name'
                  rules={[{ required: true, message: 'Application name is required!' }]}
                >
                  <Input placeholder='Enter application name' />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label='Email'
                  name='email'
                  rules={[
                    { required: true, message: 'Email wajib diisi!' },
                    { type: 'email', message: 'Format email tidak valid!' },
                  ]}
                >
                  <Input placeholder='Masukkan email' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label='Nomor Telepon'
                  name='phone'
                  rules={[{ required: true, message: 'Nomor telepon wajib diisi!' }]}
                >
                  <Input placeholder='Masukkan nomor telepon' />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label='Alamat' name='address' rules={[{ required: true, message: 'Alamat wajib diisi!' }]}>
              <TextArea rows={3} placeholder='Masukkan alamat lengkap' />
            </Form.Item>
          </Card>

          <Card title='Konfigurasi' style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label='Mobile' name='mobile' rules={[{ required: true, message: 'Mobile wajib diisi!' }]}>
                  <Input placeholder='Masukkan nomor mobile' />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='Status Client' name='client_status'>
                  <Select>
                    <Option value={1}>Aktif</Option>
                    <Option value={0}>Tidak Aktif</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label='Testing Mode' name='testing'>
                  <Select>
                    <Option value={1}>Ya</Option>
                    <Option value={0}>Tidak</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label='Bahasa' name='lang'>
                  <Select>
                    <Option value='id'>Indonesia</Option>
                    <Option value='en'>English</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='DCB' name='isdcb'>
                  <Select>
                    <Option value='1'>Ya</Option>
                    <Option value='0'>Tidak</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label='Fail Callback' name='fail_callback'>
                  <Select>
                    <Option value='1'>Ya</Option>
                    <Option value='0'>Tidak</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label='Callback URL (Default)' name='callback_url'>
              <Input placeholder='https://example.com/callback' />
            </Form.Item>

            <Form.Item
              label='Whitelisted IPs'
              name='whitelisted_ips'
              tooltip='Pisahkan beberapa IP dengan koma. Kosongkan untuk mengizinkan semua IP.'
            >
              <TextArea rows={2} placeholder='192.168.1.1,10.0.0.1' />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.fail_callback !== currentValues.fail_callback}
            >
              {({ getFieldValue }) => {
                const failCallback = getFieldValue('fail_callback')
                return failCallback === '1' ? (
                  <Form.Item
                    label='Fail Callback URL'
                    name='fail_callback_url'
                    rules={[
                      { required: true, message: 'Fail callback URL wajib diisi!' },
                      { type: 'url', message: 'Format URL tidak valid!' },
                    ]}
                  >
                    <Input placeholder='https://example.com/fail-callback' />
                  </Form.Item>
                ) : null
              }}
            </Form.Item>
          </Card>

          <Card title='Metode Pembayaran' style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Button type='dashed' icon={<PlusOutlined />} onClick={handleAddPaymentMethod} style={{ width: '100%' }}>
                Pilih Metode Pembayaran
              </Button>
            </div>

            <Table
              columns={selectedPaymentColumns}
              dataSource={selectedPaymentMethods}
              pagination={false}
              size='small'
              locale={{
                emptyText: 'Belum ada metode pembayaran dipilih. Klik "Pilih Metode Pembayaran" untuk menambah.',
              }}
            />
          </Card>

          <Card title='Aplikasi' style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Button type='dashed' icon={<PlusOutlined />} onClick={handleAddApp} style={{ width: '100%' }}>
                Tambah Aplikasi
              </Button>
            </div>

            <Table
              columns={appColumns}
              dataSource={apps}
              pagination={false}
              size='small'
              locale={{
                emptyText: 'Belum ada aplikasi. Klik "Tambah Aplikasi" untuk menambah.',
              }}
            />
          </Card>
        </Form>

        {/* Modal untuk menambah/edit aplikasi */}
        <Modal
          title={editingApp !== null ? 'Edit Aplikasi' : 'Tambah Aplikasi'}
          open={appModalOpen}
          onCancel={() => {
            setAppModalOpen(false)
            appForm.resetFields()
            setEditingApp(null)
          }}
          footer={[
            <Button
              key='cancel'
              onClick={() => {
                setAppModalOpen(false)
                appForm.resetFields()
                setEditingApp(null)
              }}
            >
              Batal
            </Button>,
            <Button key='submit' type='primary' onClick={() => appForm.submit()}>
              {editingApp !== null ? 'Update' : 'Tambah'}
            </Button>,
          ]}
        >
          <Form
            form={appForm}
            layout='vertical'
            onFinish={handleAppSubmit}
            initialValues={{
              testing: 0,
              status: 1,
            }}
          >
            <Form.Item
              label='Nama Aplikasi'
              name='app_name'
              rules={[{ required: true, message: 'Nama aplikasi wajib diisi!' }]}
            >
              <Input placeholder='Masukkan nama aplikasi' />
            </Form.Item>

            <Form.Item
              label='Callback URL'
              name='callback_url'
              rules={[{ required: true, message: 'Callback URL wajib diisi!' }]}
            >
              <Input placeholder='https://example.com/callback' />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label='Testing Mode' name='testing'>
                  <Select>
                    <Option value={1}>Ya</Option>
                    <Option value={0}>Tidak</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='Status' name='status'>
                  <Select>
                    <Option value={1}>Aktif</Option>
                    <Option value={0}>Tidak Aktif</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>

        {/* Modal untuk konfigurasi payment method */}
        <Modal
          title={editingPaymentIndex !== null ? 'Edit Payment Method' : 'Pilih Payment Method'}
          open={paymentConfigModalOpen}
          onCancel={() => {
            setPaymentConfigModalOpen(false)
            paymentConfigForm.resetFields()
            setEditingPaymentIndex(null)
          }}
          width={800}
          footer={[
            <Button
              key='cancel'
              onClick={() => {
                setPaymentConfigModalOpen(false)
                paymentConfigForm.resetFields()
                setEditingPaymentIndex(null)
              }}
            >
              Batal
            </Button>,
            <Button key='submit' type='primary' onClick={() => paymentConfigForm.submit()}>
              {editingPaymentIndex !== null ? 'Update' : 'Tambah'}
            </Button>,
          ]}
        >
          <Form
            form={paymentConfigForm}
            layout='vertical'
            onFinish={handlePaymentConfigSubmit}
            initialValues={{
              status: 1,
              msisdn: 1,
              settlement_config: {
                is_bhpuso: '0',
                servicecharge: '0',
                tax23: '0',
                ppn: null,
                mdr: '0',
                mdr_type: 'percent',
                additionalfee: 0,
                additional_percent: 11,
                additionalfee_type: null,
                payment_type: 'idr',
                share_redision: 10,
                share_partner: 90,
                is_divide_1poin1: '0',
              },
            }}
          >
            <Form.Item
              label='Payment Method'
              name='payment_method_slug'
              rules={[{ required: true, message: 'Payment method wajib dipilih!' }]}
            >
              <Select placeholder='Pilih payment method'>
                {availablePaymentMethods.map((method) => (
                  <Option key={method.id} value={method.slug}>
                    {method.slug.replace(/_/g, ' ').toUpperCase()}
                    {method.type && ` (${method.type})`}
                    {method.description && ` - ${method.description}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.payment_method_slug !== currentValues.payment_method_slug
              }
            >
              {({ getFieldValue }) => {
                const selectedSlug = getFieldValue('payment_method_slug')
                const selectedMethod = availablePaymentMethods.find((method) => method.slug === selectedSlug)

                if (!selectedMethod?.route?.length) return null

                return (
                  <Form.List name='selected_routes'>
                    {(fields, { add, remove }) => (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                          }}
                        >
                          <div>
                            <label style={{ fontWeight: 'bold' }}>Routes & Weight</label>
                            {fields.length > 1 && (
                              <div style={{ fontSize: '12px', color: 'var(--dash-muted)', marginTop: '4px' }}>
                                Total weight harus 100%
                              </div>
                            )}
                          </div>
                          <Button type='dashed' onClick={() => add()} icon={<PlusOutlined />}>
                            Add Route
                          </Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Row key={key} gutter={16} style={{ marginBottom: 8 }}>
                            <Col span={10}>
                              <Form.Item
                                {...restField}
                                name={[name, 'route']}
                                rules={[{ required: true, message: 'Route wajib dipilih!' }]}
                              >
                                <Select placeholder='Pilih route'>
                                  {selectedMethod.route?.map((route) => (
                                    <Option key={route} value={route}>
                                      {route}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={10}>
                              <Form.Item
                                {...restField}
                                name={[name, 'weight']}
                                rules={
                                  fields.length === 1
                                    ? []
                                    : [
                                        { required: true, message: 'Weight wajib diisi!' },
                                        {
                                          validator: (_, value) => {
                                            const numValue = Number(value)
                                            if (isNaN(numValue) || numValue < 1 || numValue > 100) {
                                              return Promise.reject(new Error('Weight harus antara 1-100!'))
                                            }
                                            return Promise.resolve()
                                          },
                                        },
                                      ]
                                }
                              >
                                {fields.length === 1 ? (
                                  <Input value='100' disabled suffix='%' />
                                ) : (
                                  <Input type='number' placeholder='Weight (%)' min={1} max={100} />
                                )}
                              </Form.Item>
                            </Col>
                            <Col span={4}>
                              <Button type='link' danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                            </Col>
                          </Row>
                        ))}
                      </div>
                    )}
                  </Form.List>
                )
              }}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label='Status' name='status'>
                  <Select>
                    <Option value={1}>Aktif</Option>
                    <Option value={0}>Tidak Aktif</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label='MSISDN' name='msisdn'>
                  <Select>
                    <Option value={1}>Ya</Option>
                    <Option value={0}>Tidak</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Card title='Settlement Configuration' style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label='Service Charge' name={['settlement_config', 'servicecharge']}>
                    <Input placeholder='Service charge' disabled value='0' />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Tax 23' name={['settlement_config', 'tax23']}>
                    <Select placeholder='Pilih Tax 23'>
                      <Option value='0'>0</Option>
                      <Option value='1'>1</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='PPN' name={['settlement_config', 'ppn']}>
                    <Input placeholder='PPN' disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label='MDR' name={['settlement_config', 'mdr']}>
                    <Input placeholder='MDR' disabled value='0' />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='MDR Type' name={['settlement_config', 'mdr_type']}>
                    <Select disabled defaultValue={''}>
                      <Option value='percent'>Percent</Option>
                      <Option value='fixed'>Fixed</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Additional Fee' name={['settlement_config', 'additionalfee']}>
                    {/* <Input type='number' placeholder='Additional fee' /> */}
                    <Select>
                      <Option value='1'>Ya</Option>
                      <Option value='0'>Tidak</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label='Include PPN' name={['settlement_config', 'additional_percent']}>
                    <Select placeholder='Include PPN'>
                      <Option value={11}>Ya</Option>
                      <Option value={0}>Tidak</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Additional Fee Type' name={['settlement_config', 'additionalfee_type']}>
                    <Input placeholder='Additional fee type' disabled />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Payment Type' name={['settlement_config', 'payment_type']}>
                    <Input placeholder='Payment type' disabled value='idr' />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label='Share Redision (%)' name={['settlement_config', 'share_redision']}>
                    <Input type='number' placeholder='Share redision' />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Share Partner (%)' name={['settlement_config', 'share_partner']}>
                    <Input type='number' placeholder='Share partner' />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='BHPUSO' name={['settlement_config', 'is_bhpuso']}>
                    <Select>
                      <Option value='1'>Ya</Option>
                      <Option value='0'>Tidak</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label='Divide 1.1' name={['settlement_config', 'is_divide_1poin1']}>
                    <Select disabled value='0'>
                      <Option value='1'>Ya</Option>
                      <Option value='0'>Tidak</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Form>
        </Modal>
      </Modal>
    </>
  )
}

export default AddMerchant
