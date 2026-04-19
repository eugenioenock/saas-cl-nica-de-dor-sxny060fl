import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { searchPatients, type Patient } from '@/services/patients'
import { useDebounce } from '@/hooks/use-debounce'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'

export function AppHeader() {
  const { activeClinic, activeFranchise, currentUser, clinics, setActiveClinic } = useAppContext()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const debouncedQuery = useDebounce(query, 300)
  const { theme, setTheme } = useTheme()

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
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
      <SidebarTrigger className="flex md:hidden" />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="hidden items-center gap-2 text-sm font-medium md:flex">
          <SidebarTrigger className="mr-2" />
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{activeFranchise.name}</span>
          <span className="text-muted-foreground">/</span>
          {clinics.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 px-2 font-semibold">
                  {activeClinic?.name || 'Carregando...'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Selecionar Unidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {clinics.map((clinic) => (
                  <DropdownMenuItem
                    key={clinic.id}
                    onClick={() => setActiveClinic(clinic.id)}
                    className={clinic.id === activeClinic?.id ? 'bg-accent' : ''}
                  >
                    {clinic.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="h-8 flex items-center px-2 font-semibold">
              {activeClinic?.name || 'Carregando...'}
            </span>
          )}
        </div>

        <div className="flex w-full max-w-sm items-center gap-2 md:ml-auto">
          <Button
            variant="outline"
            className="relative h-10 md:h-9 w-full justify-start rounded-full bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-[300px]"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Buscar paciente...</span>
            <span className="inline-flex lg:hidden">Buscar...</span>
            <kbd className="pointer-events-none absolute right-2.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <CommandDialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen)
              if (!isOpen) setQuery('')
            }}
          >
            <CommandInput
              placeholder="Buscar por nome ou CPF..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.length >= 2 && !isLoading && results.length === 0 && (
                <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
              )}
              {query.length < 2 && (
                <CommandEmpty>Digite pelo menos 2 caracteres para buscar.</CommandEmpty>
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
                      className="flex cursor-pointer items-center gap-2 p-3 md:p-2"
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

        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-2 flex h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background animate-pulse"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px] md:w-[380px]">
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
                <div className="max-h-[350px] overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex flex-col items-start px-4 py-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex justify-between w-full items-start mb-1">
                        <span className="font-medium text-sm pr-2 text-foreground">{n.title}</span>
                        <Badge variant="outline" className="text-[10px] uppercase bg-primary/5">
                          {n.type === 'bonus_tier'
                            ? 'Conquista'
                            : n.type === 'performance_insight'
                              ? 'Insight'
                              : 'Alerta'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 mt-2">
                        {new Date(n.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8 md:h-9 md:w-9 border border-border/50 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{currentUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground mt-0.5">
                    {currentUser.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="py-2.5">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 py-2.5">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
