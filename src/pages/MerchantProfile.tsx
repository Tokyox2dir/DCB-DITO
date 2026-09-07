import React, { useState, ChangeEvent } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  TextField,
} from '@mui/material'
import { Input } from 'antd'
import {
  Business,
  Phone,
  Email,
  Language,
  Apps,
  Payment,
  AccountBalance,
  Edit,
  Save,
  Cancel,
  LocationOn,
} from '@mui/icons-material'
import { useClient } from '../context/ClientContext'
import { useAuth } from '../provider/AuthProvider'

const MerchantProfile: React.FC = () => {
  const { client, loading, error, refetch } = useClient()
  const { token, apiUrl, appId, appKey } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [, setSelectedAppId] = useState<number | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    address: '',
  })
  const [appFormData, setAppFormData] = useState<{
    [key: number]: { callback_url: string; fail_callback: string; mobile: string }
  }>({})
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  React.useEffect(() => {
    // Initialize form data with current client data
    if (client) {
      setFormData({
        email: client.email || '',
        address: client.address || '',
      })

      // Initialize app form data
      const initialAppData: { [key: number]: { callback_url: string; fail_callback: string; mobile: string } } = {}
      client.apps?.forEach((app) => {
        initialAppData[app.id] = {
          callback_url: app.callback_url || '',
          fail_callback: app.fail_callback || '',
          mobile: app.mobile || '',
        }
      })
      setAppFormData(initialAppData)
    }
  }, [client])

  const handleEdit = () => {
    setEditMode(true)
    setSelectedAppId(null)
    setUpdateError(null)
    setUpdateSuccess(false)
  }

  const handleCancel = () => {
    setEditMode(false)
    setSelectedAppId(null)
    setFormData({
      email: client?.email || '',
      address: client?.address || '',
    })
    // Reset app form data to original values
    const resetAppData: { [key: number]: { callback_url: string; fail_callback: string; mobile: string } } = {}
    client?.apps?.forEach((app) => {
      resetAppData[app.id] = {
        callback_url: app.callback_url || '',
        fail_callback: app.fail_callback || '',
        mobile: app.mobile || '',
      }
    })
    setAppFormData(resetAppData)
    setUpdateError(null)
    setUpdateSuccess(false)
  }

  const handleSaveProfile = async () => {
    if (!appId || !appKey) {
      setUpdateError('App ID or App Key not available')
      return
    }

    setUpdateLoading(true)
    setUpdateError(null)

    try {
      const requestBody: any = {}

      // Add email and address if they've changed
      if (formData.email !== client?.email) {
        requestBody.email = formData.email
      }
      if (formData.address !== client?.address) {
        requestBody.address = formData.address
      }

      // Add client_apps if there are apps to update
      if (client?.apps && client.apps.length > 0) {
        const appUpdates: any[] = []

        client.apps.forEach((app) => {
          const appData = appFormData[app.id]
          if (appData) {
            const appUpdate = {
              app_id: app.appid,
              ...(appData.callback_url !== app.callback_url && { callback_url: appData.callback_url }),
              ...(appData.fail_callback !== app.fail_callback && { fail_callback: appData.fail_callback }),
              ...(appData.mobile !== app.mobile && { mobile: appData.mobile }),
            }

            // Only add to updates if there are actual changes
            if (Object.keys(appUpdate).length > 1) {
              appUpdates.push(appUpdate)
            }
          }
        })

        if (appUpdates.length > 0) {
          requestBody.client_apps = appUpdates
        }
      }

      // Check if there are any changes to update
      if (Object.keys(requestBody).length === 0) {
        setUpdateError('No changes to save')
        setUpdateLoading(false)
        return
      }

      const response = await fetch(`${apiUrl}/merchant/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          appkey: appKey,
          appid: appId,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        setUpdateSuccess(true)
        setEditMode(false)
        setSelectedAppId(null)
        refetch() // Refresh data
      } else {
        setUpdateError(data.message || 'Failed to update profile')
      }
    } catch (err: any) {
      setUpdateError(err.message || 'An error occurred while updating profile')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAppInputChange = (appId: number, field: 'callback_url' | 'fail_callback' | 'mobile', value: string) => {
    setAppFormData((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        [field]: value,
      },
    }))
  }

  const getStatusColor = (status: number) => {
    return status === 1 ? 'success' : 'error'
  }

  const getStatusText = (status: number) => {
    return status === 1 ? 'Active' : 'Inactive'
  }

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity='error'>{error}</Alert>
      </Box>
    )
  }

  if (!client) {
    return (
      <Box p={3}>
        <Alert severity='warning'>Merchant data not found</Alert>
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
            <Typography variant='h4' component='h1' fontWeight='bold'>
              Merchant Profile
            </Typography>
          </Box>
        </Grid>

        {/* Alert Messages */}
        {updateError && (
          <Grid item xs={12}>
            <Alert severity='error' onClose={() => setUpdateError(null)}>
              {updateError}
            </Alert>
          </Grid>
        )}

        {updateSuccess && (
          <Grid item xs={12}>
            <Alert severity='success' onClose={() => setUpdateSuccess(false)}>
              Profile updated successfully!
            </Alert>
          </Grid>
        )}

        {/* Profile Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
                <Box display='flex' alignItems='center'>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      mr: 3,
                    }}
                  >
                    {client.client_name?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant='h5' fontWeight='bold' gutterBottom>
                      {client.client_name}
                    </Typography>
                    <Chip
                      label={getStatusText(client.client_status)}
                      color={getStatusColor(client.client_status)}
                      size='small'
                    />
                  </Box>
                </Box>
                <Box>
                  {!editMode && (
                    <Button
                      variant='contained'
                      startIcon={<Edit />}
                      onClick={() => handleEdit()}
                      sx={{ borderRadius: 2 }}
                    >
                      Edit
                    </Button>
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* Basic Information */}
              <Typography variant='h6' fontWeight='bold' mb={3}>
                Informasi Dasar
              </Typography>
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}
                    >
                      Nama Merchant
                    </Typography>
                    <Input
                      value={client.client_name}
                      disabled
                      prefix={<Business style={{ color: 'var(--dash-muted)' }} />}
                      size='large'
                      style={{ borderRadius: 8 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}
                    >
                      Mobile
                    </Typography>
                    <Input
                      value={client.mobile}
                      disabled
                      prefix={<Phone style={{ color: 'var(--dash-muted)' }} />}
                      size='large'
                      style={{ borderRadius: 8 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}
                    >
                      Telepon
                    </Typography>
                    <Input
                      value={client.phone}
                      disabled
                      prefix={<Phone style={{ color: 'var(--dash-muted)' }} />}
                      size='large'
                      style={{ borderRadius: 8 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}
                    >
                      Email
                    </Typography>
                    <Input
                      value={editMode ? formData.email : client.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                      disabled={!editMode}
                      prefix={<Email style={{ color: 'var(--dash-muted)' }} />}
                      size='large'
                      style={{ borderRadius: 8 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant='body2'
                      sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}
                    >
                      Alamat
                    </Typography>
                    <TextField
                      value={editMode ? formData.address : client.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      disabled={!editMode}
                      fullWidth
                      multiline
                      rows={3}
                      variant='outlined'
                      InputProps={{
                        startAdornment: <LocationOn style={{ color: 'var(--dash-muted)', marginRight: 8 }} />,
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Callback URLs */}
              <Typography variant='h6' fontWeight='bold' mb={3}>
                URL Callback
              </Typography>
              {client.apps && client.apps.length > 0 ? (
                <Box>
                  {client.apps.map((app) => (
                    <Card key={app.id} sx={{ mb: 2, borderRadius: 2, boxShadow: 1 }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
                          <Typography variant='subtitle1' fontWeight='bold' color='primary.main'>
                            {app.app_name}
                          </Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant='body2'
                                sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}
                              >
                                Success Callback URL
                              </Typography>
                              <Input
                                value={editMode ? appFormData[app.id]?.callback_url || '' : app.callback_url || ''}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  handleAppInputChange(app.id, 'callback_url', e.target.value)
                                }
                                disabled={!editMode}
                                prefix={<Language style={{ color: 'var(--dash-muted)' }} />}
                                size='large'
                                style={{ borderRadius: 8 }}
                              />
                            </Box>
                          </Grid>
                          {app.fail_callback === '1' && (
                            <Grid item xs={12}>
                              <Box sx={{ mb: 2 }}>
                                <Typography
                                  variant='body2'
                                  sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}
                                >
                                  Fail Callback URL
                                </Typography>
                                <Input
                                  value={editMode ? appFormData[app.id]?.fail_callback || '' : app.fail_callback || ''}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    handleAppInputChange(app.id, 'fail_callback', e.target.value)
                                  }
                                  disabled={!editMode}
                                  prefix={<Language style={{ color: 'var(--dash-muted)' }} />}
                                  size='large'
                                  style={{ borderRadius: 8 }}
                                />
                              </Box>
                            </Grid>
                          )}
                          <Grid item xs={12}>
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant='body2'
                                sx={{ mb: 1, fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}
                              >
                                Mobile
                              </Typography>
                              <Input
                                value={editMode ? appFormData[app.id]?.mobile || '' : app.mobile || ''}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                  handleAppInputChange(app.id, 'mobile', e.target.value)
                                }
                                disabled={!editMode}
                                prefix={<Phone style={{ color: 'var(--dash-muted)' }} />}
                                size='large'
                                style={{ borderRadius: 8 }}
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant='body1' color='text.secondary' textAlign='center' py={3}>
                  No registered applications
                </Typography>
              )}

              {/* Save/Cancel Buttons */}
              {editMode && (
                <Box display='flex' gap={2} mt={3} justifyContent='flex-end'>
                  <Button variant='outlined' startIcon={<Cancel />} onClick={handleCancel} sx={{ borderRadius: 2 }}>
                    Cancel
                  </Button>
                  <Button
                    variant='contained'
                    startIcon={<Save />}
                    onClick={handleSaveProfile}
                    disabled={updateLoading}
                    sx={{ borderRadius: 2 }}
                  >
                    {updateLoading ? <CircularProgress size={16} /> : 'Save'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Apps Summary */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display='flex' alignItems='center' mb={2}>
                  <Apps sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6' fontWeight='bold'>
                    Applications
                  </Typography>
                </Box>
                <Typography variant='h4' fontWeight='bold' color='primary.main'>
                  {client.apps?.length || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Total registered applications
                </Typography>
                <Button variant='text' size='small' onClick={() => setOpenDialog(true)} sx={{ mt: 1 }}>
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Payment Methods Summary */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display='flex' alignItems='center' mb={2}>
                  <Payment sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6' fontWeight='bold'>
                    Payment Methods
                  </Typography>
                </Box>
                <Typography variant='h4' fontWeight='bold' color='primary.main'>
                  {client.payment_methods?.length || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Active payment methods
                </Typography>
                <Button variant='text' size='small' onClick={() => setOpenPaymentDialog(true)} sx={{ mt: 1 }}>
                  View Details
                </Button>
              </CardContent>
            </Card>

            {/* Settlement Summary */}
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display='flex' alignItems='center' mb={2}>
                  <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant='h6' fontWeight='bold'>
                    Settlement
                  </Typography>
                </Box>
                <Typography variant='h4' fontWeight='bold' color='primary.main'>
                  {client.settlements?.length || 0}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  Akun settlement terdaftar
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Apps Detail Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' alignItems='center'>
            <Apps sx={{ mr: 1 }} />
            Detail Aplikasi
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {client.apps && client.apps.length > 0 ? (
            <List>
              {client.apps.map((app, index) => (
                <React.Fragment key={app.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Apps />
                    </ListItemIcon>
                    <ListItemText
                      primary={app.app_name}
                      secondary={
                        <Box>
                          <Typography variant='body2'>App ID: {app.appid}</Typography>
                          <Typography variant='body2'>Status: {app.status === 1 ? 'Aktif' : 'Tidak Aktif'}</Typography>
                          <Typography variant='body2'>Testing: {app.testing === 1 ? 'Ya' : 'Tidak'}</Typography>
                          <Typography variant='body2'>Mobile: {app.mobile}</Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < client.apps.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant='body1' color='text.secondary' textAlign='center' py={3}>
              Tidak ada aplikasi terdaftar
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Methods Detail Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth='md' fullWidth>
        <DialogTitle>
          <Box display='flex' alignItems='center'>
            <Payment sx={{ mr: 1 }} />
            Detail Metode Pembayaran
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {client.payment_methods && client.payment_methods.length > 0 ? (
            <List>
              {client.payment_methods.map((method, index) => (
                <React.Fragment key={method.id}>
                  <ListItem>
                    <ListItemIcon>
                      <Payment />
                    </ListItemIcon>
                    <ListItemText
                      primary={method.name}
                      secondary={
                        <Box>
                          <Typography variant='body2'>ID: {method.id}</Typography>
                          <Typography variant='body2'>
                            Status: {method.status === 1 ? 'Aktif' : 'Tidak Aktif'}
                          </Typography>
                          <Typography variant='body2'>Flexible: {method.flexible ? 'Ya' : 'Tidak'}</Typography>
                          <Typography variant='body2'>MSISDN: {method.msisdn}</Typography>
                          <Typography variant='body2'>Client ID: {method.client_id}</Typography>
                          {method.route && Object.keys(method.route).length > 0 && (
                            <Box mt={1}>
                              <Typography variant='body2' fontWeight='bold'>
                                Routes:
                              </Typography>
                              {Object.entries(method.route).map(([key, value]) => (
                                <Typography key={key} variant='body2' sx={{ ml: 2 }}>
                                  {key}: {Array.isArray(value) ? value.length : value}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < client.payment_methods.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant='body1' color='text.secondary' textAlign='center' py={3}>
              Tidak ada metode pembayaran terdaftar
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Tutup</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MerchantProfile
