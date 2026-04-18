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
]

const patientNavItems = [{ title: 'Meu Portal', icon: LayoutDashboard, url: '/portal' }]

const settingsItems = [{ title: 'Configurações', icon: Settings, url: '/settings' }]

export function AppSidebar() {
  const location = useLocation()
  const { user } = useAuth()
  const isPatient = user?.role === 'patient'
  const navItems = isPatient ? patientNavItems : adminNavItems

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
        {!isPatient && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
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
                ))}
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
