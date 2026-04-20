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
  Building2,
  FileText,
  ArrowRightLeft,
  PenLine,
  BookOpen,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const adminNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { title: 'Agenda', icon: CalendarDays, url: '/agenda' },
  { title: 'Pacientes', icon: Users, url: '/pacientes' },
  { title: 'Prontuários', icon: Activity, url: '/records' },
  { title: 'Estoque', icon: Package, url: '/inventory' },
  { title: 'Ordens de Compra', icon: ShoppingCart, url: '/inventory/orders' },
  { title: 'Fornecedores', icon: Building2, url: '/inventory/suppliers' },
  { title: 'Uso Rápido', icon: Zap, url: '/inventory/usage/quick' },
  { title: 'Financeiro', icon: DollarSign, url: '/financeiro' },
  { title: 'Meu Financeiro', icon: DollarSign, url: '/professional/finance' },
  { title: 'Convênios', icon: ShieldPlus, url: '/insurance' },
  { title: 'Relatórios', icon: BarChart3, url: '/reports' },
  { title: 'Comparativo', icon: Building2, url: '/dashboard/units-comparison' },
  { title: 'Manual', icon: BookOpen, url: '/manual' },
]

const patientNavItems = [{ title: 'Meu Portal', icon: LayoutDashboard, url: '/portal' }]

const settingsItems: {
  title: string
  icon: any
  url: string
  adminOnly?: boolean
  managerAllowed?: boolean
}[] = [
  {
    title: 'Gestão de Usuários',
    icon: Users,
    url: '/admin/users',
    adminOnly: true,
    managerAllowed: true,
  },
  {
    title: 'Logs de Acesso',
    icon: ShieldPlus,
    url: '/admin/logs',
    adminOnly: true,
    managerAllowed: true,
  },
  { title: 'Configurações Gerais', icon: Settings, url: '/settings' },
  { title: 'Franquia - Unidades', icon: Building2, url: '/admin/franchise', adminOnly: true },
  { title: 'Franquia - Dashboard', icon: BarChart3, url: '/franchise-dashboard', adminOnly: true },
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
  {
    title: 'Auditoria de Sistema',
    icon: Activity,
    url: '/settings/audit-history',
    adminOnly: true,
  },
  {
    title: 'Auditoria de Assin.',
    icon: PenLine,
    url: '/settings/signature-audit',
    adminOnly: true,
  },
  { title: 'Modelo Anatômico', icon: Activity, url: '/admin/anatomical-model', adminOnly: false },
]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const isPatient = user?.role === 'patient'
  const navItems = isPatient
    ? patientNavItems
    : adminNavItems.filter((item) => {
        if (user?.role === 'admin' || user?.role === 'manager') {
          return item.url !== '/professional/finance'
        }
        if (user?.role === 'professional') {
          return [
            '/dashboard',
            '/agenda',
            '/pacientes',
            '/records',
            '/reports',
            '/professional/finance',
            '/manual',
          ].includes(item.url)
        }
        if (user?.role === 'receptionist') {
          return ['/dashboard', '/agenda', '/pacientes', '/manual'].includes(item.url)
        }
        return false
      })

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarHeader className="h-16 px-6 flex items-center pt-2">
        <Link
          to="/"
          className="flex items-center gap-3 font-bold text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="h-4 w-4" />
          </div>
          <span className="truncate text-lg tracking-tight">SpineCare</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 gap-0">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.url ||
                  (location.pathname.startsWith(item.url) && item.url !== '/')
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isPatient && (user?.role === 'admin' || user?.role === 'manager') && (
          <SidebarGroup className="mt-6">
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => {
                  if (
                    item.adminOnly &&
                    user?.role !== 'admin' &&
                    !(item.managerAllowed && user?.role === 'manager')
                  )
                    return null
                  const isActive = location.pathname === item.url
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`rounded-lg transition-colors mb-1 ${
                          isActive
                            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="h-4 w-4" />
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
      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
          <p className="text-xs font-semibold text-foreground mb-1">SpineCare OS</p>
          <p className="text-[10px] text-muted-foreground">Versão 0.0.1 • Uplane Design</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
