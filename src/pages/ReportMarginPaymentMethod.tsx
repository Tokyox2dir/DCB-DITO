import React, { useEffect, useMemo, useState } from 'react'
import { Table, DatePicker, Button, message } from 'antd'
import type { TableColumnsType } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import formatRupiah from '../utils/FormatRupiah'

const tone = (v: number) => (v < 0 ? 'rpt-num rpt-neg' : 'rpt-num rpt-pos')

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
    render: (value: string) => <span className='rpt-strong'>{value?.replace(/_/g, ' ').toUpperCase()}</span>,
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
      <span className={tone(value)}>{formatRupiah(value || 0)}</span>
    ),
  },
  {
    title: 'Margin %',
    key: 'margin_percentage',
    align: 'right',
    width: 100,
    render: (_, r) => {
      const per = r.total_amount ? (r.total_margin / r.total_amount) * 100 : 0
      return <span className={tone(per)}>{per.toFixed(2)}%</span>
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
      message.error('Could not load report margin per payment method')
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
          <span className='rpt-total-label'>Total</span>
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
              return <span className={tone(per)}>{per.toFixed(2)}%</span>
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
    <section className='rpt-card rpt-card-flush'>
      <div className='rp-card-head'>
        <div>
          <h3>{title}</h3>
          <small>
            {data.length} payment method • Total margin {formatRupiah(totals.margin)} • Total trx{' '}
            {totals.count.toLocaleString('id-ID')}
          </small>
        </div>
      </div>
      <div className='rpt-table'>
        <Table<PaymentMethodAggregate>
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={false}
          rowKey={(record) => record.payment_method}
          summary={() => renderSummary(totals)}
          scroll={{ x: true }}
        />
      </div>
    </section>
  )

  const marginPer = (t: { amount: number; margin: number }) => (t.amount ? (t.margin / t.amount) * 100 : 0)
  const hasData = aggregates.length > 0

  const kpi = (label: string, dot: string, value: React.ReactNode, sub: string) => (
    <div className='rpt-kpi'>
      <span className='rpt-kpi-label'>
        {dot && <i className={`rpt-dot ${dot}`} />}
        {label}
      </span>
      <span className={`rpt-kpi-value${hasData ? '' : ' is-empty'}`}>{hasData ? value : '—'}</span>
      <span className='rpt-kpi-sub'>{sub}</span>
    </div>
  )

  return (
    <div className='rpt-page'>
      <div className='rpt-head'>
        <div className='rpt-actions'>
          <DatePicker
            picker='month'
            value={month as any}
            onChange={(value) => value && setMonth(value as any)}
            allowClear={false}
            style={{ width: 140 }}
          />
          <Button type='primary' onClick={fetchData} loading={loading}>
            Load
          </Button>
        </div>
      </div>
      {/* <Text type='secondary'>Menampilkan total margin seluruh channel, dipisahkan antara Telco dan Non-Telco.</Text> */}

      <div className='rpt-kpis'>
        {kpi('Telco sales', 'data', formatRupiah(telcoTotals.amount), `${telcoTotals.count.toLocaleString('id-ID')} trx`)}
        {kpi(
          'Telco margin',
          telcoTotals.margin < 0 ? 'negative' : 'positive',
          formatRupiah(telcoTotals.margin),
          `${marginPer(telcoTotals).toFixed(2)}% of sales`,
        )}
        {kpi('Non-Telco sales', 'data-2', formatRupiah(nonTelcoTotals.amount), `${nonTelcoTotals.count.toLocaleString('id-ID')} trx`)}
        {kpi(
          'Non-Telco margin',
          nonTelcoTotals.margin < 0 ? 'negative' : 'positive',
          formatRupiah(nonTelcoTotals.margin),
          `${marginPer(nonTelcoTotals).toFixed(2)}% of sales`,
        )}
      </div>

      <div className='report-margin-payment-method rpt-page'>
        {renderCard('Telco Payment Methods', telcoData, telcoTotals)}
        {renderCard('Non-Telco Payment Methods', nonTelcoData, nonTelcoTotals)}
      </div>
    </div>
  )
}

export default ReportMarginPaymentMethod
