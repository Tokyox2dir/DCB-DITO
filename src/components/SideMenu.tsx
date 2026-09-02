import { styled } from '@mui/material/styles'
// import Avatar from '@mui/material/Avatar'
import MuiDrawer, { drawerClasses } from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import MenuContent from './MenuContent'
import { Navigate } from 'react-router-dom'
// import CardAlert from './CardAlert'
import OptionsMenu from './OptionsMenu'
// import IconButton from '@mui/material/IconButton'
// import { ChevronLeft, MenuOpen } from '@mui/icons-material'
import { jwtDecode } from 'jwt-decode'
import { useAuth } from '../provider/AuthProvider'
import { UserOutlined } from '@ant-design/icons'
import { Avatar } from 'antd'
import logoImage from '../../public/logo.png'
import { smsSurfaces } from '../styles/theme/shared-theme/themePrimitives'

const drawerWidth = 240

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: smsSurfaces.paper,
    backgroundImage: 'none',
    borderRight: `1px solid ${smsSurfaces.border}`,
    color: '#fff',
  },
})

interface SideMenuProps {
  open: boolean
  handleDrawerToggle: () => void
}

export default function SideMenu({ open }: SideMenuProps) {
  const { token } = useAuth()
  if (!token || typeof token !== 'string') {
    // window.location.href = '/login' // Ganti dengan rute yang sesuai
    return <Navigate to='/login' /> // Menghentikan eksekusi komponen
  }

  const decoded: any = jwtDecode(token as string)
  return (
    <Box>
      {/* <IconButton
        className="bg-amber-200"
        onClick={handleDrawerToggle}
        sx={{ m: 1 }}
      >
        {open ? <ChevronLeft /> : <MenuOpen />}
      </IconButton> */}
      <Drawer
        variant='persistent'
        open={open}
        sx={{
          display: { xs: 'none', md: 'block' },
          [`& .${drawerClasses.paper}`]: {
            backgroundColor: smsSurfaces.paper,
            backgroundImage: 'none',
            borderRight: `1px solid ${smsSurfaces.border}`,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mt: 'calc(var(--template-frame-height, 0px) + 4px)',
            px: 2,
            py: 3,
          }}
        >
           <Box
            sx={{
              width: 100,
              height: 'auto',
              borderRadius: '12px',
              // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <img src={logoImage} style={{height:'auto'}}/>
          </Box>
          {/* <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Typography
              variant='h5'
              sx={{
                color: 'white',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            >
              RP
            </Typography>
          </Box> */}
          <Typography
            variant='h6'
            sx={{
              fontWeight: 600,
              textAlign: 'center',
              color: 'text.primary',
              letterSpacing: '-0.5px',
            }}
          >
            Redpay Panel
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mt: 0.5,
            }}
          >
            Payment Management
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <MenuContent />
        {/* <CardAlert /> */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: `1px solid ${smsSurfaces.border}`,
            backgroundColor: smsSurfaces.paper,
          }}
        >
          <Stack
            direction='row'
            sx={{
              p: 2,
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <Avatar
              style={{
                backgroundColor: '#00B4F0',
                width: 40,
                height: 40,
              }}
              icon={<UserOutlined style={{ fontSize: '16px' }} />}
            />
            <Box sx={{ mr: 'auto', overflow: 'hidden' }}>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  lineHeight: '16px',
                  color: 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {decoded.username}
              </Typography>
              <Typography
                variant='caption'
                sx={{
                  color: 'text.secondary',
                  lineHeight: '14px',
                  textTransform: 'capitalize',
                }}
              >
                {decoded.role}
              </Typography>
            </Box>
            <OptionsMenu />
          </Stack>
        </Box>
      </Drawer>
    </Box>
  )
}
