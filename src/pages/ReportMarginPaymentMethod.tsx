import React, { useEffect, useMemo, useState } from 'react'
import { Table, DatePicker, Row, Col, Button, Typography as AntTypography, Card, message } from 'antd'
import type { TableColumnsType } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import formatRupiah from '../utils/FormatRupiah'

const { Title, Text } = AntTypography

interface MarginSummaryItem {
  merchant_name: string
  payment_method: string
  client_uid: string
  route: string
  fee: number
  count: number
  total_amount: number
  total_amount_tax: number
  share_redision: number
  share_merchant: number
  margin: number
  share_supplier: number
  share_supplier_inc: number
  bhp_uso_supplier: number
  pph_supplier: number
  share_supplier_nett: number
  share_merchant_percentage: number
  share_redision_percentage: number
}

interface MarginResponse {
  calculation_formula: string
  share_redision_formula: string
  summaries: MarginSummaryItem[]
  total_amount?: number
  total_margin?: number
}

type PaymentMethodAggregate = {
  payment_method: string
  total_count: number
  total_amount: number
  total_margin: number
}

const telcoPaymentMethods = [
  'telkomsel_airtime',
  'indosat_airtime',
  'xl_airtime',
  'three_airtime',
  'smartfren_airtime',
  'axis_airtime',
  'bolt_airtime',
]

const telcoSet = new Set(telcoPaymentMethods)

const columns: TableColumnsType<PaymentMethodAggregate> = [
  {
    title: 'Payment Method',
    dataIndex: 'payment_method',
    key: 'payment_method',
    render: (value: string) => value?.replace(/_/g, ' ').toUpperCase(),
  },
  {
    title: '#Trx',
    dataIndex: 'total_count',
    key: 'total_count',
    align: 'right',
    render: (value: number) => value.toLocaleString('id-ID'),
    width: 140,
  },
  {
    title: 'Total Sales',
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    width: 200,
    render: (value: number) => formatRupiah(value || 0),
  },
  {
    title: 'Total Margin',
    dataIndex: 'total_margin',
    key: 'total_margin',
    align: 'right',
    width: 200,
    render: (value: number) => (
      <span className={value < 0 ? 'text-red-600' : 'text-emerald-700'}>{formatRupiah(value || 0)}</span>
    ),
  },
  {
    title: 'Margin %',
    key: 'margin_percentage',
    align: 'right',
    width: 100,
    render: (_, r) => {
      const per = r.total_amount ? (r.total_margin / r.total_amount) * 100 : 0
      return <span className={per < 0 ? 'text-red-600' : 'text-emerald-700'}>{per.toFixed(2)}%</span>
    },
  },
]

const ReportMarginPaymentMethod: React.FC = () => {
  const { apiUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [raw, setRaw] = useState<MarginResponse | null>(null)

  const fetchData = async () => {
    if (!month) return
    const start = month.startOf('month')
    const end = month.endOf('month')
    const start_date = encodeURIComponent(start.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'))
    const end_date = encodeURIComponent(end.utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'))
    setLoading(true)
    try {
      const res = await axios.get(`${apiUrl}/report/merchant/margin?start_date=${start_date}&end_date=${end_date}`)
      setRaw(res.data)
    } catch (error) {
      console.error(error)
      message.error('Gagal mengambil data report margin per payment method')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aggregates = useMemo(() => {
    if (!raw?.summaries?.length) return []
    const map = new Map<string, PaymentMethodAggregate>()

    for (const item of raw.summaries) {
      const key = item.payment_method || 'UNKNOWN'
      // Exclude 'Aura Pakar' and 'PPOB Redision' to match ReportMargin logic
      if (item.merchant_name === 'Aura Pakar' || item.merchant_name === 'PPOB Redision') continue

      if (!map.has(key)) {
        map.set(key, {
          payment_method: key,
          total_amount: 0,
          total_count: 0,
          total_margin: 0,
        })
      }

      const agg = map.get(key)!
      agg.total_amount += item.total_amount || 0
      agg.total_count += item.count || 0
      agg.total_margin += item.margin || 0
    }

    return Array.from(map.values()).sort((a, b) => b.total_margin - a.total_margin)
  }, [raw])

  const telcoData = useMemo(() => aggregates.filter((item) => telcoSet.has(item.payment_method)), [aggregates])
  const nonTelcoData = useMemo(() => aggregates.filter((item) => !telcoSet.has(item.payment_method)), [aggregates])

  const summarize = (data: PaymentMethodAggregate[]) =>
    data.reduce(
      (acc, item) => {
        acc.count += item.total_count
        acc.amount += item.total_amount
        acc.margin += item.total_margin
        return acc
      },
      { count: 0, amount: 0, margin: 0 },
    )

  const telcoTotals = useMemo(() => summarize(telcoData), [telcoData])
  const nonTelcoTotals = useMemo(() => summarize(nonTelcoData), [nonTelcoData])

  const renderSummary = (totals: { count: number; amount: number; margin: number }) => (
    <Table.Summary fixed>
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <strong>Total</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} align='right'>
          <strong>{totals.count.toLocaleString('id-ID')}</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2} align='right'>
          <strong>{formatRupiah(totals.amount)}</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3} align='right'>
          <strong>{formatRupiah(totals.margin)}</strong>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4} align='right'>
          <strong>
            {(() => {
              const per = totals.amount ? (totals.margin / totals.amount) * 100 : 0
              return <span className={per < 0 ? 'text-red-600' : 'text-emerald-700'}>{per.toFixed(2)}%</span>
            })()}
          </strong>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )

  const renderCard = (
    title: string,
    data: PaymentMethodAggregate[],
    totals: { count: number; amount: number; margin: number },
  ) => (
    <Card bordered={false} className='shadow-sm'>
      <div className='flex flex-col gap-2 mb-4'>
        <Title level={5} style={{ marginBottom: 0 }}>
          {title}
        </Title>
        <Text type='secondary'>
          {data.length} payment method • Total margin {formatRupiah(totals.margin)} • Total trx{' '}
          {totals.count.toLocaleString('id-ID')}
        </Text>
      </div>
      <Table<PaymentMethodAggregate>
        bordered
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
        rowKey={(record) => record.payment_method}
        summary={() => renderSummary(totals)}
        scroll={{ x: true }}
      />
    </Card>
  )

  return (
    <div className='flex flex-col p-6 gap-4'>
      <style>{`
        .report-margin-payment-method .ant-table-thead > tr > th {
          background-color: var(--dash-surface-2);
          color: var(--dash-text);
          font-weight: 600;
        }
        .report-margin-payment-method .ant-table-tbody > tr > td {
          font-size: 14px;
        }
        /* Thick borders override */
        .report-margin-payment-method .ant-table-container {
          border-inline-start: 1.5px solid var(--dash-border) !important;
          border-top: 1.5px solid var(--dash-border) !important;
        }
        .report-margin-payment-method .ant-table-thead > tr > th,
        .report-margin-payment-method .ant-table-tbody > tr > td,
        .report-margin-payment-method .ant-table-summary > tr > td {
          border-bottom: 1.5px solid var(--dash-border) !important;
          border-inline-end: 1.5px solid var(--dash-border) !important;
        }
      `}</style>
      <Title level={4} style={{ marginBottom: 4 }}>
        Report Margin per Payment Method
      </Title>
      {/* <Text type='secondary'>Menampilkan total margin seluruh channel, dipisahkan antara Telco dan Non-Telco.</Text> */}

      <Row gutter={12}>
        <Col>
          <DatePicker
            picker='month'
            value={month as any}
            onChange={(value) => value && setMonth(value as any)}
            allowClear={false}
          />
        </Col>
        <Col>
          <Button type='primary' onClick={fetchData} loading={loading}>
            Load
          </Button>
        </Col>
      </Row>

      <div className='report-margin-payment-method flex flex-col gap-6'>
        {renderCard('Telco Payment Methods', telcoData, telcoTotals)}
        {renderCard('Non-Telco Payment Methods', nonTelcoData, nonTelcoTotals)}
      </div>
    </div>
  )
}

export default ReportMarginPaymentMethod
