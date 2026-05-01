import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

const getDashUrl = (role?: string) => {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'manager') return '/manager/dashboard'
  if (role === 'professional') return '/professional/dashboard'
  if (role === 'receptionist') return '/agenda'
  if (role === 'patient') return '/patient-portal'
  return '/pending-role'
}

export default function Portal() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (!user.role || (user.role !== 'admin' && !user.clinic_id)) {
    return <Navigate to="/pending-role" replace />
  }

  return <Navigate to={getDashUrl(user.role)} replace />
}
