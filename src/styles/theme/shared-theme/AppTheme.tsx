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
          // Mirrors the soft palette in shell-soft.css.
          colorPrimary: dark ? '#ebf1ed' : '#16181b',
          colorInfo: dark ? '#6c9cff' : '#3b74f0',
          colorSuccess: dark ? '#3fcf86' : '#12a15a',
          colorWarning: dark ? '#f0b43c' : '#e8930c',
          colorError: dark ? '#f47a7e' : '#e5484d',
          colorLink: dark ? '#6c9cff' : '#3b74f0',
          colorBgBase: dark ? '#0e1411' : '#dfe9e2',
          colorBgContainer: dark ? '#171d1a' : '#ffffff',
          colorBgElevated: dark ? '#1f2622' : '#ffffff',
          colorText: dark ? '#ebf1ed' : '#15171a',
          colorTextSecondary: dark ? '#9ba69f' : '#69716c',
          colorTextPlaceholder: dark ? '#9ba69f' : '#8a918c',
          colorBorder: dark ? '#29312c' : '#dbe3dd',
          colorBorderSecondary: dark ? '#29312c' : '#e3eae5',
          controlItemBgActive: dark ? '#29312c' : '#eef3ef',
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
