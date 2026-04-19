import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Activity,
  Package,
  DollarSign,
  Settings,
  Stethoscope,
  BarChart3,
  ShieldPlus,
  ShoppingCart,
  Zap,
  Plug,
  Building2,
  FileText,
  ArrowRightLeft,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

const adminNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { title: 'Agenda', icon: CalendarDays, url: '/agenda' },
  { title: 'Pacientes', icon: Users, url: '/pacientes' },
  { title: 'Prontuários', icon: Activity, url: '/records' },
  { title: 'Estoque', icon: Package, url: '/inventory' },
  { title: 'Ordens de Compra', icon: ShoppingCart, url: '/inventory/orders' },
  { title: 'Uso Rápido', icon: Zap, url: '/inventory/usage/quick' },
  { title: 'Financeiro', icon: DollarSign, url: '/financeiro' },
  { title: 'Convênios', icon: ShieldPlus, url: '/insurance' },
  { title: 'Relatórios', icon: BarChart3, url: '/reports' },
  { title: 'Comparativo', icon: Building2, url: '/dashboard/units-comparison' },
]

const patientNavItems = [{ title: 'Meu Portal', icon: LayoutDashboard, url: '/portal' }]

const settingsItems: { title: string; icon: any; url: string; adminOnly?: boolean }[] = [
  { title: 'Configurações', icon: Settings, url: '/settings' },
  { title: 'Franquia - Unidades', icon: Building2, url: '/admin/franchise', adminOnly: true },
  {
    title: 'Franquia - Dashboard',
    icon: BarChart3,
    url: '/franchise-dashboard',
    adminOnly: true,
  },
  {
    title: 'Franquia - Templates',
    icon: FileText,
    url: '/admin/franchise/templates',
    adminOnly: true,
  },
  {
    title: 'Franquia - Transf.',
    icon: ArrowRightLeft,
    url: '/admin/franchise/transfers',
    adminOnly: true,
  },
  { title: 'Integrações', icon: Plug, url: '/settings/integrations', adminOnly: true },
  { title: 'Auditoria', icon: Activity, url: '/settings/audit-history', adminOnly: true },
]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const isPatient = user?.role === 'patient'
  const navItems = isPatient
    ? patientNavItems
    : adminNavItems.filter((item) => {
        if (user?.role === 'admin' || user?.role === 'manager') return true
        if (user?.role === 'professional') {
          return ['/dashboard', '/agenda', '/pacientes', '/records', '/reports'].includes(item.url)
        }
        if (user?.role === 'receptionist') {
          return ['/dashboard', '/agenda', '/pacientes'].includes(item.url)
        }
        return false
      })

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="flex h-16 items-center justify-center border-b px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="truncate text-lg tracking-tight">SpineCare OS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      location.pathname === item.url ||
                      (location.pathname.startsWith(item.url) && item.url !== '/')
                    }
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {!isPatient && (user?.role === 'admin' || user?.role === 'manager') && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => {
                  if (item.adminOnly && user?.role !== 'admin') return null
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4 text-xs text-center text-muted-foreground">
        v0.0.1
      </SidebarFooter>
    </Sidebar>
  )
}
