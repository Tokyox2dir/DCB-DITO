export type NavLink = { label: string; path: string; match?: string[] }
export type NavItem =
  | { type: 'link'; label: string; path: string; match: string[] }
  | { type: 'dropdown'; label: string; match: string[]; children: NavLink[] }

export function buildNav(role: string): NavItem[] {
  const items: NavItem[] = []

  // MAIN MENU — same order as old sidebar
  if (role !== 'merchant') {
    items.push({ type: 'link', label: 'Dashboard', path: '/', match: ['/'] })
  }

  if (role === 'admin' || role === 'superadmin') {
    items.push({
      type: 'dropdown',
      label: 'Monitoring',
      match: ['/monitoring'],
      children: [
        { label: 'Transaction Charts', path: '/monitoring' },
        { label: 'Time Durations', path: '/monitoring/duration' },
      ],
    })
  }

  items.push({
    type: 'dropdown',
    label: 'Transaction Data',
    match: role === 'merchant' ? ['/merchant-transactions'] : ['/transactions', '/transaction'],
    children: [
      {
        label: 'Redpay Transaction',
        path: role === 'merchant' ? '/merchant-transactions' : '/transactions',
      },
    ],
  })

  if (role !== 'merchant') {
    items.push({ type: 'link', label: 'Summary', path: '/summary/daily', match: ['/summary'] })
    items.push({ type: 'link', label: 'Report', path: '/report', match: ['/report'] })
  } else {
    items.push({ type: 'link', label: 'Report', path: '/report/merchant', match: ['/report/merchant'] })
  }

  if (role === 'business') {
    items.push({
      type: 'dropdown',
      label: 'Report Margin',
      match: ['/report-margin', '/report-margin-payment-method'],
      children: [
        { label: 'Per Merchant', path: '/report-margin' },
        { label: 'Per Payment Method', path: '/report-margin-payment-method' },
      ],
    })
  }

  if (role === 'admin' || role === 'superadmin' || role === 'business') {
    items.push({
      type: 'link',
      label: 'Report Traffic',
      path: '/report-traffic-payment-method',
      match: ['/report-traffic-payment-method'],
    })
  }

  // INTERNAL TOOLS
  if (role === 'admin' || role === 'superadmin' || role === 'business') {
    items.push({
      type: 'dropdown',
      label: 'Redpay',
      match: ['/merchant', '/admin/summary'],
      children: [
        { label: 'Merchant', path: '/merchant' },
        { label: 'Summary', path: '/admin/summary' },
      ],
    })
  } else if (role === 'merchant') {
    items.push({
      type: 'dropdown',
      label: 'Redpay',
      match: ['/merchant-profile'],
      children: [{ label: 'Merchant Profile', path: '/merchant-profile' }],
    })
  }

  return items
}

export function isMatch(pathname: string, match: string[]) {
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}

export function flattenNav(items: NavItem[]): NavLink[] {
  const out: NavLink[] = []
  items.forEach((item) => {
    if (item.type === 'link') out.push({ label: item.label, path: item.path })
    else item.children.forEach((c) => out.push(c))
  })
  return out
}
