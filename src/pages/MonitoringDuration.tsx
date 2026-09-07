import { alpha } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AppNavbar from '../components/AppNavbar'
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
      <Box sx={{ display: 'flex' }}>
        <AppNavbar />
        {/* Main content */}
        <Box
          component='main'
          sx={(theme) => ({
            flexGrow: 1,
            backgroundColor: theme.vars ? `` : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
          })}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'stretch',
              mx: 3,
              pt: 4,
              pb: 5,
              mt: { xs: 8, md: 0 },
              width: 'calc(100% - 24px)',
            }}
          >
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(99, 102, 241, 0.12)',
                boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04))',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography
                      variant='h5'
                      sx={{
                        fontWeight: 800,
                        letterSpacing: '-0.02em',
                        color: 'text.primary',
                      }}
                    >
                      Transaction Duration Monitoring
                    </Typography>
                    <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.75, lineHeight: 1.7 }}>
                      This page tracks how long transactions take to complete from start to finish, with a focus on
                      average total duration, supplier duration, and merchant duration. The data is displayed in
                      10-minute intervals so spikes and slowdowns are easier to spot.
                    </Typography>
                  </Box>

                  <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
                    <Chip label='Avg Total Duration' color='primary' variant='outlined' />
                    <Chip label='Avg Supplier Duration' color='warning' variant='outlined' />
                    <Chip label='Avg Merchant Duration' color='success' variant='outlined' />
                    <Chip label='Merchant & Payment Method' color='info' variant='outlined' />
                    <Chip label='Auto refresh 10 min' color='default' variant='outlined' />
                  </Stack>
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      mt: 0.5,
                      borderRadius: 2,
                      border: '1px solid rgba(148, 163, 184, 0.14)',
                      backgroundColor: 'background.paper',
                      '&:before': { display: 'none' },
                      '&.Mui-expanded': { margin: 0 },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        px: 2,
                        minHeight: 48,
                        '& .MuiAccordionSummary-content': { my: 1 },
                        '&.Mui-expanded': { minHeight: 48 },
                      }}
                    >
                      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'text.primary' }}>
                        View details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                          gap: 1.5,
                          pt: 0.5,
                        }}
                      >
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            border: '1px solid rgba(148, 163, 184, 0.12)',
                          }}
                        >
                          <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            How to read the merchant cards
                          </Typography>
                          <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            Each card represents one merchant and payment method combination. The chart inside the card
                            makes it easier to compare duration trends across channels without reading one crowded chart.
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            border: '1px solid rgba(148, 163, 184, 0.12)',
                          }}
                        >
                          <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            Available filters
                          </Typography>
                          <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            Use merchant, payment method, status, and date range filters to narrow the dataset and make
                            investigation easier when a transaction starts to slow down.
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              </CardContent>
            </Card>
            <DurationChart />
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  )
}
