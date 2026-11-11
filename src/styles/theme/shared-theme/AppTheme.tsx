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
          // Mirrors the frame tokens in frame.css.
          colorPrimary: dark ? '#4fb3c9' : '#1b6c80',
          colorInfo: dark ? '#6aa5ec' : '#2f70bb',
          colorSuccess: dark ? '#3fc07a' : '#1e7b4f',
          colorWarning: dark ? '#e8a93c' : '#9a5b07',
          colorError: dark ? '#ef6a74' : '#c4242a',
          colorLink: dark ? '#4fb3c9' : '#1b6c80',
          colorBgBase: dark ? '#0e0e0d' : '#f4f3f1',
          colorBgContainer: dark ? '#171716' : '#ffffff',
          colorBgElevated: dark ? '#171716' : '#ffffff',
          colorText: dark ? '#f3f2f0' : '#141413',
          colorTextSecondary: dark ? '#b4b2ae' : '#5c5b58',
          colorTextPlaceholder: dark ? '#959390' : '#6b6a67',
          colorBorder: dark ? '#464643' : '#cfcecb',
          colorBorderSecondary: dark ? '#2a2a28' : '#e7e6e3',
          controlItemBgActive: dark ? '#262624' : '#ebeae7',
          controlHeight: 36,
          fontFamily: "'IBM Plex Sans', Inter, system-ui, sans-serif",
          borderRadius: 12,
          borderRadiusLG: 20,
          borderRadiusSM: 8,
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
                borderRadius: 20,
                border: '1px solid var(--border)',
                boxShadow: theme.vars ? 'none' : 'none',
              }),
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 12, textTransform: 'none', fontWeight: 500, boxShadow: 'none' },
            },
          },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
          MuiChip: { styleOverrides: { root: { borderRadius: 999, fontWeight: 500 } } },
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
