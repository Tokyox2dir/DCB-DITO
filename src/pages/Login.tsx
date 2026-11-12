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
      triggerError('Username is required.')
      isValid = false
    }

    if (!password?.value || password.value.length < 6) {
      setPasswordError(true)
      setPasswordErrorMessage('Password must be at least 6 characters.')
      if (isValid) triggerError('Password must be at least 6 characters.')
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
          triggerError(error.response.data.message || 'Login failed. Please try again.')
        } else {
          triggerError('No response from the server.')
        }
      } else {
        triggerError('Check your network connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppTheme {...props}>
      <main className={`sf-login${entered ? ' is-entered' : ''}`}>
        <section className='sf-login-panel'>
          <div className='sf-login-panel-top'>
            <span className='sf-login-logo'>
              <img className='on-light' src='/logo.png' alt='Redpay' />
              <img className='on-dark' src='/logo-white.png' alt='' />
            </span>
            <span className='sf-login-mode'>
              <ColorModeIconDropdown aria-label='Change color theme' />
            </span>
          </div>

          <Box
            className='sf-login-card'
            sx={{
              animation: shake ? 'loginShake 0.4s ease' : 'none',
              '@keyframes loginShake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px)' },
                '50%': { transform: 'translateX(5px)' },
                '75%': { transform: 'translateX(-3px)' },
              },
            }}
          >
            <h1 className='sf-login-title'>Sign in</h1>
            <p className='sf-login-sub'>Use your Redpay panel account to continue.</p>

            {formError && (
              <div role='alert' className='sf-login-error'>
                <ErrorOutlineIcon />
                <span>{formError}</span>
              </div>
            )}

            <Box component='form' onSubmit={handleSubmit} noValidate className='sf-login-form'>
              <div className='sf-login-field'>
                <label htmlFor='username'>Username</label>
                <TextField
                  id='username'
                  name='username'
                  placeholder='Enter your username'
                  autoComplete='username'
                  autoFocus
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <PersonOutlineIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <div className='sf-login-field'>
                <label htmlFor='password'>Password</label>
                <TextField
                  id='password'
                  name='password'
                  placeholder='Enter your password'
                  type={showPassword ? 'text' : 'password'}
                  autoComplete='current-password'
                  required
                  fullWidth
                  error={passwordError}
                  helperText={passwordErrorMessage}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <LockOutlinedIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword((v) => !v)}
                          edge='end'
                          size='small'
                          className='sf-login-eye'
                        >
                          {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </div>

              <button type='submit' className='sf-login-submit' disabled={loading} aria-busy={loading}>
                {loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Sign in'}
                {!loading && <ArrowForwardRoundedIcon />}
              </button>
            </Box>

            <div className='sf-login-badges' aria-hidden='true'>
              <span>
                <HttpsOutlinedIcon /> Encrypted sign-in
              </span>
              <span>
                <SwapHorizRoundedIcon /> Prod &amp; Dev API
              </span>
            </div>
          </Box>

          <p className='sf-login-foot'>Redpay · Payment Management</p>
        </section>

        <section className='sf-login-showcase' aria-hidden='true'>
          <div className='sf-login-top'>
            <img className='sf-login-showcase-logo' src='/logo-white.png' alt='' />
            <span className='sf-login-live'>
              <i /> Live payment monitoring
            </span>
          </div>

          <div className='sf-login-copy'>
            <h2>Every payment, one calm view.</h2>
            <p>Track traffic, catch failing merchants early and pull settlement reports from a single panel.</p>
          </div>

          <div className='sf-login-block sf-login-status'>
            <div className='sf-login-block-head'>
              <span>Every status, tracked</span>
              <span className='mono'>sample</span>
            </div>
            <div className='sf-login-status-bar'>
              <i className='ok' />
              <i className='pend' />
              <i className='wait' />
              <i className='bad' />
            </div>
            <div className='sf-login-status-pills'>
              <span className='ok'>
                <i /> Success <b>92.4%</b>
              </span>
              <span className='pend'>
                <i /> Pending <b>4.1%</b>
              </span>
              <span className='wait'>
                <i /> Waiting <b>2.3%</b>
              </span>
              <span className='bad'>
                <i /> Failed <b>1.2%</b>
              </span>
            </div>
          </div>

          <div className='sf-login-block sf-login-heat-wrap'>
            <div className='sf-login-block-head'>
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
            <div className='sf-login-heat-axis mono'>
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>now</span>
            </div>
          </div>

          <div className='sf-login-tiles'>
            <div className='sf-login-tile'>
              <MonitorHeartOutlinedIcon />
              <strong>Live monitoring</strong>
              <small>Real-time charts per merchant</small>
            </div>
            <div className='sf-login-tile'>
              <GridViewRoundedIcon />
              <strong>Traffic heatmap</strong>
              <small>10-minute slots at a glance</small>
            </div>
            <div className='sf-login-tile'>
              <NotificationsActiveOutlinedIcon />
              <strong>Failure alerts</strong>
              <small>Spot problems before users do</small>
            </div>
          </div>

          <div className='sf-login-marquee'>
            <div className='sf-login-marquee-track'>
              {[...METHOD_NAMES, ...METHOD_NAMES].map((name, i) => (
                <span key={i}>{name}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppTheme>
  )
}
