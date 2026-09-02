import { useEffect, useMemo, useState } from 'react'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import CellTowerOutlinedIcon from '@mui/icons-material/CellTowerOutlined'
import axios from 'axios'
import dayjs from 'dayjs'
import { jwtDecode } from 'jwt-decode'
import RankingCard, { RankingItem } from '../components/RankingCard'
import { useAuth } from '../provider/AuthProvider'

interface ApiSeriesPoint {
  timestamp: string
  success: number
  pending: number
  failed: number
  total: number
}

interface ApiSeries {
  merchant_name: string
  payment_method: string
  data: ApiSeriesPoint[]
}

function topN(map: Map<string, number>, n = 5): RankingItem[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

export default function Dashboard() {
  const { token, apiUrl } = useAuth()
  const [loading, setLoading] = useState(false)
  const [merchants, setMerchants] = useState<RankingItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<RankingItem[]>([])
  const [successLeaders, setSuccessLeaders] = useState<RankingItem[]>([])
  const [failedLeaders, setFailedLeaders] = useState<RankingItem[]>([])

  const username = useMemo(() => {
    if (!token) return 'user'
    try {
      return (jwtDecode(token) as any).username || 'user'
    } catch {
      return 'user'
    }
  }, [token])

  const periodLabel = dayjs().format('MMMM YYYY')

  useEffect(() => {
    if (!token || !apiUrl) return

    const load = async () => {
      try {
        setLoading(true)
        const end = dayjs().format('YYYY-MM-DDTHH:mm:ssZ')
        const start = dayjs().subtract(8, 'hour').format('YYYY-MM-DDTHH:mm:ssZ')

        const [merchantsRes, trafficRes] = await Promise.allSettled([
          axios.get(`${apiUrl}/admin/merchants`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${apiUrl}/traffic/monitoring`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params: { start, end },
          }),
        ])

        if (merchantsRes.status === 'fulfilled') {
          const list = merchantsRes.value.data?.data || []
          const ranked = [...list]
            .map((m: any) => ({
              label: m.client_name || m.merchant_name || m.name || m.uid || 'Merchant',
              value: Array.isArray(m.applications)
                ? m.applications.length
                : typeof m.status === 'number'
                  ? m.status
                  : 1,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
          setMerchants(ranked)
        }

        if (trafficRes.status === 'fulfilled') {
          const apiData: ApiSeries[] = trafficRes.value.data?.data || []
          const byMerchant = new Map<string, number>()
          const byMethod = new Map<string, number>()
          const bySuccess = new Map<string, number>()
          const byFailed = new Map<string, number>()

          apiData.forEach((series) => {
            let total = 0
            let success = 0
            let failed = 0
            series.data.forEach((p) => {
              total += p.total ?? p.success + p.pending + p.failed
              success += p.success
              failed += p.failed
            })
            byMerchant.set(series.merchant_name, (byMerchant.get(series.merchant_name) || 0) + total)
            byMethod.set(series.payment_method, (byMethod.get(series.payment_method) || 0) + total)
            bySuccess.set(series.merchant_name, (bySuccess.get(series.merchant_name) || 0) + success)
            byFailed.set(series.merchant_name, (byFailed.get(series.merchant_name) || 0) + failed)
          })

          const trafficMerchants = topN(byMerchant)
          if (trafficMerchants.length) setMerchants(trafficMerchants)
          setPaymentMethods(topN(byMethod))
          setSuccessLeaders(topN(bySuccess))
          setFailedLeaders(topN(byFailed))
        }
      } catch (e) {
        console.error('Dashboard ranking fetch error:', e)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [apiUrl, token])

  return (
    <section className='dash-page'>
      <header className='dash-header'>
        <div>
          <h1 className='dash-title'>Dashboard</h1>
          <p className='dash-subtitle'>
            Top traffic overview ({periodLabel}) for {username}.
          </p>
        </div>
        <div className='dash-live'>Live overview</div>
      </header>

      <section className='dash-rank-grid'>
        <RankingCard
          title='Top 5 Merchants'
          subtitle='By transaction volume'
          variant='client'
          icon={<PeopleAltOutlinedIcon sx={{ fontSize: 18 }} />}
          items={merchants}
          loading={loading && merchants.length === 0}
        />
        <RankingCard
          title='Top 5 Payment Methods'
          subtitle='By usage volume'
          variant='supplier'
          icon={<DnsOutlinedIcon sx={{ fontSize: 18 }} />}
          items={paymentMethods}
          loading={loading && paymentMethods.length === 0}
        />
        <RankingCard
          title='Top 5 Success'
          subtitle='By success count'
          variant='sender'
          icon={<SendOutlinedIcon sx={{ fontSize: 18 }} />}
          items={successLeaders}
          loading={loading && successLeaders.length === 0}
        />
        <RankingCard
          title='Top 5 Failed'
          subtitle='By failed count'
          variant='operator'
          icon={<CellTowerOutlinedIcon sx={{ fontSize: 18 }} />}
          items={failedLeaders}
          loading={loading && failedLeaders.length === 0}
        />
      </section>
    </section>
  )
}
