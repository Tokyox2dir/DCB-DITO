import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuIcon from '@mui/icons-material/Menu'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useColorScheme } from '@mui/material/styles'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../provider/AuthProvider'
import ApiSwitcher from './ApiSwitcher'

type NavLink = { label: string; path: string; match?: string[] }
type NavItem =
  | { type: 'link'; label: string; path: string; match: string[] }
  | { type: 'dropdown'; label: string; match: string[]; children: NavLink[] }

function buildNav(role: string): NavItem[] {
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

function isMatch(pathname: string, match: string[]) {
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}

function flattenNav(items: NavItem[]): NavLink[] {
  const out: NavLink[] = []
  items.forEach((item) => {
    if (item.type === 'link') out.push({ label: item.label, path: item.path })
    else item.children.forEach((c) => out.push(c))
  })
  return out
}

export default function TopNavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, setToken } = useAuth()
  const { mode, systemMode, setMode } = useColorScheme()
  const decoded: any = token ? jwtDecode(token) : {}
  const role = decoded.role || ''
  const username = decoded.username || 'user'
  const initial = (username as string).charAt(0).toUpperCase() || 'R'

  const navItems = useMemo(() => buildNav(role), [role])
  const flatLinks = useMemo(() => flattenNav(navItems), [navItems])

  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null)
  const [dropdownAnchor, setDropdownAnchor] = useState<null | HTMLElement>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const resolvedMode = (mode === 'system' ? systemMode : mode) || 'dark'
  const isDark = resolvedMode !== 'light'


  const handleLogout = () => {
    setUserAnchor(null)
    setToken(null)
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  const handleToggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setMode?.(next)
  }

  const activeDropdown = navItems.find((n) => n.type === 'dropdown' && n.label === openDropdown) as
    | Extract<NavItem, { type: 'dropdown' }>
    | undefined

  return (
    <>
      <div className='aura-v2-topbar-sticky'>
        <header className='aura-v2-topbar'>
        <Link className='aura-v2-brand' to={role === 'merchant' ? '/merchant-dashboard' : '/'}>
          <img className='aura-v2-logo' src='/logo.png' alt='Redpay logo' height={36} />
          <span>
            <strong>Redpay Panel</strong>
            <span>Payment Management</span>
          </span>
        </Link>

        <button type='button' className='aura-v2-burger' aria-label='Open menu' onClick={() => setMobileOpen(true)}>
          <MenuIcon fontSize='small' />
        </button>

        <nav className='aura-v2-tabs' aria-label='Primary navigation'>
          {navItems.map((item) => {
            if (item.type === 'link') {
              const active = isMatch(location.pathname, item.match)
              return (
                <Link key={item.label} className={`aura-v2-tab${active ? ' active' : ''}`} to={item.path} aria-current={active ? 'page' : undefined}>
                  <i /> {item.label}
                </Link>
              )
            }

            const active = isMatch(location.pathname, item.match)
            return (
              <button
                key={item.label}
                type='button'
                className={`aura-v2-tab${active || openDropdown === item.label ? ' active' : ''}`}
                aria-haspopup='menu'
                aria-expanded={openDropdown === item.label}
                onClick={(e) => {
                  setDropdownAnchor(e.currentTarget)
                  setOpenDropdown(item.label)
                }}
              >
                <i /> {item.label}
                <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.25 }} />
              </button>
            )
          })}
        </nav>

        <div className='aura-v2-actions'>
          <div style={{ display: 'flex', alignItems: 'center' }} className='aura-v2-api'>
            <ApiSwitcher />
          </div>
          <button
            type='button'
            className='aura-v2-theme'
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={handleToggleTheme}
          >
            {isDark ? <LightModeOutlinedIcon sx={{ fontSize: 16 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />}
          </button>
          <button type='button' className='aura-v2-logout' title='Logout' aria-label='Logout' onClick={handleLogout}>
            <LogoutRoundedIcon sx={{ fontSize: 16 }} />
          </button>
          <button type='button' className='aura-v2-user' onClick={(e) => setUserAnchor(e.currentTarget)}>
            <span>{username}</span>
            <span className='aura-v2-avatar'>{initial}</span>
          </button>
        </div>
        </header>
      </div>

      <Menu
        anchorEl={dropdownAnchor}
        open={Boolean(dropdownAnchor) && Boolean(activeDropdown)}
        onClose={() => {
          setDropdownAnchor(null)
          setOpenDropdown(null)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{ zIndex: 2100 }}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 200,
            bgcolor: 'var(--dash-surface)',
            border: `1px solid ${isDark ? '#363b46' : '#e0e3e9'}`,
            backgroundImage: 'none',
            color: 'var(--dash-text)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.28)',
          },
        }}
      >
        {activeDropdown?.children.map((child) => (
          <MenuItem
            key={child.path + child.label}
            selected={location.pathname === child.path || location.pathname.startsWith(`${child.path}/`)}
            onClick={() => {
              setDropdownAnchor(null)
              setOpenDropdown(null)
              navigate(child.path)
            }}
            sx={{ fontSize: 13 }}
          >
            {child.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ zIndex: 2100 }}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 180,
            bgcolor: 'var(--dash-surface)',
            border: `1px solid ${isDark ? '#363b46' : '#e0e3e9'}`,
            backgroundImage: 'none',
            color: 'var(--dash-text)',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.28)',
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{username}</div>
          <div style={{ fontSize: 11, color: 'var(--dash-muted)', textTransform: 'capitalize' }}>
            {role}
          </div>
        </Box>
        <Divider sx={{ borderColor: isDark ? '#363b46' : '#e0e3e9' }} />
        <MenuItem
          onClick={() => {
            setUserAnchor(null)
            handleLogout()
          }}
          sx={{ fontSize: 13, gap: 1 }}
        >
          <LogoutRoundedIcon fontSize='small' />
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        anchor='left'
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: 'var(--dash-surface)',
            backgroundImage: 'none',
            color: 'var(--dash-text)',
            borderRight: `1px solid ${isDark ? '#363b46' : '#e0e3e9'}`,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>Redpay Panel</div>
          <div style={{ color: 'var(--dash-muted)', fontSize: 12, marginBottom: 16 }}>
            Payment Management
          </div>
          <List dense>
            {flatLinks.map((link) => {
              const active = location.pathname === link.path
              return (
                <ListItemButton
                  key={link.path + link.label}
                  onClick={() => {
                    setMobileOpen(false)
                    navigate(link.path)
                  }}
                  sx={{
                    borderRadius: 999,
                    mb: 0.5,
                    bgcolor: active ? (isDark ? '#f1f5f9' : '#20242c') : 'transparent',
                    color: active ? (isDark ? '#20242c' : '#ffffff') : 'inherit',
                  }}
                >
                  <ListItemText
                    primary={link.label}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 700 : 500 }}
                  />
                </ListItemButton>
              )
            })}
          </List>
        </Box>
      </Drawer>
    </>
  )
}
