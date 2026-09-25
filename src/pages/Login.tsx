import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import axios from 'axios'
import { useAuth } from '../provider/AuthProvider'
import { paymentMethods } from '../utils/paymentMethods'
import AppTheme from '../styles/theme/shared-theme/AppTheme'
import ColorModeIconDropdown from '../styles/theme/shared-theme/ColorModeIconDropdown'

// Payment method names from the shared list, shown in the showcase marquee.
const METHOD_NAMES = paymentMethods.filter((m) => m.value).map((m) => m.name)

// Decorative heatmap strip on the showcase panel (no real data).
const HEAT_PATTERN = ['low', 'mid', 'low', 'high', 'mid', 'low', 'mid', 'high', 'high', 'mid', 'alert', 'mid', 'low', 'mid', 'high', 'now']

export default function Login(props: { disableCustomTheme?: boolean }) {
  const [passwordError, setPasswordError] = useState(false)
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [entered, setEntered] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { setToken, apiUrl, setIsDev } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/login') {
      setIsDev(false)
      localStorage.setItem('api_env', 'prod')
    }
  }, [location.pathname, setIsDev])

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const triggerError = (message: string) => {
    setFormError(message)
    setShake(true)
    window.setTimeout(() => setShake(false), 520)
  }

  const validateInputs = () => {
    const username = document.getElementById('username') as HTMLInputElement
    const password = document.getElementById('password') as HTMLInputElement
    let isValid = true

    if (!username?.value?.trim()) {
      triggerError('Username wajib diisi.')
      isValid = false
    }

    if (!password?.value || password.value.length < 6) {
      setPasswordError(true)
      setPasswordErrorMessage('Password minimal 6 karakter.')
      if (isValid) triggerError('Password minimal 6 karakter.')
      isValid = false
    } else {
      setPasswordError(false)
      setPasswordErrorMessage('')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (!validateInputs()) return

    const data = new FormData(event.currentTarget)
    const username = data.get('username')
    const password = data.get('password')

    try {
      setLoading(true)
      const response = await axios.post(
        `${apiUrl}/user/login`,
        { username, password },
        { headers: { 'Content-Type': 'application/json' } },
      )

      setToken(response.data.token)
      window.location.href = '/'
    } catch (error: unknown) {
      console.error('Login failed:', error)
      if (axios.isAxiosError(error)) {
        if (error.response) {
          triggerError(error.response.data.message || 'Login gagal. Coba lagi.')
        } else {
          triggerError('Tidak ada respons dari server.')
        }
      } else {
        triggerError('Cek koneksi jaringan kamu.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      minHeight: 52,
      borderRadius: '14px',
      background: 'var(--sf-card-2)',
      color: 'var(--sf-ink)',
      '& fieldset': { borderColor: 'transparent' },
      '&:hover fieldset': { borderColor: 'var(--sf-line)' },
      '&.Mui-focused fieldset': { borderColor: 'var(--sf-ink)', borderWidth: '1.5px' },
      '&.Mui-error fieldset': { borderColor: 'var(--sf-bad)' },
    },
    '& .MuiInputLabel-root': { color: 'var(--sf-muted)', fontWeight: 600 },
    '& .MuiInputLabel-root.Mui-focused': { color: 'var(--sf-ink)' },
    '& .MuiFormHelperText-root': { color: 'var(--sf-bad)', mx: 0.5 },
    '& .MuiInputBase-input::placeholder': { color: 'var(--sf-muted)', opacity: 1 },
  }

  return (
    <AppTheme {...props}>
      <main className={`sf-login${entered ? ' is-entered' : ''}`}>
        <section className='sf-login-showcase' aria-hidden='true'>
          <div className='sf-login-top'>
            <img className='sf-login-logo' src='/logo-white.png' alt='' />
            <span className='sf-login-live'>
              <i /> Live payment monitoring
            </span>
          </div>

          <div className='sf-login-copy'>
            <h2>Every payment, one calm view.</h2>
            <p>Track traffic, catch failing merchants early and pull settlement reports from a single panel.</p>
            <div className='sf-login-status'>
              <small>Every status, tracked</small>
              <div className='sf-login-status-pills'>
                <span className='ok'>Success</span>
                <span className='pend'>Pending</span>
                <span className='wait'>Waiting</span>
                <span className='bad'>Failed</span>
              </div>
              <div className='sf-login-status-bar'>
                <i className='ok' />
                <i className='pend' />
                <i className='wait' />
                <i className='bad' />
              </div>
            </div>
          </div>

          <div className='sf-login-marquee'>
            <div className='sf-login-marquee-track'>
              {[...METHOD_NAMES, ...METHOD_NAMES].map((name, i) => (
                <span key={i} className={`tone-${i % 4}`}>
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className='sf-login-tiles'>
            <div className='sf-login-tile peach'>
              <MonitorHeartOutlinedIcon />
              <strong>Live monitoring</strong>
              <small>Real-time charts per merchant</small>
            </div>
            <div className='sf-login-tile sky'>
              <GridViewRoundedIcon />
              <strong>Traffic heatmap</strong>
              <small>10-minute slots at a glance</small>
            </div>
            <div className='sf-login-tile rose'>
              <NotificationsActiveOutlinedIcon />
              <strong>Failure alerts</strong>
              <small>Spot problems before users do</small>
            </div>
          </div>

          <div className='sf-login-heat-wrap'>
            <div className='sf-login-heat-head'>
              <span>Traffic heatmap · preview</span>
              <span className='sf-login-legend'>
                <i className='mid' /> Busy <i className='high' /> Peak <i className='alert' /> Failed <i className='now' /> Now
              </span>
            </div>
            <div className='sf-login-heat'>
              {HEAT_PATTERN.map((level, i) => (
                <i key={i} className={level} />
              ))}
            </div>
          </div>
        </section>

        <section className='sf-login-panel'>
          <i className='sf-login-blob one' aria-hidden='true' />
          <i className='sf-login-blob two' aria-hidden='true' />
          <Box
            className='sf-login-card'
            sx={{
              animation: shake ? 'loginShake 0.5s ease' : 'none',
              '@keyframes loginShake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '20%': { transform: 'translateX(-10px)' },
                '40%': { transform: 'translateX(10px)' },
                '60%': { transform: 'translateX(-7px)' },
                '80%': { transform: 'translateX(7px)' },
              },
            }}
          >
            <div className='sf-login-card-head'>
              <span className='sf-logo sf-login-logo'>
                <img className='on-light' src='/logo.png' alt='Redpay' />
                <img className='on-dark' src='/logo-white.png' alt='' />
              </span>
              <ColorModeIconDropdown aria-label='Change color theme' />
            </div>

            <h1 className='sf-login-title'>Welcome back</h1>
            <p className='sf-login-sub'>Sign in to your Redpay panel to continue.</p>

            {formError && (
              <div role='alert' className='sf-login-error'>
                <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                {formError}
              </div>
            )}

            <Box component='form' onSubmit={handleSubmit} noValidate className='sf-login-form'>
              <TextField
                id='username'
                name='username'
                label='Username'
                placeholder='Enter your username'
                InputLabelProps={{ shrink: true }}
                autoComplete='username'
                autoFocus
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <PersonOutlineIcon sx={{ color: 'var(--sf-muted)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />

              <TextField
                id='password'
                name='password'
                label='Password'
                placeholder='Enter your password'
                InputLabelProps={{ shrink: true }}
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                required
                fullWidth
                error={passwordError}
                helperText={passwordErrorMessage}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <LockOutlinedIcon sx={{ color: 'var(--sf-muted)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                        edge='end'
                        sx={{ color: 'var(--sf-muted)' }}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={inputSx}
              />

              <button type='submit' className='sf-login-submit' disabled={loading} aria-busy={loading}>
                {loading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : 'Sign in'}
                {!loading && <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
              </button>
            </Box>

            <p className='sf-login-foot'>Redpay · Payment Management</p>
          </Box>

          <div className='sf-login-badges' aria-hidden='true'>
            <span>
              <HttpsOutlinedIcon /> Encrypted sign-in
            </span>
            <span>
              <SwapHorizRoundedIcon /> Prod &amp; Dev API
            </span>
          </div>
        </section>
      </main>
    </AppTheme>
  )
}
