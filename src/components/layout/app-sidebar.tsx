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

type NavItem = {
  title: string
  icon: any
  url: string
  roles: string[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const role = user?.role || 'pending'

  const getDashUrl = () => {
    if (role === 'admin') return '/admin/dashboard'
    if (role === 'manager') return '/manager/dashboard'
    if (role === 'professional') return '/professional/dashboard'
    if (role === 'receptionist') return '/reception/dashboard'
    if (role === 'patient') return '/patient-portal'
    return '/pending-role'
  }

  const dashUrl = getDashUrl()

  const allGroups: NavGroup[] = [
    {
      label: 'Principal',
      items: [
        { title: 'Meu Portal', icon: LayoutDashboard, url: '/patient-portal', roles: ['patient'] },
        {
          title: 'Dashboard',
          icon: LayoutDashboard,
          url: dashUrl,
          roles: ['admin', 'manager', 'professional', 'receptionist'],
        },
        {
          title: 'Agenda',
          icon: CalendarDays,
          url: '/agenda',
          roles: ['admin', 'manager', 'professional', 'receptionist'],
        },
        {
          title: 'Pacientes',
          icon: Users,
          url: '/pacientes',
          roles: ['admin', 'manager', 'professional', 'receptionist'],
        },
        {
          title: 'Prontuários',
          icon: Activity,
          url: '/records',
          roles: ['admin', 'manager', 'professional'],
        },
      ],
    },
    {
      label: 'Estoque',
      items: [
        {
          title: 'Uso Rápido',
          icon: Zap,
          url: '/inventory/usage/quick',
          roles: ['admin', 'manager', 'professional'],
        },
        {
          title: 'Gestão de Estoque',
          icon: Package,
          url: '/inventory',
          roles: ['admin', 'manager'],
        },
        {
          title: 'Ordens de Compra',
          icon: ShoppingCart,
          url: '/inventory/orders',
          roles: ['admin', 'manager'],
        },
        {
          title: 'Fornecedores',
          icon: Building2,
          url: '/inventory/suppliers',
          roles: ['admin', 'manager'],
        },
      ],
    },
    {
      label: 'Financeiro',
      items: [
        { title: 'Visão Geral', icon: DollarSign, url: '/financeiro', roles: ['admin', 'manager'] },
        {
          title: 'Meu Financeiro',
          icon: DollarSign,
          url: '/professional/finance',
          roles: ['professional'],
        },
        { title: 'Convênios', icon: ShieldPlus, url: '/insurance', roles: ['admin', 'manager'] },
      ],
    },
    {
      label: 'Análise',
      items: [
        {
          title: 'Relatórios',
          icon: BarChart3,
          url: '/reports',
          roles: ['admin', 'manager', 'professional'],
        },
        {
          title: 'Comparativo',
          icon: Building2,
          url: '/dashboard/units-comparison',
          roles: ['admin'],
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          title: 'Manual do Usuário',
          icon: BookOpen,
          url: '/manual',
          roles: ['admin', 'manager', 'professional', 'receptionist'],
        },
      ],
    },
    {
      label: 'Administração',
      items: [
        {
          title: 'Gestão de Usuários',
          icon: Users,
          url: '/admin/users',
          roles: ['admin', 'manager'],
        },
        {
          title: 'Logs de Acesso',
          icon: ShieldPlus,
          url: '/admin/logs',
          roles: ['admin', 'manager'],
        },
        {
          title: 'Configurações Gerais',
          icon: Settings,
          url: '/settings',
          roles: ['admin', 'manager'],
        },
        {
          title: 'Franquia - Unidades',
          icon: Building2,
          url: '/admin/franchise',
          roles: ['admin'],
        },
        {
          title: 'Franquia - Dashboard',
          icon: BarChart3,
          url: '/franchise-dashboard',
          roles: ['admin'],
        },
        {
          title: 'Franquia - Templates',
          icon: FileText,
          url: '/admin/franchise/templates',
          roles: ['admin'],
        },
        {
          title: 'Franquia - Transf.',
          icon: ArrowRightLeft,
          url: '/admin/franchise/transfers',
          roles: ['admin'],
        },
        {
          title: 'Auditoria de Sistema',
          icon: Activity,
          url: '/settings/audit-history',
          roles: ['admin'],
        },
        {
          title: 'Auditoria de Assin.',
          icon: PenLine,
          url: '/settings/signature-audit',
          roles: ['admin'],
        },
        {
          title: 'Modelo Anatômico',
          icon: Activity,
          url: '/admin/anatomical-model',
          roles: ['admin', 'manager'],
        },
      ],
    },
  ]

  // Filter groups and items based on role
  const visibleGroups = allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)

  // Find best matching active URL for nested routes
  const activeItemUrl = visibleGroups
    .flatMap((g) => g.items)
    .filter(
      (item) => location.pathname === item.url || location.pathname.startsWith(`${item.url}/`),
    )
    .sort((a, b) => b.url.length - a.url.length)[0]?.url

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
      <SidebarContent className="px-3 gap-4 pb-4">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = activeItemUrl === item.url

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
        ))}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="rounded-xl bg-muted/50 p-4 border border-border/50">
          <p className="text-xs font-semibold text-foreground mb-1">SpineCare OS</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {role === 'pending' ? 'Carregando...' : `Papel: ${role}`}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
