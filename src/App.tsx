import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import { Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Loader2 } from 'lucide-react'

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

const RouteDispatcher = () => {
  const { user } = useAuth()
  if (user?.role === 'patient' || user?.role === 'manager') return <Navigate to="/portal" replace />
  return <Navigate to="/dashboard" replace />
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
                <Route path="/dashboard" element={<Index />} />
                <Route path="/dashboard/matrix" element={<MatrixDashboard />} />
                <Route path="/dashboard/units-comparison" element={<UnitsComparison />} />
                <Route path="/portal" element={<Portal />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/pacientes" element={<Patients />} />
                <Route path="/pacientes/:id" element={<PatientRecord />} />
                <Route path="/records" element={<RecordsRedirect />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/orders" element={<Orders />} />
                <Route path="/inventory/usage/quick" element={<QuickUsage />} />
                <Route path="/inventory/suppliers" element={<Suppliers />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/insurance" element={<Insurance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/performance" element={<ReportsPerformance />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/integrations" element={<Integrations />} />
                <Route path="/settings/audit-history" element={<AuditHistory />} />
                <Route path="/settings/signature-audit" element={<SignatureAudit />} />
                <Route path="/settings/access-control" element={<SettingsAccessControl />} />
                <Route path="/settings/reports" element={<SettingsReports />} />
                <Route path="/settings/maintenance" element={<SettingsMaintenance />} />
                <Route
                  path="/settings/maintenance/migration"
                  element={<SettingsMaintenanceMigration />}
                />
                <Route path="/professional/finance" element={<ProfessionalFinance />} />
                <Route path="/admin/franchise" element={<FranchiseManagement />} />
                <Route path="/franchise-dashboard" element={<FranchiseDashboard />} />
                <Route
                  path="/admin/franchise/dashboard"
                  element={<Navigate to="/franchise-dashboard" replace />}
                />
                <Route path="/admin/franchise/templates" element={<FranchiseTemplates />} />
                <Route path="/admin/franchise/transfers" element={<FranchiseTransfers />} />
                <Route path="/admin/developer-hub" element={<DeveloperHub />} />
                <Route path="/admin/anatomical-model" element={<AnatomicalModelEditor />} />
                <Route path="/admin/users" element={<UsersManagement />} />
                <Route path="/admin/logs" element={<AccessLogs />} />
                <Route path="/manual" element={<Manual />} />
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
