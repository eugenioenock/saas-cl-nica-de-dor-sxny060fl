import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, DollarSign, Activity, AlertTriangle, Plus, Megaphone } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function FranchiseDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    totalRevenue: number
    totalAppointments: number
    chartData: any[]
  }>({ totalRevenue: 0, totalAppointments: 0, chartData: [] })

  const [alerts, setAlerts] = useState<any[]>([])
  const [clinicsList, setClinicsList] = useState<any[]>([])

  const [newsOpen, setNewsOpen] = useState(false)
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    priority: 'medium',
    clinic_id: '',
  })
  const [isSendingNews, setIsSendingNews] = useState(false)

  const loadData = async () => {
    try {
      const [clinics, finances, appointments, logs] = await Promise.all([
        pb.collection('clinic_settings').getFullList(),
        pb.collection('consultations_finance').getFullList({ filter: `status = 'paid'` }),
        pb.collection('appointments').getFullList(),
        pb
          .collection('action_logs')
          .getFullList({
            filter: `action = 'performance_alert'`,
            sort: '-created',
            expand: 'clinic_id',
          }),
      ])
      setClinicsList(clinics)
      setAlerts(logs)

      const revenueByClinic: Record<string, number> = {}
      const apptsByClinic: Record<string, number> = {}

      clinics.forEach((c) => {
        revenueByClinic[c.id] = 0
        apptsByClinic[c.id] = 0
      })

      let totalRevenue = 0
      finances.forEach((f) => {
        if (f.clinic_id && revenueByClinic[f.clinic_id] !== undefined) {
          revenueByClinic[f.clinic_id] += f.amount
          totalRevenue += f.amount
        }
      })

      let totalAppointments = appointments.length
      appointments.forEach((a) => {
        if (a.clinic_id && apptsByClinic[a.clinic_id] !== undefined) apptsByClinic[a.clinic_id] += 1
      })

      const chartData = clinics.map((c) => ({
        name: c.name,
        revenue: revenueByClinic[c.id],
        appointments: apptsByClinic[c.id],
      }))
      setData({ totalRevenue, totalAppointments, chartData })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSendNews = async () => {
    setIsSendingNews(true)
    try {
      await pb.collection('announcements').create({
        title: newsForm.title,
        content: newsForm.content,
        priority: newsForm.priority,
        clinic_id: newsForm.clinic_id || null,
      })
      toast({ title: 'Comunicado enviado para a rede com sucesso!' })
      setNewsOpen(false)
      setNewsForm({ title: '', content: '', priority: 'medium', clinic_id: '' })
    } catch (e) {
      toast({ title: 'Erro ao enviar comunicado', variant: 'destructive' })
    } finally {
      setIsSendingNews(false)
    }
  }

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Master Dashboard da Franquia
        </h1>
        <p className="text-muted-foreground">Visão consolidada e controle das unidades da rede.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total da Franquia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? '...'
                : `R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume de Atendimentos Geral</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.totalAppointments}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance por Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ChartContainer
                config={{
                  revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-1))' },
                  appointments: { label: 'Atendimentos', color: 'hsl(var(--chart-2))' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      radius={[4, 4, 0, 0]}
                      name="Receita (R$)"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="appointments"
                      fill="var(--color-appointments)"
                      radius={[4, 4, 0, 0]}
                      name="Atendimentos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Alertas Automáticos
            </CardTitle>
            <CardDescription>
              Monitoramento de performance com quedas detectadas no mês
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum alerta de performance registrado recentemente.
              </p>
            ) : (
              alerts.map((a) => (
                <Alert
                  key={a.id}
                  variant="destructive"
                  className="bg-destructive/10 border-destructive/20"
                >
                  <AlertTitle className="font-semibold">
                    {a.expand?.clinic_id?.name || 'Unidade Desconhecida'}
                  </AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {a.details?.message}. Caiu de R${a.details?.previous_revenue} para R$
                    {a.details?.current_revenue}.
                    <div className="text-xs mt-2 opacity-70">
                      {new Date(a.created).toLocaleString()}
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" /> Comunicados da Rede
              </CardTitle>
              <CardDescription>Envie avisos para os portais dos gestores</CardDescription>
            </div>
            <Dialog open={newsOpen} onOpenChange={setNewsOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Novo Aviso
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publicar Comunicado</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label>Título do Comunicado</Label>
                    <Input
                      value={newsForm.title}
                      onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                      placeholder="Ex: Nova Tabela de Preços"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mensagem</Label>
                    <Textarea
                      value={newsForm.content}
                      onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                      placeholder="Detalhes do aviso..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={newsForm.priority}
                        onValueChange={(v) => setNewsForm({ ...newsForm, priority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Unidade (Deixe em branco para Todas)</Label>
                      <Select
                        value={newsForm.clinic_id}
                        onValueChange={(v) =>
                          setNewsForm({ ...newsForm, clinic_id: v === 'all' ? '' : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as Unidades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Unidades</SelectItem>
                          {clinicsList.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={isSendingNews || !newsForm.title || !newsForm.content}
                    onClick={handleSendNews}
                  >
                    Enviar Comunicado
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg border border-dashed">
              Use o botão acima para publicar informativos e diretrizes que aparecerão
              instantaneamente no "Portal do Gestor" das unidades selecionadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
