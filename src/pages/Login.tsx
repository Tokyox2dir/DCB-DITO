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
      <Box
        sx={{
          minHeight: '100dvh',
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          px: 2,
          background: 'linear-gradient(160deg, #1a1012 0%, #120e10 45%, #2a1418 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,92,92,0.28) 0%, rgba(196,92,92,0) 70%)',
            top: '-80px',
            right: '-60px',
            filter: 'blur(4px)',
            animation: 'floatOrb 8s ease-in-out infinite',
            '@keyframes floatOrb': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(24px)' },
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 340,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,79,79,0.22) 0%, rgba(168,79,79,0) 70%)',
            bottom: '-90px',
            left: '-40px',
            animation: 'floatOrb 10s ease-in-out infinite reverse',
          }}
        />

        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
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
          <Box
            sx={{
              borderRadius: '24px',
              border: '1px solid rgba(196,92,92,0.22)',
              background: 'rgba(26, 20, 22, 0.88)',
              boxShadow: '0 24px 64px rgba(20, 8, 10, 0.45)',
              backdropFilter: 'blur(16px)',
              p: { xs: 3, sm: 4 },
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Box
                component='img'
                src='/logo.png'
                alt='Redpay'
                sx={{
                  height: 44,
                  mb: 1.5,
                  opacity: entered ? 1 : 0,
                  transform: entered ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.6s ease 0.1s',
                }}
              />
              <Typography
                sx={{
                  color: '#f3ecee',
                  fontWeight: 800,
                  fontSize: { xs: 24, sm: 28 },
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
                  color: '#b8a0a3',
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: '12px',
                  border: '1px solid rgba(196,92,92,0.35)',
                  background: 'rgba(168,79,79,0.14)',
                  color: '#f0b4b4',
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
                placeholder='Username'
                autoComplete='username'
                autoFocus
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <PersonOutlineIcon sx={{ color: '#b8a0a3', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    background: '#151012',
                    color: '#f3ecee',
                    '& fieldset': { borderColor: '#3a2a2e' },
                    '&:hover fieldset': { borderColor: '#a84f4f' },
                    '&.Mui-focused fieldset': { borderColor: '#c45c5c' },
                  },
                  '& .MuiInputBase-input::placeholder': { color: '#8a7074', opacity: 1 },
                }}
              />

              <TextField
                id='password'
                name='password'
                placeholder='Password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                required
                fullWidth
                error={passwordError}
                helperText={passwordErrorMessage}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <LockOutlinedIcon sx={{ color: '#b8a0a3', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        aria-label='toggle password'
                        onClick={() => setShowPassword((v) => !v)}
                        edge='end'
                        sx={{ color: '#b8a0a3' }}
                      >
                        {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    background: '#151012',
                    color: '#f3ecee',
                    '& fieldset': { borderColor: passwordError ? '#a84f4f' : '#3a2a2e' },
                    '&:hover fieldset': { borderColor: '#a84f4f' },
                    '&.Mui-focused fieldset': { borderColor: '#c45c5c' },
                  },
                  '& .MuiFormHelperText-root': { color: '#d48484' },
                  '& .MuiInputBase-input::placeholder': { color: '#8a7074', opacity: 1 },
                }}
              />

              <Button
                type='submit'
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.35,
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: 15,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #a84f4f 0%, #c45c5c 100%)',
                  boxShadow: '0 10px 28px rgba(168, 79, 79, 0.35)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #964646 0%, #b85050 100%)',
                    boxShadow: '0 12px 32px rgba(168, 79, 79, 0.45)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(168,79,79,0.45)',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Sign in'}
              </Button>
            </Box>
          </Box>

          <Typography sx={{ textAlign: 'center', mt: 2.5, color: '#8a7074', fontSize: 12, fontWeight: 600 }}>
            Redpay · Payment Management
          </Typography>
        </Box>
      </Box>
    </AppTheme>
  )
}
