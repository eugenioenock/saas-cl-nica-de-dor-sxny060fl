import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Building2, Search, Bell, User, Loader2, CheckCheck, Moon, Sun } from 'lucide-react'
import { useAppContext } from '@/hooks/use-app-context'
import { useTheme } from '@/components/theme-provider'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { searchPatients, type Patient } from '@/services/patients'
import { useDebounce } from '@/hooks/use-debounce'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'

const routeMap: Record<string, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  records: 'Prontuários',
  inventory: 'Estoque',
  orders: 'Ordens de Compra',
  usage: 'Uso de Estoque',
  financeiro: 'Financeiro',
  insurance: 'Convênios',
  reports: 'Relatórios',
  settings: 'Configurações',
  portal: 'Meu Portal',
}

export function AppHeader() {
  const { activeClinic, activeFranchise, currentUser, clinics, setActiveClinic } = useAppContext()
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const debouncedQuery = useDebounce(query, 300)
  const { theme, setTheme } = useTheme()

  const pathnames = location.pathname.split('/').filter((x) => x)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (!currentUser?.id) return
    pb.collection('notifications')
      .getList(1, 20, {
        filter: `is_read = false && user_id = "${currentUser.id}"`,
        sort: '-created',
      })
      .then((res) => setNotifications(res.items))
      .catch(console.error)
  }, [currentUser?.id])

  useRealtime('notifications', (e) => {
    if (!currentUser?.id) return
    if (e.action === 'create' && e.record.user_id === currentUser.id) {
      setNotifications((prev) => [e.record, ...prev])
    } else if (e.action === 'update' && e.record.user_id === currentUser.id) {
      if (e.record.is_read) {
        setNotifications((prev) => prev.filter((n) => n.id !== e.record.id))
      }
    }
  })

  useEffect(() => {
    async function performSearch() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }
      setIsLoading(true)
      try {
        const data = await searchPatients(debouncedQuery, activeClinic?.id)
        setResults(data.items)
      } catch (error) {
        console.error('Failed to search patients', error)
      } finally {
        setIsLoading(false)
      }
    }
    performSearch()
  }, [debouncedQuery])

  const handleSelect = (patientId: string) => {
    setOpen(false)
    setQuery('')
    navigate(`/pacientes/${patientId}`)
  }

  const markAsRead = async (id: string) => {
    try {
      await pb.collection('notifications').update(id, { is_read: true })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await Promise.all(
        notifications.map((n) => pb.collection('notifications').update(n.id, { is_read: true })),
      )
      setNotifications([])
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathnames.map((name, index) => {
              const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`
              const isLast = index === pathnames.length - 1
              const title = routeMap[name] || name.charAt(0).toUpperCase() + name.slice(1)
              return (
                <div key={name} className="flex items-center">
                  <BreadcrumbSeparator className="mx-2" />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={routeTo}>{title}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
        {clinics.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="hidden md:flex h-9 rounded-full bg-muted/50 border-border/50 text-muted-foreground font-medium"
              >
                <Building2 className="h-4 w-4 mr-2" />
                <span className="truncate max-w-[150px]">{activeClinic?.name || 'Unidade'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Selecionar Unidade</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {clinics.map((clinic) => (
                <DropdownMenuItem
                  key={clinic.id}
                  onClick={() => setActiveClinic(clinic.id)}
                  className={
                    clinic.id === activeClinic?.id ? 'bg-primary/10 text-primary font-medium' : ''
                  }
                >
                  {clinic.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="w-full max-w-[200px] md:max-w-sm">
          <Button
            variant="outline"
            className="relative h-9 w-full justify-start rounded-full bg-muted/50 text-sm font-normal text-muted-foreground shadow-none"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Buscar paciente...</span>
            <span className="inline-flex lg:hidden">Buscar...</span>
            <kbd className="pointer-events-none absolute right-2.5 top-2 hidden h-5 select-none items-center gap-1 rounded-full border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
              placeholder="Buscar por nome ou CPF..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.length >= 2 && !isLoading && results.length === 0 && (
                <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
              )}
              {isLoading && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && results.length > 0 && (
                <CommandGroup heading="Pacientes">
                  {results.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={`${patient.name} ${patient.document || ''} ${patient.id}`}
                      onSelect={() => handleSelect(patient.id)}
                      className="flex cursor-pointer items-center gap-2 p-3"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{patient.name}</span>
                        {patient.document && (
                          <span className="text-xs text-muted-foreground">
                            CPF: {patient.document}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </CommandDialog>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-9 w-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 relative">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1.5 flex h-2 w-2 rounded-full bg-primary border border-background animate-pulse"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] md:w-[380px] rounded-2xl">
            <DropdownMenuLabel className="flex justify-between items-center px-4 py-3">
              <span className="font-semibold text-base">Notificações</span>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-auto p-1 text-xs text-muted-foreground"
                >
                  <CheckCheck className="h-4 w-4 mr-1" /> Ler todas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação nova.
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col items-start px-3 py-3 rounded-xl border border-transparent hover:bg-muted/50 hover:border-border/50 cursor-pointer transition-all"
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="flex justify-between w-full items-start mb-1">
                      <span className="font-medium text-sm pr-2 text-foreground">{n.title}</span>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {n.type === 'bonus_tier'
                          ? 'Conquista'
                          : n.type === 'performance_insight'
                            ? 'Insight'
                            : 'Alerta'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
              <Avatar className="h-9 w-9 border border-border shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {currentUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl">
            <DropdownMenuLabel className="p-3">
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{currentUser.name}</span>
                <span className="text-xs font-normal text-muted-foreground mt-0.5 capitalize">
                  {currentUser.role}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2.5 cursor-pointer rounded-lg mx-1">
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 py-2.5 cursor-pointer rounded-lg mx-1">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
