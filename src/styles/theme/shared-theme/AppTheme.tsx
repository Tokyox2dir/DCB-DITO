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
          // Mirrors the flat palette in redesign.css.
          colorPrimary: dark ? '#ed4b5b' : '#dc2626',
          colorInfo: dark ? '#60a5fa' : '#2563eb',
          colorSuccess: dark ? '#3fcf86' : '#12a15a',
          colorWarning: dark ? '#f0b43c' : '#e8930c',
          colorError: dark ? '#f47a7e' : '#e5484d',
          colorLink: dark ? '#60a5fa' : '#2563eb',
          colorBgBase: dark ? '#0b1017' : '#f0f2f7',
          colorBgContainer: dark ? '#0c111a' : '#ffffff',
          colorBgElevated: dark ? '#101722' : '#ffffff',
          colorText: dark ? '#edf2f7' : '#1a202c',
          colorTextSecondary: dark ? '#9aa7b7' : '#4a5568',
          colorTextPlaceholder: dark ? '#9aa7b7' : '#8793ad',
          colorBorder: dark ? '#334155' : '#c9d1e0',
          colorBorderSecondary: dark ? '#253142' : '#e2e8f0',
          controlItemBgActive: dark ? '#253142' : '#e3e8f2',
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
