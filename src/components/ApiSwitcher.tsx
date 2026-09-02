import { useAuth } from '../provider/AuthProvider'
import { useLocation } from 'react-router-dom'

const ApiSwitcher = () => {
  const { isDev, toggleApi } = useAuth()
  const location = useLocation()

  const isDisabled = ['/transaction', '/merchant-transaction'].includes(location.pathname)

  return (
    <div className={`aura-api-switch${isDisabled ? ' is-disabled' : ''}`} role='group' aria-label='API environment'>
      <button
        type='button'
        className={`aura-api-opt${!isDev ? ' active prod' : ''}`}
        disabled={isDisabled || !isDev}
        onClick={() => {
          if (isDev && !isDisabled) toggleApi()
        }}
        title='Use Production API'
      >
        Prod
      </button>
      <button
        type='button'
        className={`aura-api-opt${isDev ? ' active dev' : ''}`}
        disabled={isDisabled || isDev}
        onClick={() => {
          if (!isDev && !isDisabled) toggleApi()
        }}
        title='Use Development API'
      >
        Dev
      </button>
    </div>
  )
}

export default ApiSwitcher
