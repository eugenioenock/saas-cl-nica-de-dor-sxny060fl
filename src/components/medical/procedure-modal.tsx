import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Appointment, mockUsers } from '@/lib/data'
import { useAppContext } from '@/hooks/use-app-context'
import pb from '@/lib/pocketbase/client'
import { MaterialUsageSelector, MaterialUsage } from './material-usage-selector'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  materials: z.array(z.any()).optional(),
  signature: z.string().optional(),
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
      signature: '',
    },
  })

  const hasHighCost = form.watch('materials')?.some((m: any) => m.isHighCost)

  async function onSubmit(values: FormValues) {
    if (hasHighCost && !values.signature) {
      toast.error('A assinatura digital é obrigatória para materiais de alto custo.')
      return
    }

    try {
      const appointment = await pb.collection('appointments').create({
        patient_id: patientId,
        professional_id: values.professionalId,
        start_time: new Date(values.date).toISOString(),
        end_time: new Date(new Date(values.date).getTime() + 30 * 60000).toISOString(),
        title: 'Procedimento Realizado',
        status: 'completed',
        notes: values.procedure,
        clinic_id: activeClinic?.id,
      })

      const materials = values.materials as MaterialUsage[] | undefined
      if (materials && materials.length > 0) {
        for (const mat of materials) {
          await pb.collection('inventory_usage').create({
            batch_id: mat.batchId,
            patient_id: patientId,
            appointment_id: appointment.id,
            quantity_used: mat.quantity,
            professional_id: values.professionalId,
            usage_date: new Date(values.date).toISOString(),
            is_verified: mat.isHighCost ? true : false,
            verified_at: mat.isHighCost ? new Date().toISOString() : null,
            signature_hash: mat.isHighCost
              ? btoa(values.signature + '-' + Date.now()).substring(0, 15)
              : '',
            clinic_id: activeClinic?.id,
          })
        }
      }

      const newProcedure: Appointment = {
        id: appointment.id,
        clinicId: activeClinic.id,
        patientId,
        date: appointment.start_time,
        status: 'completed',
        procedure: values.procedure,
        professionalId: values.professionalId,
      }

      onAdd(newProcedure)
      setOpen(false)
      form.reset()
      toast.success('Procedimento e materiais registrados com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar procedimento e materiais no banco de dados.')
    }
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
            <FormField
              control={form.control}
              name="materials"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MaterialUsageSelector value={field.value || []} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {hasHighCost && (
              <FormField
                control={form.control}
                name="signature"
                render={({ field }) => (
                  <FormItem className="bg-purple-50 p-3 rounded-md border border-purple-200">
                    <FormLabel className="text-purple-800">
                      Assinatura Digital (Alto Custo)
                    </FormLabel>
                    <FormDescription className="text-purple-600/80 text-xs">
                      Confirme o uso do material de alto custo digitando sua senha ou PIN.
                    </FormDescription>
                    <FormControl>
                      <Input type="password" placeholder="***" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
