import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Search, Bell, User, Loader2 } from 'lucide-react'
import { useAppContext } from '@/hooks/use-app-context'
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

export function AppHeader() {
  const { activeClinic, activeFranchise, currentUser, clinics, setActiveClinic } = useAppContext()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

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

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background px-6 shadow-sm">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="hidden items-center gap-2 text-sm font-medium md:flex">
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
            className="relative h-9 w-full justify-start rounded-full bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-[300px]"
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
                      className="flex cursor-pointer items-center gap-2 p-2"
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

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {currentUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{currentUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {currentUser.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
