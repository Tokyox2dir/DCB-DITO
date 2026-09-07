import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import axios from 'axios'
import { useAuth } from '../provider/AuthProvider'
import AppTheme from '../styles/theme/shared-theme/AppTheme'
import ColorModeIconDropdown from '../styles/theme/shared-theme/ColorModeIconDropdown'

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

  return (
    <AppTheme {...props}>
      <Box className='login-shell'>
        <Box className='login-form-column'
          sx={{
            width: '100%',
            maxWidth: 460,
            position: 'relative',
            zIndex: 1,
            opacity: entered ? 1 : 0,
            transform: entered ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.98)',
            transition: 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
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
          <Box className='login-form-surface'>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <ColorModeIconDropdown aria-label='Change color theme' />
            </Box>
            <Box sx={{ textAlign: 'left', mb: 4 }}>
              <Box
                component='img'
                src='/logo.png'
                alt='Redpay'
                sx={{
                  height: 44,
                  mb: 1.5,
                  display: 'inline-block',
                  opacity: entered ? 1 : 0,
                  transform: entered ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.6s ease 0.1s',
                }}
              />
              <Typography
                sx={{
                  color: 'var(--dash-text)',
                  fontWeight: 650,
                  fontSize: { xs: 26, sm: 30 },
                  letterSpacing: '-0.03em',
                  opacity: entered ? 1 : 0,
                  transform: entered ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.6s ease 0.15s',
                }}
              >
                Welcome back
              </Typography>
              <Typography
                sx={{
                  color: 'var(--dash-muted)',
                  fontSize: 13,
                  mt: 0.75,
                  fontWeight: 600,
                  opacity: entered ? 1 : 0,
                  transform: entered ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.6s ease 0.2s',
                }}
              >
                Sign in to Redpay Panel
              </Typography>
            </Box>

            {formError && (
              <Box role='alert'
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: '12px',
                  border: '1px solid var(--theme-danger)',
                  background: 'var(--theme-danger-bg)',
                  color: 'var(--theme-danger)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 18 }} />
                {formError}
              </Box>
            )}

            <Box
              component='form'
              onSubmit={handleSubmit}
              noValidate
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
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
                      <PersonOutlineIcon sx={{ color: 'var(--dash-muted)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: 'var(--dash-surface-2)',
                    color: 'var(--dash-text)',
                    '& fieldset': { borderColor: 'var(--dash-border)' },
                    '&:hover fieldset': { borderColor: '#2563eb' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  },
                  '& .MuiInputBase-input::placeholder': { color: 'var(--dash-muted)', opacity: 1 },
                }}
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
                      <LockOutlinedIcon sx={{ color: 'var(--dash-muted)', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                        edge='end'
                        sx={{ color: 'var(--dash-muted)' }}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: 'var(--dash-surface-2)',
                    color: 'var(--dash-text)',
                    '& fieldset': { borderColor: passwordError ? 'var(--theme-danger)' : 'var(--dash-border)' },
                    '&:hover fieldset': { borderColor: '#2563eb' },
                    '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                  },
                  '& .MuiFormHelperText-root': { color: 'var(--theme-danger)' },
                  '& .MuiInputBase-input::placeholder': { color: 'var(--dash-muted)', opacity: 1 },
                }}
              />

              <Button
                type='submit'
                fullWidth
                disabled={loading}
                aria-busy={loading}
                aria-label={loading ? 'Signing in' : 'Sign in'}
                sx={{
                  mt: 1,
                  py: 1.35,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 15,
                  color: 'var(--theme-on-primary)',
                  background: 'var(--theme-primary)',
                  boxShadow: 'none',
                  '&:hover': {
                    background: 'var(--theme-primary-hover)',
                    boxShadow: 'none',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(37,99,235,0.45)',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign in'}
              </Button>
            </Box>
          </Box>

          <Typography sx={{ textAlign: 'center', mt: 3, color: 'var(--dash-muted)', fontSize: 12, fontWeight: 600 }}>
            Redpay · Payment Management
          </Typography>
        </Box>
      </Box>
    </AppTheme>
  )
}
