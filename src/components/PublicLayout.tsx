import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function PublicLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    if (user.status === 'pending' || user.status === 'rejected') {
      return <Navigate to="/pending-approval" replace />
    }

    const role = user.role
    const dashUrl =
      role === 'admin'
        ? '/admin/dashboard'
        : role === 'manager'
          ? '/manager/dashboard'
          : role === 'professional'
            ? '/professional/dashboard'
            : role === 'receptionist'
              ? '/reception/dashboard'
              : '/portal'

    return <Navigate to={dashUrl} replace />
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <Outlet />
    </div>
  )
}
