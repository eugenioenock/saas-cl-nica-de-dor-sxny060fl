import { useAuth } from '@/hooks/use-auth'
import { PatientPortal } from '@/components/portal/PatientPortal'
import { ManagerPortal } from '@/components/portal/ManagerPortal'

export default function Portal() {
  const { user } = useAuth()

  if (user?.role === 'manager' || user?.role === 'admin') {
    return <ManagerPortal />
  }

  return <PatientPortal />
}
