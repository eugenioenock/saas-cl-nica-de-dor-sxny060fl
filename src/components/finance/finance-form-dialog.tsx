import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export function FinanceFormDialog({ patients, plans }: { patients: any[]; plans: any[] }) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [medicalNotes, setMedicalNotes] = useState<any[]>([])

  const initialForm = {
    patient_id: '',
    medical_note_id: '',
    amount: '',
    status: 'pending',
    payment_method: 'pix',
    due_date: '',
    billing_type: 'private',
    insurance_plan_id: '',
  }
  const [formData, setFormData] = useState(initialForm)

  useEffect(() => {
    if (formData.patient_id) {
      pb.collection('medical_notes')
        .getFullList({
          filter: `patient_id = "${formData.patient_id}"`,
          sort: '-created',
        })
        .then(setMedicalNotes)
        .catch(console.error)
    } else {
      setMedicalNotes([])
      setFormData((prev) => ({ ...prev, medical_note_id: '' }))
    }
  }, [formData.patient_id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    let hasErrors = false
    const newErrors: Record<string, string> = {}

    if (!formData.patient_id) {
      newErrors.patient_id = 'Paciente é obrigatório'
      hasErrors = true
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor inválido'
      hasErrors = true
    }

    if (formData.billing_type === 'insurance' && !formData.insurance_plan_id) {
      newErrors.insurance_plan_id = 'Convênio é obrigatório'
      hasErrors = true
    }

    if (hasErrors) {
      setFieldErrors(newErrors)
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString().replace('T', ' ')
          : '',
        medical_note_id:
          formData.medical_note_id && formData.medical_note_id !== 'none'
            ? formData.medical_note_id
            : null,
        insurance_plan_id: formData.insurance_plan_id || null,
      }
      await pb.collection('consultations_finance').create(payload)
      setIsOpen(false)
      setFormData(initialForm)
      toast({ title: 'Registro financeiro salvo com sucesso.' })
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          setFormData(initialForm)
          setFieldErrors({})
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
          <DialogDescription>Adicione uma nova cobrança ou pagamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Paciente *</Label>
              <Select
                value={formData.patient_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, patient_id: v, medical_note_id: 'none' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.patient_id && (
                <span className="text-xs text-destructive">{fieldErrors.patient_id}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Procedimento / Evolução</Label>
              <Select
                value={formData.medical_note_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, medical_note_id: v })}
                disabled={!formData.patient_id}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !formData.patient_id
                        ? 'Selecione o paciente primeiro'
                        : medicalNotes.length === 0
                          ? 'Nenhum procedimento encontrado'
                          : 'Selecione um procedimento'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem procedimento vinculado</SelectItem>
                  {medicalNotes.map((note) => (
                    <SelectItem key={note.id} value={note.id}>
                      {new Date(note.date || note.created).toLocaleDateString()} -{' '}
                      {note.content ? note.content.substring(0, 30) + '...' : 'Sem descrição'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.medical_note_id && (
                <span className="text-xs text-destructive">{fieldErrors.medical_note_id}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de Faturamento</Label>
              <Select
                value={formData.billing_type}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    billing_type: v,
                    payment_method: v === 'insurance' ? 'transfer' : 'pix',
                    insurance_plan_id: v === 'private' ? '' : formData.insurance_plan_id,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Particular</SelectItem>
                  <SelectItem value="insurance">Convênio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.billing_type === 'insurance' && (
              <div className="grid gap-2">
                <Label>Convênio *</Label>
                <Select
                  value={formData.insurance_plan_id}
                  onValueChange={(v) => setFormData({ ...formData, insurance_plan_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.insurance_plan_id && (
                  <span className="text-xs text-destructive">{fieldErrors.insurance_plan_id}</span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
              {fieldErrors.amount && (
                <span className="text-xs text-destructive">{fieldErrors.amount}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="glosa">Glosa (Rejeitado)</SelectItem>
                  <SelectItem value="transfer_pending">Repasse Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Método de Pagamento</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Lançamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
