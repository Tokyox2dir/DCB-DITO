import React, { useState, ChangeEvent } from 'react'
import {
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material'
import { Input } from 'antd'
import { Business, Phone, Email, Language, Apps, Payment, Edit, Save, Cancel, LocationOn } from '@mui/icons-material'
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
    <div className='tx-page'>
      {/* Header */}
      <header className='tx-head'>
        <div className='tx-identity'>
          <span className='tx-avatar' aria-hidden='true'>
            {client.client_name?.charAt(0).toUpperCase()}
          </span>
          <div className='tx-head-main'>
            <span className='tx-eyebrow'>Merchant Profile</span>
            <h2 className='tx-title'>
              {client.client_name}
              <Chip
                label={getStatusText(client.client_status)}
                color={getStatusColor(client.client_status)}
                size='small'
              />
            </h2>
          </div>
        </div>
        <div className='tx-actions'>
          {!editMode && (
            <Button variant='contained' startIcon={<Edit />} onClick={() => handleEdit()}>
              Edit
            </Button>
          )}
        </div>
      </header>

      {/* Alert Messages */}
      {updateError && (
        <Alert severity='error' onClose={() => setUpdateError(null)}>
          {updateError}
        </Alert>
      )}

      {updateSuccess && (
        <Alert severity='success' onClose={() => setUpdateSuccess(false)}>
          Profile updated successfully!
        </Alert>
      )}

      <div className='tx-detail-grid side'>
        {/* Profile Card */}
        <section className='tx-card'>
          <div className='tx-card-body'>
            {/* Basic Information */}
            <div className='tx-form-section'>
              <h4 className='tx-section-label'>Basic Information</h4>
              <div className='tx-form-grid'>
                <div className='tx-field'>
                  <label>Merchant Name</label>
                  <Input value={client.client_name} disabled prefix={<Business className='tx-input-icon' />} />
                </div>
                <div className='tx-field'>
                  <label>Mobile</label>
                  <Input value={client.mobile} disabled prefix={<Phone className='tx-input-icon' />} />
                </div>
                <div className='tx-field'>
                  <label>Phone</label>
                  <Input value={client.phone} disabled prefix={<Phone className='tx-input-icon' />} />
                </div>
                <div className='tx-field'>
                  <label>Email</label>
                  <Input
                    value={editMode ? formData.email : client.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                    disabled={!editMode}
                    prefix={<Email className='tx-input-icon' />}
                  />
                </div>
                <div className='tx-field span-2'>
                  <label>Address</label>
                  <TextField
                    value={editMode ? formData.address : client.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={!editMode}
                    fullWidth
                    multiline
                    rows={3}
                    variant='outlined'
                    InputProps={{
                      startAdornment: <LocationOn className='tx-input-icon' style={{ marginRight: 8 }} />,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Callback URLs */}
            <div className='tx-form-section'>
              <h4 className='tx-section-label'>URL Callback</h4>
              {client.apps && client.apps.length > 0 ? (
                client.apps.map((app) => (
                  <div key={app.id} className='tx-app-block'>
                    <h4>{app.app_name}</h4>
                    <div className='tx-form-grid'>
                      <div className='tx-field span-2'>
                        <label>Success Callback URL</label>
                        <Input
                          value={editMode ? appFormData[app.id]?.callback_url || '' : app.callback_url || ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleAppInputChange(app.id, 'callback_url', e.target.value)
                          }
                          disabled={!editMode}
                          prefix={<Language className='tx-input-icon' />}
                        />
                      </div>
                      {app.fail_callback === '1' && (
                        <div className='tx-field span-2'>
                          <label>Fail Callback URL</label>
                          <Input
                            value={editMode ? appFormData[app.id]?.fail_callback || '' : app.fail_callback || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              handleAppInputChange(app.id, 'fail_callback', e.target.value)
                            }
                            disabled={!editMode}
                            prefix={<Language className='tx-input-icon' />}
                          />
                        </div>
                      )}
                      <div className='tx-field'>
                        <label>Mobile</label>
                        <Input
                          value={editMode ? appFormData[app.id]?.mobile || '' : app.mobile || ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleAppInputChange(app.id, 'mobile', e.target.value)
                          }
                          disabled={!editMode}
                          prefix={<Phone className='tx-input-icon' />}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <span className='tx-empty'>No registered applications</span>
              )}
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          {editMode && (
            <div className='tx-form-footer'>
              <Button variant='outlined' startIcon={<Cancel />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant='contained' startIcon={<Save />} onClick={handleSaveProfile} disabled={updateLoading}>
                {updateLoading ? <CircularProgress size={16} /> : 'Save'}
              </Button>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <section className='tx-card'>
          <div className='tx-card-head'>
            <h3>Summary</h3>
          </div>
          <div className='tx-stat-list'>
            <div className='tx-stat'>
              <span className='label'>Applications</span>
              <span className='value'>{client.apps?.length || 0}</span>
              <span className='sub'>
                Total registered applications ·{' '}
                <button type='button' className='rp-link' onClick={() => setOpenDialog(true)}>
                  View Details
                </button>
              </span>
            </div>
            <div className='tx-stat'>
              <span className='label'>Payment Methods</span>
              <span className='value'>{client.payment_methods?.length || 0}</span>
              <span className='sub'>
                Active payment methods ·{' '}
                <button type='button' className='rp-link' onClick={() => setOpenPaymentDialog(true)}>
                  View Details
                </button>
              </span>
            </div>
            <div className='tx-stat'>
              <span className='label'>Settlement</span>
              <span className='value'>{client.settlements?.length || 0}</span>
              <span className='sub'>Registered settlement accounts</span>
            </div>
          </div>
        </section>
      </div>

      {/* Apps Detail Dialog */}
      <Dialog className='tx-dialog' open={openDialog} onClose={() => setOpenDialog(false)} maxWidth='sm' fullWidth>
        <DialogTitle>
          <Apps />
          Application Details
        </DialogTitle>
        <DialogContent>
          {client.apps && client.apps.length > 0 ? (
            client.apps.map((app) => (
              <div key={app.id} className='tx-dialog-item'>
                <h4>{app.app_name}</h4>
                <dl className='tx-dialog-kv'>
                  <div>
                    <dt>App ID</dt>
                    <dd>{app.appid}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{app.status === 1 ? 'Active' : 'Inactive'}</dd>
                  </div>
                  <div>
                    <dt>Testing</dt>
                    <dd>{app.testing === 1 ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>{app.mobile}</dd>
                  </div>
                </dl>
              </div>
            ))
          ) : (
            <div className='tx-dialog-empty'>No registered applications</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setOpenDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Methods Detail Dialog */}
      <Dialog
        className='tx-dialog'
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Payment />
          Payment Method Details
        </DialogTitle>
        <DialogContent>
          {client.payment_methods && client.payment_methods.length > 0 ? (
            client.payment_methods.map((method) => (
              <div key={method.id} className='tx-dialog-item'>
                <h4>{method.name}</h4>
                <dl className='tx-dialog-kv'>
                  <div>
                    <dt>ID</dt>
                    <dd>{method.id}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{method.status === 1 ? 'Active' : 'Inactive'}</dd>
                  </div>
                  <div>
                    <dt>Flexible</dt>
                    <dd>{method.flexible ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt>MSISDN</dt>
                    <dd>{method.msisdn}</dd>
                  </div>
                  <div>
                    <dt>Client ID</dt>
                    <dd>{method.client_id}</dd>
                  </div>
                  {method.route && Object.keys(method.route).length > 0 && (
                    <div>
                      <dt>Routes</dt>
                      {Object.entries(method.route).map(([key, value]) => (
                        <dd key={key}>
                          {key}: {Array.isArray(value) ? value.length : value}
                        </dd>
                      ))}
                    </div>
                  )}
                </dl>
              </div>
            ))
          ) : (
            <div className='tx-dialog-empty'>No registered payment methods</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='outlined' onClick={() => setOpenPaymentDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default MerchantProfile
