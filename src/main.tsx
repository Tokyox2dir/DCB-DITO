import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { StyledEngineProvider } from '@mui/material/styles'
import './index.css'
import './styles/sms-shell.css'
import './styles/modern-theme.css'
import App from './App'
import AppTheme from './styles/theme/shared-theme/AppTheme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <AppTheme>
        <App />
      </AppTheme>
    </StyledEngineProvider>
  </React.StrictMode>,
)
