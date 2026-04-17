import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Appointment, mockUsers } from '@/lib/data'
import { useAppContext } from '@/hooks/use-app-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  professionalId: z.string().min(1, 'O profissional é obrigatório'),
  procedure: z.string().min(1, 'A descrição é obrigatória'),
})

type FormValues = z.infer<typeof formSchema>

interface ProcedureModalProps {
  patientId: string
  onAdd: (procedure: Appointment) => void
}

export function ProcedureModal({ patientId, onAdd }: ProcedureModalProps) {
  const [open, setOpen] = useState(false)
  const { activeClinic, currentUser } = useAppContext()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      professionalId: currentUser.id,
      procedure: '',
    },
  })

  function onSubmit(values: FormValues) {
    const newProcedure: Appointment = {
      id: `new-${Date.now()}`,
      clinicId: activeClinic.id,
      patientId,
      date: new Date(values.date).toISOString(),
      status: 'completed',
      procedure: values.procedure,
      professionalId: values.professionalId,
    }

    onAdd(newProcedure)
    setOpen(false)
    form.reset()

    toast.success('Procedimento adicionado com sucesso', {
      description:
        'Nota: Os dados estão em memória e serão perdidos ao recarregar a página até a integração com o banco.',
    })
  }

  const professionals = mockUsers.filter((u) => u.clinicId === activeClinic.id)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Procedimento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Novo Procedimento</DialogTitle>
          <DialogDescription>
            Adicione um novo registro ao histórico. Os dados não serão salvos permanentemente nesta
            versão.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="professionalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional Responsável</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="procedure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Procedimento</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o procedimento realizado, medicamentos utilizados, etc..."
                      className="min-h-[100px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full sm:w-auto">
                Salvar Registro
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
