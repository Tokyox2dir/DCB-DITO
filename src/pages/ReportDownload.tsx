import React, { useEffect, useState } from 'react'
import { Table, Select, DatePicker, Row, Col, message } from 'antd'
import axios from 'axios'
import type { TableColumnsType } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuth } from '../provider/AuthProvider'

dayjs.extend(utc)
dayjs.extend(timezone)
import { useMerchants } from '../context/MerchantContext'
import { useClient } from '../context/ClientContext'
import { jwtDecode } from 'jwt-decode'

import pdfMake from 'pdfmake/build/pdfmake'
import numberToWords from 'number-to-words'
import timesNewRoman from '../assets/fonts/timesNewRomanWithBoldBase64'

pdfMake.vfs = {
  ...pdfMake.vfs,
  ...timesNewRoman,
}

pdfMake.fonts = {
  TimesNewRoman: {
    normal: 'Times-New-Roman.ttf',
    bold: 'Times-New-Roman-Bold.ttf',
  },
}

const { Option } = Select
const { MonthPicker, RangePicker } = DatePicker

// Clients will be populated from useMerchants context

const paymentMethods = [
  { name: 'Gopay', value: 'gopay' },
  { name: 'Shopeepay', value: 'shopeepay' },
  { name: 'Qris', value: 'qris' },
  { name: 'Dana', value: 'dana' },
  { name: 'Indosat Flexible', value: 'indosat_airtime' },
  { name: 'Telkomsel', value: 'telkomsel_airtime' },
  { name: 'Three', value: 'three_airtime' },
  { name: 'XL', value: 'xl_airtime' },
  { name: 'Smartfren', value: 'smartfren_airtime' },
  { name: 'OVO', value: 'ovo' },
  { name: 'VA BCA', value: 'va_bca' },
  { name: 'VA BRI', value: 'va_bri' },
  { name: 'VA BNI', value: 'va_bni' },
  { name: 'VA Mandiri', value: 'va_mandiri' },
  { name: 'VA Permata', value: 'va_permata' },
  { name: 'VA Sinarmas', value: 'va_sinarmas' },
  { name: 'Credit Card', value: 'visa_master' },
  { name: 'Alfamart', value: 'alfamart_otc' },
  { name: 'Indomaret', value: 'indomaret_otc' },
]

interface ReportSummary {
  merchant_name: string
  payment_method: string
  amount: number
  amount_tax: number
  count: number
  total_amount: number
  share_redision: number
  share_merchant: number
}

interface ReportData {
  summaries: ReportSummary[]
  additional_fee: number
  bhp_uso: number
  tax_23: number
  service_charge: number
  grand_total_redision: number
  total_merchant: number
  grand_total: number
  total_transaction: number
  total_transaction_amount: number
  share_redision: number
  mdr: string
  share_merchant: number
}

const columns: TableColumnsType<ReportSummary> = [
  {
    title: 'Denom',
    dataIndex: 'amount',
    key: 'amount',
    align: 'center',
  },
  {
    title: '#Trx',
    dataIndex: 'count',
    width: 100,
    key: 'count',
    align: 'center',
  },
  {
    title: 'Sales (incl. VAT)',
    dataIndex: 'total_amount',
    key: 'total_amount',
    align: 'right',
    render: (val: number) => `IDR ${val.toLocaleString('id-ID')}`,
  },
  {
    title: `Redision`,
    dataIndex: 'share_redision',
    key: 'share_redision',
    align: 'right',
    render: (val: number) => `IDR ${val.toLocaleString('id-ID')}`,
  },
  {
    title: 'Partner',
    dataIndex: 'share_merchant',
    key: 'share_merchant',
    align: 'right',
    render: (val: number) => `IDR ${val.toLocaleString('id-ID')}`,
  },
]

// Client map will be generated from useMerchants context

const ReportDownload: React.FC = () => {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('monthly')
  const [data, setData] = useState<ReportData>()
  const [loading, setLoading] = useState(false)

  const [filteredClient, setFilteredClient] = useState<string | undefined>()
  const [filteredApp, setFilteredApp] = useState<string | undefined>()
  const [filteredPaymentMethod, setFilteredPaymentMethod] = useState<{ name: string; value: string } | undefined>()
  const [filteredMonth, setFilteredMonth] = useState<Dayjs | null>(dayjs())
  const [filteredDate, setFilteredDate] = useState<Dayjs | null>(dayjs())
  const [filteredDateRange, setFilteredDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [calendarDates, setCalendarDates] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const { apiUrl, token } = useAuth()
  const { merchants, loading: merchantsLoading } = useMerchants()
  const { client, loading: clientLoading } = useClient()

  const decoded: any = token ? jwtDecode(token as string) : null
  const isMerchant = decoded?.role === 'merchant'

  // Generate app map from merchants context (for admin) or client context (for merchant)
  const appMap =
    isMerchant && client?.apps
      ? client.apps.reduce(
          (acc, app) => {
            acc[app.app_name] = {
              app_id: app.appid,
              client_uid: client.u_id,
              merchant_name: client.client_name,
            }
            return acc
          },
          {} as Record<string, { app_id: string; client_uid: string; merchant_name: string }>,
        )
      : merchants.reduce(
          (acc, merchant) => {
            merchant.apps.forEach((app) => {
              acc[app.app_name] = {
                app_id: app.appid,
                client_uid: merchant.u_id,
                merchant_name: merchant.client_name,
              }
            })
            return acc
          },
          {} as Record<string, { app_id: string; client_uid: string; merchant_name: string }>,
        )

  // Generate apps list from merchants (for admin) or client (for merchant)
  const apps =
    isMerchant && client?.apps
      ? client.apps.map((app) => ({
          name: app.app_name,
          merchant_name: client.client_name,
        }))
      : merchants.flatMap((merchant) =>
          merchant.apps.map((app) => ({
            name: app.app_name,
            merchant_name: merchant.client_name,
          })),
        )

  // const [clientUid, setClientUid] = useState<string>('0196ed48-bca0-792a-a9d3-f00c53b0c395')
  // const [appId, setAppId] = useState<string>('SiO8o3xKcdgUHRsydUBTzQ')
  // const [paymentMethod, setPaymentMethod] = useState<string>('')
  // const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
  //   dayjs().startOf('month'),
  //   dayjs().endOf('month'),
  // ])

  const fetchReport = async () => {
    if (!filteredApp || !filteredPaymentMethod) return

    if (reportType === 'monthly' && !filteredMonth) return
    if (reportType === 'daily' && !filteredDate) return
    if (reportType === 'custom' && (!filteredDateRange || !filteredDateRange[0] || !filteredDateRange[1])) return

    const appInfo = appMap[filteredApp]
    if (!appInfo) return

    // Update filteredClient for PDF generation
    setFilteredClient(appInfo.merchant_name)

    let start: Dayjs
    let end: Dayjs

    if (reportType === 'monthly') {
      if (!filteredMonth) return
      start = filteredMonth.startOf('month')
      end = filteredMonth.endOf('month')
    } else if (reportType === 'daily') {
      if (!filteredDate) return
      start = filteredDate.startOf('day')
      end = filteredDate.endOf('day')
    } else {
      if (!filteredDateRange || !filteredDateRange[0] || !filteredDateRange[1]) return
      start = filteredDateRange[0].startOf('day')
      end = filteredDateRange[1].endOf('day')
      if (end.diff(start, 'day') > 31) {
        message.error('Rentang waktu maksimal 1 bulan')
        return
      }
    }

    const start_date = encodeURIComponent(
      dayjs.tz(start.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta').utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
    )
    const end_date = encodeURIComponent(
      dayjs.tz(end.format('YYYY-MM-DD HH:mm:ss'), 'Asia/Jakarta').utc().format('ddd, DD MMM YYYY HH:mm:ss [GMT]'),
    )

    setLoading(true)
    try {
      const res = await axios.get(
        `${apiUrl}/report/merchant?start_date=${start_date}&end_date=${end_date}&payment_method=${filteredPaymentMethod.value}&client_uid=${appInfo.client_uid}&app_id=${appInfo.app_id}`,
      )
      setData(res.data)
    } catch (error) {
      console.error(error)
      message.error('Gagal mengambil data report')
      // Reset data to undefined when error occurs
      setData(undefined)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    // Check if payment method is telco
    const isTelco = [
      'telkomsel_airtime',
      'indosat_airtime',
      'xl_airtime',
      'three_airtime',
      'smartfren_airtime',
    ].includes(filteredPaymentMethod?.value || '')

    let tableBody
    let tableWidths
    if (isTelco) {
      // For telco payment methods - show both EUP INC and EUP EXC
      tableWidths = ['15%', '15%', '10%', '20%', '20%', '20%']
      tableBody = [
        // Header row
        [
          { text: 'EUP INC', style: 'tableHeader', alignment: 'center', valign: 'middle', bold: true, rowSpan: 2 },
          { text: 'EUP EXC', style: 'tableHeader', alignment: 'center', valign: 'middle', bold: true, rowSpan: 2 },
          { text: '#TRX', style: 'tableHeader', alignment: 'center', valign: 'middle', bold: true, rowSpan: 2 },
          {
            text: 'SALES EXC VAT',
            style: 'tableHeader',
            alignment: 'center',
            valign: 'middle',
            bold: true,
            rowSpan: 2,
          },
          {
            text:
              typeof data?.share_redision === 'number' && data.share_redision > 0
                ? `REVENUE SHARING ${data.share_redision} - ${data.share_merchant ?? ''}`
                : `REVENUE SHARING`,
            style: 'tableHeader',
            alignment: 'center',
            bold: true,
            colSpan: 2,
          },
          {}, // kolom ke-6 untuk melengkapi colSpan
        ],
        // Baris 2: Kosongkan 4 kolom pertama, isi kolom 5-6
        [
          {},
          {},
          {},
          {},
          {
            text: data?.share_redision == 0 ? `MDR (${data.mdr} per trx)` : 'REDISION',
            style: 'tableHeader',
            alignment: 'center',
            bold: true,
          },
          { text: 'PARTNER', style: 'tableHeader', alignment: 'center', bold: true },
        ],
        ...(data?.summaries || []).map((item) => [
          { text: `${item.amount_tax.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: `${item.amount.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: item.count.toString(), alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.total_amount.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.share_redision.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.share_merchant.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
        ]),
        [
          {},
          {},
          {},
          { text: `TOTAL`, alignment: 'left', bold: true, fontSize: 9 },
          {
            text: `IDR ${data?.grand_total_redision.toLocaleString('id-ID')}`,
            alignment: 'left',
            bold: true,
            fontSize: 9,
          },
          { text: `IDR ${data?.total_merchant?.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
        ],

        // Add additional fees if available
        ...(data?.bhp_uso
          ? [
              [
                {},
                {},
                {},
                {},
                { text: 'BHP USO', alignment: 'left', bold: true, fontSize: 9 },
                { text: `IDR ${data.bhp_uso.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
              ],
            ]
          : []),
        ...(data?.tax_23
          ? [
              [
                {},
                {},
                {},
                {},
                { text: 'TAX 23', alignment: 'left', bold: true, fontSize: 9 },
                { text: `IDR ${data.tax_23.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
              ],
            ]
          : []),
        ...(data?.additional_fee
          ? [
              [
                {},
                {},
                {},
                {},
                { text: 'ADDITIONAL FEE', alignment: 'left', bold: true, fontSize: 9 },
                {
                  text: `IDR ${data.additional_fee.toLocaleString('id-ID')}`,
                  alignment: 'left',
                  bold: true,
                  fontSize: 9,
                },
              ],
            ]
          : []),
        [
          {},
          {},
          {},
          {},
          { text: 'GRAND TOTAL', alignment: 'left', bold: true, fontSize: 9 },
          { text: `IDR ${data?.grand_total?.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
        ],
      ]
    } else {
      // For non-telco payment methods - hide EUP INC, change EUP EXC to Denom
      tableWidths = ['20%', '15%', '25%', '20%', '20%']
      tableBody = [
        // Header row
        [
          {
            text: 'Denom',
            style: 'tableHeader',
            alignment: 'center',
            valign: 'middle',
            bold: true,
            rowSpan: 2,
            fontSize: 10,
          },
          { text: '#TRX', style: 'tableHeader', alignment: 'center', valign: 'middle', bold: true, rowSpan: 2 },
          {
            text: 'SALES EXC VAT',
            style: 'tableHeader',
            alignment: 'center',
            valign: 'middle',
            bold: true,
            rowSpan: 2,
          },
          {
            text:
              typeof data?.share_redision === 'number' && data.share_redision > 0
                ? `REVENUE SHARING ${data.share_redision} - ${data?.share_merchant ?? ''}`
                : `REVENUE SHARING`,
            style: 'tableHeader',
            alignment: 'center',
            bold: true,
            colSpan: 2,
          },
          {}, // kolom ke-5 untuk melengkapi colSpan
        ],
        // Baris 2: Kosongkan 3 kolom pertama, isi kolom 4-5
        [
          {},
          {},
          {},
          {
            text: data?.share_redision == 0 ? `MDR (${data.mdr} per trx)` : 'REDISION',
            style: 'tableHeader',
            alignment: 'center',
            bold: true,
          },
          { text: 'PARTNER', style: 'tableHeader', alignment: 'center', bold: true },
        ],
        ...(data?.summaries || []).map((item) => [
          { text: `${item.amount.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: item.count.toString(), alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.total_amount.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.share_redision.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
          { text: `IDR ${item.share_merchant.toLocaleString('id-ID')}`, alignment: 'left', fontSize: 9 },
        ]),
        [
          {},
          {},
          { text: `TOTAL`, alignment: 'left', bold: true, fontSize: 9 },
          {
            text: `IDR ${data?.grand_total_redision.toLocaleString('id-ID')}`,
            alignment: 'left',
            bold: true,
            fontSize: 9,
          },
          { text: `IDR ${data?.total_merchant?.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
        ],

        // Add additional fees if available
        ...(data?.bhp_uso
          ? [
              [
                {},
                {},
                {},
                { text: 'BHP USO', alignment: 'left', bold: true, fontSize: 9 },
                { text: `IDR ${data.bhp_uso.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
              ],
            ]
          : []),
        ...(data?.tax_23
          ? [
              [
                {},
                {},
                {},
                { text: 'TAX 23', alignment: 'left', bold: true, fontSize: 9 },
                { text: `IDR ${data.tax_23.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
              ],
            ]
          : []),
        ...(data?.additional_fee
          ? [
              [
                {},
                {},
                {},
                { text: 'ADDITIONAL FEE', alignment: 'left', bold: true, fontSize: 9 },
                {
                  text: `IDR ${data.additional_fee.toLocaleString('id-ID')}`,
                  alignment: 'left',
                  bold: true,
                  fontSize: 9,
                },
              ],
            ]
          : []),
        [
          {},
          {},
          {},
          { text: 'GRAND TOTAL', alignment: 'left', bold: true, fontSize: 9 },
          { text: `IDR ${data?.grand_total?.toLocaleString('id-ID')}`, alignment: 'left', bold: true, fontSize: 9 },
        ],
      ]
    }

    const grandTotal = data?.grand_total

    const totalInWords =
      numberToWords.toWords(data?.grand_total || 0).replace(/\b\w/g, (l: any) => l.toUpperCase()) + ' Rupiah'

    let startDate: Dayjs | undefined
    let endDate: Dayjs | undefined

    if (reportType === 'monthly') {
      startDate = filteredMonth?.startOf('month')
      endDate = filteredMonth?.endOf('month')
    } else if (reportType === 'daily') {
      startDate = filteredDate?.startOf('day')
      endDate = filteredDate?.endOf('day')
    } else {
      startDate = filteredDateRange?.[0]?.startOf('day')
      endDate = filteredDateRange?.[1]?.endOf('day')
    }

    const startDateStr = reportType === 'custom' ? startDate?.format('DD MMMM YYYY') : startDate?.format('DD')
    const endDateStr = endDate?.format('DD MMMM YYYY')

    const reportTitle =
      reportType === 'monthly'
        ? 'MONTHLY SETTLEMENT REPORT'
        : reportType === 'custom'
          ? 'SETTLEMENT REPORT'
          : 'DAILY SETTLEMENT REPORT'
    const periodStr =
      reportType === 'monthly'
        ? `PERIOD: ${startDate?.format('DD')} - ${endDate?.format('DD MMMM YYYY')}`
        : reportType === 'custom'
          ? `PERIOD: ${startDate?.format('DD MMMM YYYY')} - ${endDate?.format('DD MMMM YYYY')}`
          : `DATE: ${startDate?.format('DD MMMM YYYY')}`

    const detailsText =
      reportType === 'monthly'
        ? `Here's the details on the use of channel ${filteredPaymentMethod?.name} period ${startDate?.format('DD')} - ${endDate?.format('DD MMMM YYYY')}:`
        : reportType === 'custom'
          ? `Here's the details on the use of channel ${filteredPaymentMethod?.name} period ${startDate?.format('DD MMMM YYYY')} - ${endDate?.format('DD MMMM YYYY')}:`
          : `Here's the details on the use of channel ${filteredPaymentMethod?.name} on ${startDate?.format('DD MMMM YYYY')}:`

    const docDefinition = {
      content: [
        {
          image:
            'data:image/png;base64,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',
          width: 150,
          alignment: 'right',
          margin: [0, 0, 0, 5],
        },
        { text: reportTitle, style: 'header', alignment: 'center', margin: [0, 0, 0, 4], fontSize: 14 },
        {
          text: `PAYMENT CHANNEL: ${filteredPaymentMethod?.name}`,
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 4],
          fontSize: 14,
        },
        {
          text: 'SERVICE COUNTRY: INDONESIA',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 4],
          fontSize: 14,
        },
        {
          text: `PT. Redision Teknologi Indonesia and ${filteredClient} `,
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 4],
          fontSize: 14,
        },
        {
          text: periodStr,
          style: 'header',
          alignment: 'center',
          fontSize: 14,
          margin: [0, 0, 0, 12],
        },
        {
          text: detailsText,
          fontSize: 12,
          margin: [0, 0, 0, -2],
        },
        { text: '\n' },
        {
          text: ``,
        },
        {
          text: `${filteredApp}`,
          margin: [0, 0, 0, 16],
          fontSize: 14,
          bold: true,
        },
        {
          table: {
            widths: tableWidths,
            fontSize: 9,
            body: tableBody,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
          margin: [0, 0, 0, -4],
        },
        // {
        //   text: `\nTotal Share Merchant: IDR ${grandTotal?.toLocaleString('id-ID')}`,
        //   // bold: true,
        //   margin: [0, 10, 0, 0],
        // },
        // {
        //   text: `Total Share Redision: IDR ${data?.grand_total_redision?.toLocaleString('id-ID')}`,
        //   // bold: true,
        //   margin: [0, 10, 0, 0],
        // },
        // {
        //   text: `Total Transaction Amount: IDR ${data?.total_transaction_amount?.toLocaleString('id-ID')}`,
        //   bold: true,
        //   margin: [0, 10, 0, 0],
        // },
        // {
        //   text: `Total Transaction : ${data?.total_transaction}`,
        //   bold: true,
        //   margin: [0, 10, 0, 0],
        // },
        {
          text: [
            '\n\nBased on the above data it was agreed that the bill are from period ',
            `${startDateStr}-${endDateStr}`,
            ' at Rp ',
            `${grandTotal?.toLocaleString('id-ID')},- `,
            { text: `(${totalInWords})`, bold: true },
            ' as the basis for billing. This settlement report is drawn as the basis of the issuance and payment of the bill pursuant to the prevailing Agreement.',
          ],
          margin: [0, 0, 0, 0],
          fontSize: 12,
        },
        { text: '\n\n' },
        {
          text: '',
          pageBreak: 'after',
        },
        {
          stack: [
            {
              text: `\nJakarta, ${dayjs().format('MMMM DD YYYY')}`,
              bold: true,
              margin: [0, 20, 0, 10],
            },
            {
              columns: [
                { text: 'Prepared by', bold: true },
                { text: 'Acknowledge by', bold: true },
                { text: 'Approved by', bold: true },
              ],
              margin: [0, 0, 0, 80],
            },
            {
              columns: [{ text: 'Business Development' }, { text: 'Finance' }, { text: 'Director' }],
              margin: [0, 0, 0, 0],
            },
          ],
          unbreakable: true,
        },
      ],
      styles: {
        header: {
          fontSize: 10,
          bold: true,
          margin: [0, 0, 0, 10],
          // font: 'TimesNewRoman',
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: 'black',
        },
      },
      defaultStyle: {
        font: 'TimesNewRoman',
      },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
    }

    pdfMake
      .createPdf(docDefinition)
      .download(`Report-${reportType}-${filteredApp}-${filteredPaymentMethod?.name}-${dayjs().format('YYYYMMDD')}.pdf`)
  }

  useEffect(() => {
    // Clear data when filters change
    setData(undefined)
  }, [filteredApp, filteredPaymentMethod, filteredMonth, filteredDate, filteredDateRange, reportType])

  return (
    <div className='sf-page'>
      <h2 className='sf-page-title'>Download Report</h2>

      {/* Filter Controls */}
      <div className='sf-panel'>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} className='flex gap-6'>
        <Col className='flex gap-4'>
          <label htmlFor='type-select' className='sf-field-label'>
            Type :
          </label>
          <Select id='type-select' value={reportType} style={{ width: 150 }} onChange={(val) => setReportType(val)}>
            <Option value='daily'>Daily</Option>
            <Option value='monthly'>Monthly</Option>
            <Option value='custom'>Custom</Option>
          </Select>
        </Col>
        <Col className='flex gap-4'>
          <label htmlFor='app-select' className='sf-field-label'>
            App :
          </label>
          <Select
            id='app-select'
            allowClear
            showSearch
            filterOption={(input, option: any) => {
              const children = option?.children
              const text = Array.isArray(children) ? children.join('') : children
              return String(text).toLowerCase().includes(input.toLowerCase())
            }}
            placeholder={merchantsLoading || clientLoading ? 'Loading...' : 'Select App'}
            style={{ width: 300 }}
            onChange={(val) => setFilteredApp(val)}
            loading={merchantsLoading || clientLoading}
            disabled={merchantsLoading || clientLoading}
          >
            {apps.map((app) => (
              <Option key={app.name} value={app.name}>
                {app.name} ({app.merchant_name})
              </Option>
            ))}
          </Select>
        </Col>
        <Col className='flex gap-4'>
          <label htmlFor='client-select' className='sf-field-label'>
            Payment Method :{' '}
          </label>
          <Select
            id='payment-select'
            allowClear
            showSearch
            filterOption={(input, option: any) => {
              const children = option?.children
              const text = Array.isArray(children) ? children.join('') : children
              return String(text).toLowerCase().includes(input.toLowerCase())
            }}
            placeholder='Select Payment Method'
            style={{ width: 180 }}
            onChange={(val) => {
              const selected = paymentMethods.find((m) => m.value === val)
              if (selected) setFilteredPaymentMethod(selected)
              console.log(filteredPaymentMethod)
              // else setFilteredPaymentMethod(undefined)
            }}
          >
            {paymentMethods.map((m) => (
              <Option key={m.value} value={m.value}>
                {m.name}
              </Option>
            ))}
          </Select>
        </Col>
        <Col className='flex gap-4'>
          <label htmlFor='client-select' className='sf-field-label'>
            {reportType === 'monthly' ? 'Month :' : reportType === 'custom' ? 'Date Range :' : 'Date :'}
          </label>
          {reportType === 'monthly' ? (
            <MonthPicker
              placeholder='Select Month'
              style={{ width: 160 }}
              onChange={(val) => setFilteredMonth(val)}
              value={filteredMonth}
            />
          ) : reportType === 'custom' ? (
            <RangePicker
              style={{ width: 260 }}
              value={filteredDateRange as any}
              onChange={(val) => setFilteredDateRange(val as any)}
              onCalendarChange={(val) => setCalendarDates(val as any)}
              disabledDate={(current) => {
                if (!calendarDates) {
                  return false
                }
                const tooLate = calendarDates[0] && current.diff(calendarDates[0], 'days') > 31
                const tooEarly = calendarDates[1] && calendarDates[1].diff(current, 'days') > 31
                return !!tooEarly || !!tooLate
              }}
              onOpenChange={(open) => {
                if (open) {
                  setCalendarDates(null)
                } else {
                  setCalendarDates(null)
                }
              }}
            />
          ) : (
            <DatePicker
              placeholder='Select Date'
              style={{ width: 160 }}
              onChange={(val) => setFilteredDate(val)}
              value={filteredDate}
            />
          )}
        </Col>
      </Row>

      <div className='flex gap-3' style={{ marginTop: 16 }}>
        <button
          type='button'
          onClick={fetchReport}
          className='sf-btn sf-btn-primary'
          disabled={!filteredApp || !filteredPaymentMethod || loading}
        >
          {loading ? 'Loading...' : 'Load Data'}
        </button>

        <button
          type='button'
          onClick={exportToPDF}
          className='sf-btn sf-btn-ghost'
          disabled={!data || !data.summaries || data.summaries.length === 0}
        >
          Export PDF
        </button>
      </div>
      </div>
      <div className='sf-panel'>
        <Table
          bordered
          loading={loading}
          columns={columns}
          rowKey={(record) => `${record.amount}-${record.payment_method}`}
          dataSource={data?.summaries}
          pagination={false}
          scroll={{ x: 1000 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} align='center'>
                <strong>Total</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align='center'>
                <strong>{data?.total_transaction} </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align='right' />
              <Table.Summary.Cell index={1} align='right'>
                <strong> {data?.grand_total_redision.toLocaleString('id-ID')} </strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align='right'>
                <strong> {data?.total_merchant.toLocaleString('id-ID')} </strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </div>
    </div>
  )
}

export default ReportDownload
