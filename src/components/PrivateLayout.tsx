import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './layout/app-sidebar'
import { AppHeader } from './layout/app-header'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export default function PrivateLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.status === 'pending' || user.status === 'rejected') {
    return <Navigate to="/pending-approval" replace />
  }

  const isPortalGate = location.pathname === '/portal'

  return (
    <SidebarProvider>
      {!isPortalGate && <AppSidebar />}
      <SidebarInset
        className={`flex flex-col min-h-screen ${isPortalGate ? 'bg-background' : 'bg-muted/30'}`}
      >
        {!isPortalGate && <AppHeader />}
        <main className={`flex-1 ${isPortalGate ? '' : 'p-6'} animate-fade-in-up`}>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
