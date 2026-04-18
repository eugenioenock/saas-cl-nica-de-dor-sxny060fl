import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, Printer } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Finance() {
  const { toast } = useToast()
  const [finances, setFinances] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [clinicSettings, setClinicSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [receiptRecord, setReceiptRecord] = useState<any>(null)
  const [insurancePlans, setInsurancePlans] = useState<any[]>([])
  const [formData, setFormData] = useState({
    patient_id: '',
    amount: '',
    status: 'pending',
    payment_method: 'pix',
    due_date: '',
    billing_type: 'private',
    insurance_plan_id: '',
  })

  const loadData = async () => {
    try {
      const records = await pb.collection('consultations_finance').getFullList({
        sort: '-created',
        expand: 'patient_id,insurance_plan_id',
      })
      setFinances(records)
      const [pts, plans, settings] = await Promise.all([
        pb.collection('patients').getFullList({ sort: 'name' }),
        pb.collection('insurance_plans').getFullList({ sort: 'name', filter: 'active=true' }),
        pb
          .collection('clinic_settings')
          .getList(1, 1)
          .catch(() => null),
      ])
      setPatients(pts)
      setInsurancePlans(plans)
      if (settings?.items.length) setClinicSettings(settings.items[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('consultations_finance', loadData)
  useRealtime('patients', loadData)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString().replace('T', ' ')
          : '',
      }
      await pb.collection('consultations_finance').create(payload)
      setIsOpen(false)
      setFormData({
        patient_id: '',
        amount: '',
        status: 'pending',
        payment_method: 'pix',
        due_date: '',
        billing_type: 'private',
        insurance_plan_id: '',
      })
      toast({ title: 'Registro financeiro salvo com sucesso.' })
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrintReceipt = (record: any) => {
    setReceiptRecord(record)
    setTimeout(() => {
      window.print()
      setReceiptRecord(null)
    }, 200)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Pago</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>
      case 'glosa':
        return <Badge variant="destructive">Glosa</Badge>
      case 'transfer_pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Repasse Pend.
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <>
      <div className={cn('space-y-6', receiptRecord && 'print:hidden')}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Gerencie pagamentos e receitas da clínica.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Registro Financeiro</DialogTitle>
                <DialogDescription>Adicione uma nova cobrança ou pagamento.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="grid gap-4 py-4">
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
                      <Label>Convênio</Label>
                      <Select
                        value={formData.insurance_plan_id}
                        onValueChange={(v) => setFormData({ ...formData, insurance_plan_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {insurancePlans.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Paciente *</Label>
                  <Select
                    value={formData.patient_id}
                    onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
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
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : finances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  finances.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{new Date(f.created).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{f.expand?.patient_id?.name}</TableCell>
                      <TableCell>
                        {f.due_date ? new Date(f.due_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {f.billing_type === 'insurance' ? (
                          <div className="text-sm">
                            <span className="font-semibold text-blue-600">Convênio</span>
                            <div className="text-xs text-muted-foreground">
                              {f.expand?.insurance_plan_id?.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm capitalize">{f.payment_method}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(f.status)}
                          {f.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 print:hidden"
                              onClick={() => handlePrintReceipt(f)}
                              title="Gerar Recibo"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {f.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Print Receipt Section */}
      {receiptRecord && (
        <div className="hidden print:block w-full bg-white text-black p-8 font-sans max-w-3xl mx-auto">
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
            {clinicSettings?.logo ? (
              <img
                src={pb.files.getURL(clinicSettings, clinicSettings.logo)}
                alt="Clinic Logo"
                className="h-20 object-contain mx-auto mb-4"
              />
            ) : (
              <div className="text-4xl font-bold mb-2">
                {clinicSettings?.name || 'Clínica de Dor'}
              </div>
            )}
            <h1 className="text-2xl font-bold uppercase mb-2">Recibo de Pagamento</h1>
            <p className="text-gray-600">Nº {receiptRecord.id.toUpperCase()}</p>
          </div>

          <div className="mb-8 space-y-2 text-lg">
            <p>
              Recebemos de <strong>{receiptRecord.expand?.patient_id?.name}</strong>
              {receiptRecord.expand?.patient_id?.document && (
                <span> (Doc: {receiptRecord.expand?.patient_id?.document})</span>
              )}
              ,
            </p>
            <p>
              a importância de{' '}
              <strong>R$ {receiptRecord.amount.toFixed(2).replace('.', ',')}</strong>, referente a
              serviços prestados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-12 border border-gray-200 p-6 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Data do Pagamento</p>
              <p className="font-medium">{new Date(receiptRecord.updated).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Método de Pagamento</p>
              <p className="font-medium capitalize">{receiptRecord.payment_method}</p>
            </div>
            {clinicSettings?.address && (
              <div className="col-span-2 mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 uppercase font-semibold">Local</p>
                <p>{clinicSettings.address}</p>
              </div>
            )}
          </div>

          <div className="text-center mt-24">
            <div className="w-64 border-b border-black mx-auto mb-2"></div>
            <p className="font-bold">{clinicSettings?.name || 'Assinatura / Carimbo'}</p>
            {clinicSettings?.phone && <p className="text-sm mt-1">Tel: {clinicSettings.phone}</p>}
            {clinicSettings?.email && <p className="text-sm">{clinicSettings.email}</p>}
          </div>
        </div>
      )}
    </>
  )
}
