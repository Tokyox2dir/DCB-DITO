// Badge.tsx
import React from 'react'

export interface BadgeProps {
  text: string
  color: 'success' | 'error' | 'pending' | 'waiting-callback' // Anda dapat menambahkan lebih banyak warna jika diperlukan
}

const Badge: React.FC<BadgeProps> = ({ text, color }) => {
  let backgroundColor
  let textColor = 'white' // Warna teks default

  switch (color) {
    case 'success':
      backgroundColor = '#15803d' // Hijau
      break
    case 'error':
      backgroundColor = '#b91c1c' // Merah
      break
    case 'pending':
      backgroundColor = '#FFC107'
      textColor = '#422006' // Kuning
      break
    case 'waiting-callback':
      backgroundColor = '#6d28d9' // Kuning
      break
    default:
      backgroundColor = '#9E9E9E' // Abu-abu untuk status tidak dikenal
      textColor = 'black' // Ubah warna teks untuk abu-abu
  }

  return (
    <span
      style={{
        backgroundColor,
        color: textColor,
        padding: '0px 15px',
        height: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'inline-block',
        minWidth: '80px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text}
    </span>
  )
}

export default Badge
