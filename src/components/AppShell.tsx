import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import Tooltip from '@mui/material/Tooltip'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined'
import TrafficOutlinedIcon from '@mui/icons-material/TrafficOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import { useColorScheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../provider/AuthProvider'
import ApiSwitcher from './ApiSwitcher'
import PageSearch from './PageSearch'
import { buildNav, flattenNav, isMatch } from './navConfig'

const NAV_ICONS: Record<string, ReactNode> = {
  Dashboard: <SpaceDashboardOutlinedIcon />,
  Monitoring: <MonitorHeartOutlinedIcon />,
  'Transaction Data': <ReceiptLongOutlinedIcon />,
  Summary: <InsightsOutlinedIcon />,
  Report: <DescriptionOutlinedIcon />,
  'Report Margin': <PercentOutlinedIcon />,
  'Report Traffic': <TrafficOutlinedIcon />,
  Redpay: <StorefrontOutlinedIcon />,
}

const menuPaperSx = {
  mt: 0.75,
  minWidth: 220,
  borderRadius: '16px',
  bgcolor: 'var(--surface)',
  border: '1px solid var(--border)',
  backgroundImage: 'none',
  color: 'var(--text)',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.14)',
}

function isOn(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
}

export default function AppShell() {
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

  // Longest matching link names the current page; its group is shown as context.
  const pageTitle = useMemo(() => {
    const matches = flatLinks.filter((l) => isOn(location.pathname, l.path))
    matches.sort((a, b) => b.path.length - a.path.length)
    const group = navItems.find((n) => isMatch(location.pathname, n.match))
    const page = matches[0]?.label ?? group?.label ?? 'Dashboard'
    return { page, group: group?.type === 'dropdown' ? group.label : null }
  }, [flatLinks, navItems, location.pathname])

  // Floating icon capsule: on the left edge on desktop, docked to the bottom on phones (submenus open upwards there).
  const docked = useMediaQuery('(max-width: 900px)')
  const [groupAnchor, setGroupAnchor] = useState<null | HTMLElement>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [userAnchor, setUserAnchor] = useState<null | HTMLElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const isDark = ((mode === 'system' ? systemMode : mode) || 'dark') !== 'light'

  // Desktop: the capsule hides past the left edge and slides in when the pointer nears that edge
  // (or a key moves focus into it); it slides away shortly after the pointer leaves.
  const [railOpen, setRailOpen] = useState(false)
  const hideTimer = useRef<number>()
  const railRef = useRef<HTMLElement>(null)
  const showRail = () => {
    window.clearTimeout(hideTimer.current)
    setRailOpen(true)
  }
  // Stays out while the pointer is still over it or a key has put focus in it; otherwise slides away.
  const hideRail = () => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      const rail = railRef.current
      if (rail && (rail.matches(':hover') || rail.querySelector(':focus-visible'))) return
      setRailOpen(false)
    }, 450)
  }
  // Only keyboard focus opens it. Focus handed back after a submenu closes, or on returning to the tab,
  // is not focus-visible after a click, so it no longer pins the capsule open.
  const onRailFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (e.target.matches(':focus-visible')) showRail()
  }
  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  const closeGroup = () => {
    setGroupAnchor(null)
    setOpenGroup(null)
    hideRail()
  }
  const activeGroup = navItems.find((n) => n.type === 'dropdown' && n.label === openGroup)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The new theme spreads out as a circle from the toggle. Browsers without View Transitions,
  // or with reduced motion on, just switch.
  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = isDark ? 'light' : 'dark'
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } }
    if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMode?.(next)
      return
    }
    // Centre of the button, so keyboard activation (no pointer position) starts from the same spot.
    const box = e.currentTarget.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    // The circle carries the change, so the colour fades on every element are switched off meanwhile.
    const root = document.documentElement
    root.classList.add('theme-reveal')
    const transition = doc.startViewTransition(() => flushSync(() => setMode?.(next)))
    transition.finished.finally(() => root.classList.remove('theme-reveal')).catch(() => {})
    // ready rejects when the browser skips the transition (e.g. a hidden tab); the theme has still changed.
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => {})
  }

  const handleLogout = () => {
    setUserAnchor(null)
    setToken(null)
    localStorage.removeItem('token')
    navigate('/login', { replace: true })
  }

  return (
    <div className={`sf-shell rp-frame${railOpen || openGroup ? ' rail-open' : ''}`}>
      <div className='rp-rail-edge' aria-hidden='true' onMouseEnter={showRail} onMouseLeave={hideRail}>
        <i />
      </div>
      <nav
        ref={railRef}
        className='sf-capsule rp-rail'
        aria-label='Primary navigation'
        onMouseEnter={showRail}
        onMouseLeave={hideRail}
        onFocus={onRailFocus}
        onBlur={hideRail}
      >
        <Link to='/' className='rp-rail-mark' aria-label='Redpay home'>
          <img src='/logo-white.png' alt='' />
        </Link>
        {navItems.map((item) => {
          const active = isMatch(location.pathname, item.match)
          const icon = NAV_ICONS[item.label] ?? <SpaceDashboardOutlinedIcon />
          if (item.type === 'link') {
            return (
              <Tooltip key={item.label} title={item.label} placement={docked ? 'top' : 'right'} arrow>
                <Link
                  to={item.path}
                  className={`sf-capsule-item${active ? ' active' : ''}`}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {icon}
                </Link>
              </Tooltip>
            )
          }
          const open = openGroup === item.label
          return (
            <Tooltip key={item.label} title={open ? '' : item.label} placement={docked ? 'top' : 'right'} arrow>
              <button
                type='button'
                className={`sf-capsule-item has-menu${active ? ' active' : ''}${open ? ' open' : ''}`}
                aria-label={item.label}
                aria-haspopup='menu'
                aria-expanded={open}
                onClick={(e) => {
                  setGroupAnchor(e.currentTarget)
                  setOpenGroup(item.label)
                }}
              >
                {icon}
              </button>
            </Tooltip>
          )
        })}
        <i className='sf-capsule-sep' />
        <Tooltip title='Logout' placement={docked ? 'top' : 'right'} arrow>
          <button type='button' className='sf-capsule-item rp-rail-logout' aria-label='Logout' onClick={handleLogout}>
            <LogoutRoundedIcon />
          </button>
        </Tooltip>
      </nav>

      <header className='rp-bar'>
        <Link to='/' className='rp-brand' aria-label='Redpay home'>
          <img className='on-light' src='/logo.png' alt='Redpay' />
          <img className='on-dark' src='/logo-white.png' alt='' />
        </Link>
        <div className='rp-crumbs'>
          <button type='button' className='rp-back' aria-label='Go back' onClick={() => navigate(-1)}>
            <ArrowBackRoundedIcon />
          </button>
          <h1>
            {pageTitle.group && <span>{pageTitle.group}</span>}
            {pageTitle.page}
          </h1>
        </div>
        <div className='rp-bar-right'>
          <button type='button' className='rp-search' aria-label='Search pages (Ctrl K)' onClick={() => setSearchOpen(true)}>
            <SearchRoundedIcon />
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button
            type='button'
            className='rp-icon'
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            onClick={toggleTheme}
          >
            {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </button>
          <div className='rp-env'>
            <ApiSwitcher />
          </div>
          <button type='button' className='rp-avatar' aria-label='Account menu' onClick={(e) => setUserAnchor(e.currentTarget)}>
            {initial}
          </button>
        </div>
      </header>

      <main className='sf-content rp-sheet'>
        <div className='rp-page' key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        fullWidth
        maxWidth='sm'
        PaperProps={{ className: 'sf-search-dialog', sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible', alignSelf: 'flex-start', mt: '12vh' } }}
      >
        <PageSearch links={flatLinks} autoFocus alwaysOpen onDone={() => setSearchOpen(false)} />
      </Dialog>

      <Menu
        anchorEl={groupAnchor}
        open={Boolean(groupAnchor) && Boolean(activeGroup)}
        onClose={closeGroup}
        anchorOrigin={docked ? { vertical: 'top', horizontal: 'center' } : { vertical: 'center', horizontal: 'right' }}
        transformOrigin={docked ? { vertical: 'bottom', horizontal: 'center' } : { vertical: 'center', horizontal: 'left' }}
        sx={{ zIndex: 2100 }}
        PaperProps={{ className: 'rp-menu', sx: { ...menuPaperSx, mt: docked ? -1.5 : 0, ml: docked ? 0 : 1.5 } }}
      >
        <div className='sf-menu-title'>{activeGroup?.label}</div>
        {activeGroup?.type === 'dropdown' &&
          activeGroup.children.map((child) => (
            <MenuItem
              key={child.path + child.label}
              selected={isOn(location.pathname, child.path)}
              onClick={() => {
                closeGroup()
                navigate(child.path)
              }}
              sx={{ fontSize: 14, borderRadius: '10px', mx: 0.75, minHeight: 36 }}
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
        PaperProps={{ className: 'rp-menu', sx: menuPaperSx }}
      >
        <div className='sf-menu-user'>
          <strong>{username}</strong>
          <small>{role}</small>
        </div>
        <div className='sf-menu-api'>
          <small>API environment</small>
          <ApiSwitcher />
        </div>
        <Divider sx={{ borderColor: 'var(--sf-line)' }} />
        <MenuItem onClick={handleLogout} sx={{ fontSize: 13, gap: 1 }}>
          <LogoutRoundedIcon fontSize='small' />
          Logout
        </MenuItem>
      </Menu>
    </div>
  )
}
