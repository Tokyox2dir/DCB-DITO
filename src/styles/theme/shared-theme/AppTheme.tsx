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
          // Mirrors the Ops Console tokens in src/styles/console/core.css.
          colorPrimary: dark ? '#7391ff' : '#3d63dd',
          colorInfo: dark ? '#53b1fd' : '#1570ef',
          colorSuccess: dark ? '#3ccb7f' : '#067647',
          colorWarning: dark ? '#f5a524' : '#b54708',
          colorError: dark ? '#f97066' : '#d92d20',
          colorLink: dark ? '#7391ff' : '#3d63dd',
          colorBgBase: dark ? '#0a0d14' : '#f4f5f7',
          colorBgContainer: dark ? '#10141d' : '#ffffff',
          colorBgElevated: dark ? '#10141d' : '#ffffff',
          colorText: dark ? '#e7eaf1' : '#0f1728',
          colorTextSecondary: dark ? '#a5adbe' : '#475467',
          colorTextPlaceholder: dark ? '#7f899c' : '#667085',
          colorBorder: dark ? '#344055' : '#cfd4dc',
          colorBorderSecondary: dark ? '#212938' : '#e2e5ea',
          controlItemBgActive: dark ? '#1c2231' : '#eceef2',
          controlHeight: 32,
          fontSize: 13,
          fontFamily: "'Geist', Inter, system-ui, sans-serif",
          borderRadius: 6,
          borderRadiusLG: 8,
          borderRadiusSM: 4,
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
                borderRadius: 8,
                border: '1px solid var(--border)',
                boxShadow: theme.vars ? 'none' : 'none',
              }),
            },
          },
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: { borderRadius: 6, textTransform: 'none', fontWeight: 500, boxShadow: 'none' },
            },
          },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 6 } } },
          MuiChip: { styleOverrides: { root: { borderRadius: 4, fontWeight: 500 } } },
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
