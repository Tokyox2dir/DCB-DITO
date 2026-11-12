import React, { useEffect, useMemo, useState } from 'react'
import { Table, DatePicker, Button, message } from 'antd'
import type { TableColumnsType } from 'antd'
import axios from 'axios'
import dayjs, { Dayjs } from 'dayjs'
import { useAuth } from '../provider/AuthProvider'
import formatRupiah from '../utils/FormatRupiah'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'

// using DatePicker with picker='month'
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

type GroupedRow = {
  key: string
  client_uid: string
  merchant_name: string
  total_count: number
  total_amount: number
  total_margin: number
  details: MarginSummaryItem[]
}

const childColumns: TableColumnsType<MarginSummaryItem> = [
  {
    title: 'Payment Method',
    dataIndex: 'payment_method',
    key: 'payment_method',
    width: 200,
    render: (v: string) => <span className='rpt-mono'>{v}</span>,
  },
  {
    title: '#Trx',
    dataIndex: 'count',
    key: 'count',
    width: 100,
    align: 'right',
    render: (v: number) => (v || 0).toLocaleString('id-ID'),
  },
  {
    title: 'Sales EXC',
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    width: 180,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Fee Channel %',
    dataIndex: 'fee',
    key: 'fee',
    align: 'right',
    width: 90,
  },
  {
    title: 'Share Chanel EXC',
    dataIndex: 'share_supplier',
    key: 'share_supplier',
    align: 'right',
    width: 180,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Share Chanel INC',
    dataIndex: 'share_supplier_inc',
    key: 'share_supplier_inc',
    align: 'right',
    width: 180,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Redision Share',
    dataIndex: 'share_redision',
    key: 'share_redision',
    align: 'right',
    width: 180,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Merchant Share',
    dataIndex: 'share_merchant',
    key: 'share_merchant',
    align: 'right',
    width: 180,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Fee Merchant %',
    dataIndex: 'share_redision_percentage',
    key: 'share_redision_percentage',
    align: 'right',
    width: 90,
  },
  {
    title: 'Margin',
    dataIndex: 'margin',
    key: 'margin',
    align: 'right',
    width: 180,
    render: (v: number) => <span className={tone(v)}>{formatRupiah(v || 0)}</span>,
  },
  {
    title: 'Margin %',
    key: 'margin_percentage',
    align: 'right',
    width: 100,
    render: (_, r) => {
      const per = r.total_amount ? (r.margin / r.total_amount) * 100 : 0
      return <span className={tone(per)}>{per.toFixed(2)}%</span>
    },
  },
]

const parentColumns: TableColumnsType<GroupedRow> = [
  {
    title: 'Merchant',
    dataIndex: 'merchant_name',
    key: 'merchant_name',
    width: 420,
    ellipsis: true,
    render: (v: string) => <span className='rpt-strong'>{v}</span>,
  },
  {
    title: '#Trx',
    dataIndex: 'total_count',
    key: 'total_count',
    width: 120,
    align: 'right',
    render: (v: number) => (v || 0).toLocaleString('id-ID'),
  },
  {
    title: 'Total Sales',
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    width: 220,
    render: (v: number) => formatRupiah(v || 0),
  },
  {
    title: 'Total Margin',
    dataIndex: 'total_margin',
    key: 'total_margin',
    align: 'right',
    width: 200,
    render: (v: number) => <span className={tone(v)}>{formatRupiah(v || 0)}</span>,
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

const ReportMargin: React.FC = () => {
  const { apiUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [raw, setRaw] = useState<MarginResponse | null>(null)

  const groupedData: GroupedRow[] = useMemo(() => {
    if (!raw?.summaries?.length) return []
    const map = new Map<string, GroupedRow>()
    for (const item of raw.summaries) {
      // Sembunyikan merchant "Aura Pakar"
      if (item.merchant_name === 'Aura Pakar') continue

      const key = item.client_uid || item.merchant_name
      if (!map.has(key)) {
        map.set(key, {
          key,
          client_uid: item.client_uid,
          merchant_name: item.merchant_name,
          total_count: 0,
          total_amount: 0,
          total_margin: 0,
          details: [],
        })
      }
      const agg = map.get(key)!
      agg.total_count += item.count || 0
      agg.total_amount += item.total_amount || 0
      agg.total_margin += item.margin || 0
      agg.details.push(item)
    }
    return Array.from(map.values())
  }, [raw])

  const totals = useMemo(() => {
    if (!groupedData.length) return { amount: 0, margin: 0, count: 0 }
    return groupedData.reduce(
      (acc, r) => {
        acc.amount += r.total_amount
        acc.margin += r.total_margin
        acc.count += r.total_count
        return acc
      },
      { amount: 0, margin: 0, count: 0 },
    )
  }, [groupedData])

  // Footer figures: all merchants except PPOB Redision (Aura Pakar is already left out of groupedData).
  const footer = useMemo(() => {
    const ppobRedisionData = raw?.summaries?.filter((item) => item.merchant_name === 'PPOB Redision')
    const ppobRedisionCount = ppobRedisionData?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0
    const ppobRedisionAmount = ppobRedisionData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0
    const ppobRedisionMargin = ppobRedisionData?.reduce((acc, curr) => acc + (curr.margin || 0), 0) || 0
    // Use totals.* instead of raw.total_* to exclude hidden merchants (Aura Pakar)
    const count = totals.count - ppobRedisionCount
    const amount = totals.amount - ppobRedisionAmount
    const margin = totals.margin - ppobRedisionMargin
    const per = amount ? (margin / amount) * 100 : 0
    return { count, amount, margin, per }
  }, [raw, totals])

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
    } catch (e) {
      console.error(e)
      message.error('Could not load report margin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasData = groupedData.length > 0

  return (
    <div className='rpt-page'>
      <div className='rpt-head'>
        <div className='rpt-actions'>
          <DatePicker
            picker='month'
            value={month as any}
            onChange={(v) => v && setMonth(v as any)}
            allowClear={false}
            style={{ width: 140 }}
          />
          <Button type='primary' onClick={fetchData} loading={loading}>
            Load
          </Button>
        </div>
      </div>

      <div className='rpt-kpis'>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Transactions</span>
          <span className={`rpt-kpi-value${hasData ? '' : ' is-empty'}`}>
            {hasData ? footer.count.toLocaleString('id-ID') : '—'}
          </span>
          <span className='rpt-kpi-sub'>{groupedData.length} merchants</span>
        </div>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Total sales</span>
          <span className={`rpt-kpi-value${hasData ? '' : ' is-empty'}`}>{hasData ? formatRupiah(footer.amount) : '—'}</span>
          <span className='rpt-kpi-sub'>Excluding PPOB Redision</span>
        </div>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>
            <i className={`rpt-dot ${footer.margin < 0 ? 'negative' : 'positive'}`} />
            Total margin
          </span>
          <span className={`rpt-kpi-value${hasData ? '' : ' is-empty'}`}>{hasData ? formatRupiah(footer.margin) : '—'}</span>
          <span className='rpt-kpi-sub'>{month.format('MMMM YYYY')}</span>
        </div>
        <div className='rpt-kpi'>
          <span className='rpt-kpi-label'>Margin %</span>
          <span className={`rpt-kpi-value${hasData ? '' : ' is-empty'}`}>
            {hasData ? <span className={footer.per < 0 ? 'rpt-neg' : 'rpt-pos'}>{footer.per.toFixed(2)}%</span> : '—'}
          </span>
          <span className='rpt-kpi-sub'>Margin over sales</span>
        </div>
      </div>

      <Table<GroupedRow>
        loading={loading}
        columns={parentColumns}
        dataSource={groupedData}
        pagination={false}
        sticky
        tableLayout='fixed'
        scroll={{ x: true }}
        expandable={{
          expandedRowRender: (record) => (
            <Table<MarginSummaryItem>
              size='small'
              columns={childColumns}
              dataSource={record.details}
              pagination={false}
              rowKey={(r) => `${record.client_uid}-${r.payment_method}`}
              tableLayout='fixed'
              scroll={{ x: true }}
              className='report-margin-table child'
            />
          ),
          expandIcon: ({ expanded, onExpand, record }) => (
            <button
              type='button'
              className={`rpt-expand${expanded ? ' open' : ''}`}
              aria-label={expanded ? 'Hide detail' : 'Show detail'}
              title={expanded ? 'Hide detail' : 'Show detail'}
              onClick={(e) => onExpand(record as any, e as any)}
            >
              <ChevronRightRounded />
            </button>
          ),
          expandRowByClick: false,
        }}
        rowKey={(r) => r.key}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <span className='rpt-total-label'>Total</span>
              </Table.Summary.Cell>

              <Table.Summary.Cell index={1} align='right'>
                <strong>{footer.count.toLocaleString('id-ID')}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align='right'>
                <strong>{formatRupiah(footer.amount)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align='right'>
                <strong>{formatRupiah(footer.margin)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align='right'>
                <strong>
                  <span className={tone(footer.per)}>{footer.per.toFixed(2)}%</span>
                </strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
        className='report-margin-table parent'
      />
    </div>
  )
}

export default ReportMargin
