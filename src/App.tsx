import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppProvider } from '@/hooks/use-app-context'
import Layout from './components/Layout'
import Index from './pages/Index'
import Patients from './pages/Patients'
import PatientRecord from './pages/PatientRecord'
import Inventory from './pages/Inventory'
import Financeiro from './pages/Financeiro'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import RecordsRedirect from './pages/RecordsRedirect'
import Agenda from './pages/Agenda'
import Login from './pages/Login'
import Portal from './pages/Portal'
import Insurance from './pages/Insurance'
import Orders from './pages/Orders'
import QuickUsage from './pages/QuickUsage'
import ReportsPerformance from './pages/ReportsPerformance'
import Integrations from './pages/Integrations'
import SettingsAccessControl from './pages/SettingsAccessControl'
import SettingsReports from './pages/SettingsReports'
import SettingsMaintenance from './pages/SettingsMaintenance'
import SettingsMaintenanceMigration from './pages/SettingsMaintenanceMigration'
import MatrixDashboard from './pages/MatrixDashboard'
import PendingApproval from './pages/PendingApproval'
import UnitsComparison from './pages/UnitsComparison'
import DeveloperHub from './pages/DeveloperHub'
import AnatomicalModelEditor from './pages/AnatomicalModelEditor'
import AuditHistory from './pages/AuditHistory'
import FranchiseManagement from './pages/FranchiseManagement'
import FranchiseDashboard from './pages/FranchiseDashboard'
import FranchiseTemplates from './pages/FranchiseTemplates'
import FranchiseTransfers from './pages/FranchiseTransfers'
import ProfessionalFinance from './pages/ProfessionalFinance'
import SignatureAudit from './pages/SignatureAudit'
import Suppliers from './pages/Suppliers'
import Manual from './pages/Manual'
import UsersManagement from './pages/UsersManagement'
import AccessLogs from './pages/AccessLogs'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { AuthProvider, useAuth } from './hooks/use-auth'
import { ThemeProvider } from '@/components/theme-provider'
import { Loader2 } from 'lucide-react'

const getDashUrl = (role?: string) => {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'manager') return '/manager/dashboard'
  if (role === 'professional') return '/professional/dashboard'
  if (role === 'receptionist') return '/reception/dashboard'
  return '/portal'
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.status === 'pending' || user.status === 'rejected')
    return <Navigate to="/pending-approval" replace />
  return <>{children}</>
}

const RoleGate = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={getDashUrl(user.role)} replace />
  }
  return <>{children}</>
}

const RouteDispatcher = () => {
  const { user } = useAuth()
  return <Navigate to={getDashUrl(user?.role)} replace />
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<RouteDispatcher />} />

                {/* Dashboards */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <RoleGate roles={['admin']}>
                      <Index />
                    </RoleGate>
                  }
                />
                <Route
                  path="/manager/dashboard"
                  element={
                    <RoleGate roles={['manager']}>
                      <Index />
                    </RoleGate>
                  }
                />
                <Route
                  path="/professional/dashboard"
                  element={
                    <RoleGate roles={['professional']}>
                      <Index />
                    </RoleGate>
                  }
                />
                <Route
                  path="/reception/dashboard"
                  element={
                    <RoleGate roles={['receptionist']}>
                      <Index />
                    </RoleGate>
                  }
                />

                <Route
                  path="/dashboard/matrix"
                  element={
                    <RoleGate roles={['admin']}>
                      <MatrixDashboard />
                    </RoleGate>
                  }
                />
                <Route
                  path="/dashboard/units-comparison"
                  element={
                    <RoleGate roles={['admin']}>
                      <UnitsComparison />
                    </RoleGate>
                  }
                />

                <Route
                  path="/portal"
                  element={
                    <RoleGate roles={['admin', 'manager', 'patient']}>
                      <Portal />
                    </RoleGate>
                  }
                />

                {/* Clinical / Operational */}
                <Route
                  path="/agenda"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional', 'receptionist']}>
                      <Agenda />
                    </RoleGate>
                  }
                />
                <Route
                  path="/pacientes"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional', 'receptionist']}>
                      <Patients />
                    </RoleGate>
                  }
                />
                <Route
                  path="/pacientes/:id"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional', 'receptionist']}>
                      <PatientRecord />
                    </RoleGate>
                  }
                />
                <Route
                  path="/records"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional']}>
                      <RecordsRedirect />
                    </RoleGate>
                  }
                />

                {/* Inventory */}
                <Route
                  path="/inventory"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <Inventory />
                    </RoleGate>
                  }
                />
                <Route
                  path="/inventory/orders"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <Orders />
                    </RoleGate>
                  }
                />
                <Route
                  path="/inventory/usage/quick"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional']}>
                      <QuickUsage />
                    </RoleGate>
                  }
                />
                <Route
                  path="/inventory/suppliers"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <Suppliers />
                    </RoleGate>
                  }
                />

                {/* Financial */}
                <Route
                  path="/financeiro"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <Financeiro />
                    </RoleGate>
                  }
                />
                <Route
                  path="/insurance"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <Insurance />
                    </RoleGate>
                  }
                />
                <Route
                  path="/professional/finance"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional']}>
                      <ProfessionalFinance />
                    </RoleGate>
                  }
                />

                {/* Reports */}
                <Route
                  path="/reports"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional']}>
                      <Reports />
                    </RoleGate>
                  }
                />
                <Route
                  path="/reports/performance"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional']}>
                      <ReportsPerformance />
                    </RoleGate>
                  }
                />

                {/* General Settings */}
                <Route path="/settings" element={<Settings />} />
                <Route
                  path="/manual"
                  element={
                    <RoleGate roles={['admin', 'manager', 'professional', 'receptionist']}>
                      <Manual />
                    </RoleGate>
                  }
                />

                {/* Admin & Management */}
                <Route
                  path="/settings/integrations"
                  element={
                    <RoleGate roles={['admin']}>
                      <Integrations />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/audit-history"
                  element={
                    <RoleGate roles={['admin']}>
                      <AuditHistory />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/signature-audit"
                  element={
                    <RoleGate roles={['admin']}>
                      <SignatureAudit />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/access-control"
                  element={
                    <RoleGate roles={['admin']}>
                      <SettingsAccessControl />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/reports"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <SettingsReports />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/maintenance"
                  element={
                    <RoleGate roles={['admin']}>
                      <SettingsMaintenance />
                    </RoleGate>
                  }
                />
                <Route
                  path="/settings/maintenance/migration"
                  element={
                    <RoleGate roles={['admin']}>
                      <SettingsMaintenanceMigration />
                    </RoleGate>
                  }
                />

                <Route
                  path="/admin/franchise"
                  element={
                    <RoleGate roles={['admin']}>
                      <FranchiseManagement />
                    </RoleGate>
                  }
                />
                <Route
                  path="/franchise-dashboard"
                  element={
                    <RoleGate roles={['admin']}>
                      <FranchiseDashboard />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/franchise/dashboard"
                  element={<Navigate to="/franchise-dashboard" replace />}
                />
                <Route
                  path="/admin/franchise/templates"
                  element={
                    <RoleGate roles={['admin']}>
                      <FranchiseTemplates />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/franchise/transfers"
                  element={
                    <RoleGate roles={['admin']}>
                      <FranchiseTransfers />
                    </RoleGate>
                  }
                />

                <Route
                  path="/admin/developer-hub"
                  element={
                    <RoleGate roles={['admin']}>
                      <DeveloperHub />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/anatomical-model"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <AnatomicalModelEditor />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <UsersManagement />
                    </RoleGate>
                  }
                />
                <Route
                  path="/admin/logs"
                  element={
                    <RoleGate roles={['admin', 'manager']}>
                      <AccessLogs />
                    </RoleGate>
                  }
                />
              </Route>

              <Route path="/pending-approval" element={<PendingApproval />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
