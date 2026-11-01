import * as React from 'react'
import { ThemeProvider, createTheme, useColorScheme } from '@mui/material/styles'
import type { ThemeOptions } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ConfigProvider, theme as antTheme } from 'antd'
import { colorSchemes, typography, shape } from './themePrimitives'
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../customizations'

const ThemeScope = React.createContext(false)
function ThemeBridge({ children }: { children: React.ReactNode }) {
  const { mode, systemMode } = useColorScheme()
  const resolved = (mode === 'system' ? systemMode : mode) || document.documentElement.dataset.theme || 'dark'
  const dark = resolved === 'dark'
  const previousMode = React.useRef(resolved)
  React.useLayoutEffect(() => {
    const root = document.documentElement
    if (previousMode.current !== resolved) {
      root.classList.add('theme-transitioning')
      previousMode.current = resolved
    }
    root.dataset.theme = resolved
    const timeout = window.setTimeout(() => root.classList.remove('theme-transitioning'), 450)
    return () => window.clearTimeout(timeout)
  }, [resolved])
  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          // Mirrors the aurora palette in redesign.css.
          colorPrimary: dark ? '#7c5cff' : '#6a47ff',
          colorInfo: dark ? '#a5b4fc' : '#5046e5',
          colorSuccess: dark ? '#3fcf86' : '#12a15a',
          colorWarning: dark ? '#f0b43c' : '#e8930c',
          colorError: dark ? '#f47a7e' : '#e5484d',
          colorLink: dark ? '#a5b4fc' : '#5046e5',
          colorBgBase: dark ? '#0a0c16' : '#f2f3fb',
          colorBgContainer: dark ? '#14172a' : '#ffffff',
          colorBgElevated: dark ? '#1b1f36' : '#ffffff',
          colorText: dark ? '#eceefc' : '#14162b',
          colorTextSecondary: dark ? '#8d92b4' : '#686d92',
          colorTextPlaceholder: dark ? '#8d92b4' : '#9a9fc0',
          colorBorder: dark ? '#2a2e48' : '#d9dcee',
          colorBorderSecondary: dark ? '#25283f' : '#e2e5f3',
          controlItemBgActive: dark ? '#25283f' : '#eceeff',
          borderRadius: 12,
        },
      }}
    >
      <CssBaseline enableColorScheme />
      {children}
    </ConfigProvider>
  )
}
interface AppThemeProps {
  children: React.ReactNode
  disableCustomTheme?: boolean
  themeComponents?: ThemeOptions['components']
}
export default function AppTheme({ children, disableCustomTheme, themeComponents }: AppThemeProps) {
  const inherited = React.useContext(ThemeScope)
  const theme = React.useMemo(
    () =>
      createTheme({
        cssVariables: { colorSchemeSelector: 'data-mui-color-scheme', cssVarPrefix: 'template' },
        colorSchemes,
        typography,
        shape,
        components: {
          ...chartsCustomizations,
          ...dataGridCustomizations,
          ...datePickersCustomizations,
          ...treeViewCustomizations,
          MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
          MuiCard: {
            styleOverrides: {
              root: ({ theme }) => ({
                borderRadius: 18,
                border: '1px solid transparent',
                boxShadow: theme.vars ? theme.vars.palette.baseShadow : 'none',
              }),
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 999, textTransform: 'none', fontWeight: 600, boxShadow: 'none' },
            },
          },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
          MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 600 } } },
          ...themeComponents,
        },
      }),
    [themeComponents],
  )
  // Route wrappers reuse the root provider so portals and navigation share one mode.
  if (inherited || disableCustomTheme) return <>{children}</>
  return (
    <ThemeScope.Provider value={true}>
      <ThemeProvider theme={theme} defaultMode='dark' modeStorageKey='dcb_theme'>
        <ThemeBridge>{children}</ThemeBridge>
      </ThemeProvider>
    </ThemeScope.Provider>
  )
}
