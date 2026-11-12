// Badge.tsx: a small square-cornered status tag. Colours come from the console tokens
// (see .tx-badge in src/styles/console/transactions.css).
import React from 'react'

export interface BadgeProps {
  text: string
  color: 'success' | 'error' | 'pending' | 'waiting-callback' // Anda dapat menambahkan lebih banyak warna jika diperlukan
}

const Badge: React.FC<BadgeProps> = ({ text, color }) => {
  return <span className={`tx-badge is-${color}`}>{text}</span>
}

export default Badge
