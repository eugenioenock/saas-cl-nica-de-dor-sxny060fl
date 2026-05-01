import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert } from 'lucide-react'

export default function PendingRole() {
  const { user, signOut } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.status === 'pending' || user.status === 'rejected') {
    return <Navigate to="/pending-approval" replace />
  }
  if (user.role && (user.role === 'admin' || user.clinic_id)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 w-full">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Role Assignment Pending</CardTitle>
          <CardDescription>Setup required for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is pending role assignment. Please contact your administrator.
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
