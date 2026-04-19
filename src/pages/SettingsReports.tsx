import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Mail, Trash2, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

interface ReportSchedule {
  id: string
  name: string
  frequency: string
  recipients: string
  report_type: string
  is_active: boolean
  clinic_id: string
}

export default function SettingsReports() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<ReportSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'weekly',
    recipients: '',
    report_type: 'financial_summary',
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const records = await pb
        .collection('report_schedules')
        .getFullList<ReportSchedule>({ sort: '-created' })
      setSchedules(records)
    } catch (err) {
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const data = { ...formData, clinic_id: user?.clinic_id || '' }

      if (!data.clinic_id) {
        const clinics = await pb.collection('clinic_settings').getList(1, 1)
        if (clinics.items.length > 0) data.clinic_id = clinics.items[0].id
      }

      await pb.collection('report_schedules').create(data)
      toast.success('Agendamento criado com sucesso')
      setIsDialogOpen(false)
      setFormData({
        name: '',
        frequency: 'weekly',
        recipients: '',
        report_type: 'financial_summary',
        is_active: true,
      })
      loadData()
    } catch (err) {
      toast.error('Erro ao salvar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await pb.collection('report_schedules').update(id, { is_active: !current })
      setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s)))
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este agendamento?')) return
    try {
      await pb.collection('report_schedules').delete(id)
      setSchedules((prev) => prev.filter((s) => s.id !== id))
      toast.success('Agendamento removido')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  const reportTypeLabels: Record<string, string> = {
    financial_summary: 'Resumo Financeiro',
    inventory_audit: 'Auditoria de Estoque',
    clinical_performance: 'Performance Clínica',
  }

  const frequencyLabels: Record<string, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-8 w-8 text-primary" />
            Relatórios Automáticos
          </h1>
          <p className="text-muted-foreground">
            Configure o envio agendado de relatórios gerenciais para parceiros e contabilidade.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Agendamento de Relatório</DialogTitle>
              <DialogDescription>
                Configure os detalhes do relatório que será gerado e enviado por email
                automaticamente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Agendamento</Label>
                <Input
                  required
                  placeholder="Ex: Fechamento Semanal Contabilidade"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={(v) => setFormData({ ...formData, report_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial_summary">Resumo Financeiro</SelectItem>
                      <SelectItem value="inventory_audit">Auditoria de Estoque</SelectItem>
                      <SelectItem value="clinical_performance">Performance Clínica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emails Destinatários (separados por vírgula)</Label>
                <Input
                  required
                  type="text"
                  placeholder="contato@contabilidade.com, socio@clinica.com"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-4">
              <Mail className="h-12 w-12 opacity-20" />
              <p>Nenhum agendamento configurado.</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                Criar o primeiro
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo / Frequência</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <span>{reportTypeLabels[schedule.report_type]}</span>
                        <Badge variant="secondary" className="w-fit">
                          {frequencyLabels[schedule.frequency]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-sm text-muted-foreground"
                      title={schedule.recipients}
                    >
                      {schedule.recipients}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={() => toggleActive(schedule.id, schedule.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
