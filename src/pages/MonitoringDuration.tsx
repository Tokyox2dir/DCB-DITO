import CssBaseline from '@mui/material/CssBaseline'
import DurationChart from '../components/DurationChart'
import AppTheme from '../styles/theme/shared-theme/AppTheme'
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

export default function MonitoringDuration(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props} themeComponents={xThemeComponents}>
      <CssBaseline enableColorScheme />
      <section className='mon-page mon-dur-page'>
        <header className='mon-head'>
          <div className='mon-head-text'>
            <div className='mon-dur-series'>
              <span>
                <i /> Avg Total Duration
              </span>
              <span>
                <i className='supplier' /> Avg Supplier Duration
              </span>
              <span>
                <i className='merchant' /> Avg Merchant Duration
              </span>
              <span className='tag'>Merchant &amp; Payment Method</span>
              <span className='tag'>Auto refresh 10 min</span>
            </div>
          </div>
        </header>

        <details className='mon-dur-help'>
          <summary>View details</summary>
          <div className='mon-dur-help-body'>
            <div>
              <h5>How to read the merchant cards</h5>
              <p>
                Each card represents one merchant and payment method combination. The chart inside the card makes it
                easier to compare duration trends across channels without reading one crowded chart.
              </p>
            </div>
            <div>
              <h5>Available filters</h5>
              <p>
                Use merchant, payment method, status, and date range filters to narrow the dataset and make
                investigation easier when a transaction starts to slow down.
              </p>
            </div>
          </div>
        </details>

        <DurationChart />
      </section>
    </AppTheme>
  )
}
