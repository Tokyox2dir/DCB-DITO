import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import { StyledEngineProvider } from '@mui/material/styles'
import './index.css'
import './styles/console/core.css'
import './styles/console/dashboard.css'
import './styles/console/monitoring.css'
import './styles/console/login.css'
import './styles/console/transactions.css'
import './styles/console/reports.css'
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
