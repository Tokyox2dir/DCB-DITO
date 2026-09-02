import { Navigate } from 'react-router-dom'
import { useAuth } from '../provider/AuthProvider'
import { ReactNode } from 'react'

interface PrivateRouteProps {
  children: ReactNode
  allowedRoles?: string[] | null
}

const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
  const { token, role } = useAuth()

  if (!token) {
    return <Navigate to='/login' replace />
  }

  if (role == null) {
    return <div className='p-4 text-center'>Loading...</div>
  }

  const hasAccess = allowedRoles ? allowedRoles.includes(role) : true
  if (!hasAccess) return <Navigate to='/' replace />

  return children
}

export default PrivateRoute
