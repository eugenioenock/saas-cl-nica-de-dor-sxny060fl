import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { getPatients, type Patient } from '@/services/patients'
import { getUsers, type User } from '@/services/users'
import { useAuth } from '@/hooks/use-auth'
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type Appointment,
} from '@/services/appointments'

const formSchema = z
  .object({
    patient_id: z.string().min(1, 'Selecione um paciente'),
    professional_id: z.string().min(1, 'Selecione um profissional'),
    title: z.string().min(1, 'Título obrigatório'),
    date: z.string().min(1, 'Data obrigatória'),
    startTime: z.string().min(1, 'Início obrigatório'),
    endTime: z.string().min(1, 'Término obrigatório'),
    status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']),
    notes: z.string().optional(),
  })
  .refine(
    (data) => new Date(`${data.date}T${data.endTime}`) > new Date(`${data.date}T${data.startTime}`),
    {
      message: 'Término deve ser após o início',
      path: ['endTime'],
    },
  )

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  selectedDate: Date
  appointment?: Appointment
}

export function AppointmentSheet({ open, onOpenChange, selectedDate, appointment }: Props) {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [openCb, setOpenCb] = useState(false)
  const [openUserCb, setOpenUserCb] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) })

  useEffect(() => {
    if (open) {
      getPatients()
        .then(setPatients)
        .catch(() => {})
      getUsers()
        .then(setUsers)
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (appointment) {
      const s = new Date(appointment.start_time)
      const e = new Date(appointment.end_time)
      form.reset({
        patient_id: appointment.patient_id,
        professional_id: appointment.professional_id,
        title: appointment.title,
        date: format(s, 'yyyy-MM-dd'),
        startTime: format(s, 'HH:mm'),
        endTime: format(e, 'HH:mm'),
        status: appointment.status,
        notes: appointment.notes || '',
      })
    } else {
      form.reset({
        patient_id: '',
        professional_id: user?.id || '',
        title: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        status: 'scheduled',
        notes: '',
      })
    }
  }, [appointment, selectedDate, form, open, user])

  const onSubmit = async (v: z.infer<typeof formSchema>) => {
    setSaving(true)
    try {
      const payload = {
        patient_id: v.patient_id,
        professional_id: v.professional_id,
        title: v.title,
        status: v.status,
        notes: v.notes,
        start_time: new Date(`${v.date}T${v.startTime}`).toISOString(),
        end_time: new Date(`${v.date}T${v.endTime}`).toISOString(),
      }
      if (appointment) await updateAppointment(appointment.id, payload)
      else await createAppointment(payload)
      toast.success(appointment ? 'Agendamento atualizado' : 'Agendamento criado')
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao salvar agendamento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!appointment || !confirm('Deseja excluir este agendamento?')) return
    try {
      await deleteAppointment(appointment.id)
      toast.success('Agendamento excluído')
      onOpenChange(false)
    } catch (e) {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente</FormLabel>
                  <Popover open={openCb} onOpenChange={setOpenCb}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <span className="truncate">
                            {field.value
                              ? patients.find((p) => p.id === field.value)?.name
                              : 'Selecionar paciente'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar paciente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.name}
                                onSelect={() => {
                                  form.setValue('patient_id', p.id)
                                  setOpenCb(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    p.id === field.value ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {p.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professional_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Profissional</FormLabel>
                  <Popover open={openUserCb} onOpenChange={setOpenUserCb}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <span className="truncate">
                            {field.value
                              ? users.find((u) => u.id === field.value)?.name ||
                                users.find((u) => u.id === field.value)?.email
                              : 'Selecionar profissional'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar profissional..." />
                        <CommandList>
                          <CommandEmpty>Nenhum profissional encontrado.</CommandEmpty>
                          <CommandGroup>
                            {users.map((u) => (
                              <CommandItem
                                key={u.id}
                                value={u.name || u.email}
                                onSelect={() => {
                                  form.setValue('professional_id', u.id)
                                  setOpenUserCb(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    u.id === field.value ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {u.name || u.email}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Consulta de Rotina" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendado</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              {appointment ? (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Excluir
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
