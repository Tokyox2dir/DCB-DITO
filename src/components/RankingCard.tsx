import { ReactNode } from 'react'

export interface RankingItem {
  label: string
  value: number
}

type RankVariant = 'client' | 'supplier' | 'sender' | 'operator'

interface RankingCardProps {
  title: string
  subtitle: string
  variant: RankVariant
  icon: ReactNode
  items: RankingItem[]
  loading?: boolean
}

function formatValue(value: number) {
  return new Intl.NumberFormat('id-ID').format(value)
}

export default function RankingCard({ title, subtitle, variant, icon, items, loading }: RankingCardProps) {
  const max = Math.max(...items.map((i) => i.value), 0)
  const rows = items.slice(0, 5)
  const iconClass = variant === 'client' ? 'dash-rank-icon' : `dash-rank-icon ${variant}`
  const barClass = variant === 'client' ? 'dash-rank-bar' : `dash-rank-bar ${variant}`

  return (
    <article className={`dash-rank-card dash-rank-${variant}`} aria-busy={loading}>
      <div className='dash-rank-head'>
        <span className={iconClass}>{icon}</span>
        <div>
          <h2>{title}</h2>
          <small>{subtitle}</small>
        </div>
      </div>
      <div className='dash-rank-columns' aria-hidden='true'><span>Ranking</span><span>Transactions</span></div>
      <ol className='dash-rank-list'>
        {loading && rows.length === 0 && <li className='dash-rank-empty' role='status'>Loading rankings…</li>}
        {!loading && rows.length === 0 && <li className='dash-rank-empty'>No traffic data.</li>}
        {rows.map((row, index) => {
          const pct = max > 0 ? Math.round((row.value * 100) / max) : 0
          return (
            <li key={`${row.label}-${index}`}>
              <span className='dash-rank-pos'>{index + 1}</span>
              <div className='dash-rank-body'>
                <div className='dash-rank-meta'>
                  <strong title={row.label}>{row.label}</strong>
                  <span>{formatValue(row.value)}</span>
                </div>
                <div className={barClass} aria-hidden='true'>
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </article>
  )
}
