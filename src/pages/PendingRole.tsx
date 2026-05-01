import { useAuth } from '@/hooks/use-auth'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

export default function PendingRole() {
  const { user, signOut, refreshUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [clinicPhone, setClinicPhone] = useState<string>('')
  const [clinicEmail, setClinicEmail] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const attemptedPath = location.state?.from?.pathname
    if (attemptedPath) {
      console.log(`[RoleGate] Blocked access to path: ${attemptedPath} due to missing role.`)
    }
  }, [location])

  useEffect(() => {
    const fetchClinicInfo = async () => {
      if (user?.clinic_id) {
        try {
          const clinic = await pb.collection('clinic_settings').getOne(user.clinic_id)
          if (clinic.phone) setClinicPhone(clinic.phone)
          if (clinic.email) setClinicEmail(clinic.email)
        } catch (error) {
          console.error('Could not fetch clinic info', error)
        }
      }
    }
    fetchClinicInfo()
  }, [user?.clinic_id])

  useRealtime('users', async (e) => {
    if (e.record.id === user?.id) {
      if (
        e.record.role &&
        (e.record.role === 'admin' || e.record.clinic_id) &&
        e.record.status === 'active'
      ) {
        try {
          await refreshUser()
          toast.success('Role updated! Redirecting...')
          navigate(location.state?.from?.pathname || '/')
        } catch (error) {
          console.error('Error refreshing auth:', error)
        }
      }
    }
  })

  const checkStatus = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()

      const updatedUser = pb.authStore.record
      if (
        updatedUser?.role &&
        (updatedUser.role === 'admin' || updatedUser.clinic_id) &&
        updatedUser.status === 'active'
      ) {
        toast.success('Role updated! Redirecting...')
        navigate(location.state?.from?.pathname || '/')
      } else {
        toast.info('Still pending role assignment. Please wait for an administrator.')
      }
    } catch (error) {
      toast.error('Failed to check status.')
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.status === 'pending' || user.status === 'rejected') {
    return <Navigate to="/pending-approval" replace state={location.state} />
  }
  if (user.role && (user.role === 'admin' || user.clinic_id) && user.status === 'active') {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 w-full">
      <Card className="max-w-md w-full shadow-sm border-0 bg-white">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100/50">
            <ShieldAlert className="h-7 w-7 text-amber-600" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-[22px] font-semibold tracking-tight text-slate-900">
            Role Assignment Pending
          </CardTitle>
          <CardDescription className="text-[15px] text-slate-500 mt-1">
            Setup required for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center pb-8 px-8">
          <div className="space-y-4 text-[14.5px] text-slate-600 leading-relaxed">
            <p>Your account is pending role assignment. Please contact your administrator.</p>
            {(clinicPhone || clinicEmail) && (
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-left space-y-1.5 mt-2">
                <p className="font-medium text-slate-900 mb-2">Administrator Contact:</p>
                {clinicPhone && (
                  <p className="text-slate-600 flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Phone:</span> {clinicPhone}
                  </p>
                )}
                {clinicEmail && (
                  <p className="text-slate-600 flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Email:</span> {clinicEmail}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                signOut()
                navigate('/login')
              }}
              variant="outline"
              className="w-full h-11 text-slate-700 font-medium rounded-xl border-slate-200 hover:bg-slate-50"
            >
              Logout
            </Button>
            <Button
              onClick={checkStatus}
              variant="ghost"
              className="w-full h-11 text-slate-500 hover:text-slate-700 rounded-xl"
              disabled={isRefreshing}
            >
              {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
              Check Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
