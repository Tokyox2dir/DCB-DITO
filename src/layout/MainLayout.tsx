import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { useColorScheme } from '@mui/material/styles'
import { ConfigProvider, theme as antTheme } from 'antd'
import AppTheme from '../styles/theme/shared-theme/AppTheme'
import TopNavBar from '../components/TopNavBar'

import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../styles/theme/customizations'

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
}

function LayoutShell() {
  const { mode, systemMode } = useColorScheme()
  const resolved = (mode === 'system' ? systemMode : mode) || 'dark'
  const isDark = resolved !== 'light'

  const antConfig = useMemo(
    () => ({
      algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#c45c5c',
        colorBgBase: isDark ? '#120e10' : '#f7f2f2',
        colorBgContainer: isDark ? '#1a1416' : '#ffffff',
        colorBgElevated: isDark ? '#24181a' : '#ffffff',
        colorText: isDark ? '#f0e8ea' : '#2a1618',
        colorTextSecondary: isDark ? '#b8a0a3' : '#7a5f62',
        colorBorder: isDark ? '#3a2a2e' : '#e6d4d6',
        borderRadius: 10,
      },
    }),
    [isDark],
  )

  return (
    <ConfigProvider theme={antConfig}>
      <div className='aura-v2-shell'>
        <CssBaseline enableColorScheme />
        <TopNavBar />
        <div className='aura-v2-content'>
          <Outlet />
        </div>
      </div>
    </ConfigProvider>
  )
}

export default function MainLayout() {
  return (
    <AppTheme themeComponents={xThemeComponents}>
      <LayoutShell />
    </AppTheme>
  )
}
