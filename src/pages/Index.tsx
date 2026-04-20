import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Users,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  Activity,
  TrendingUp,
  Package,
  ShieldCheck,
  Settings2,
  AlertTriangle,
} from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useRealtime } from '@/hooks/use-realtime'
import { ProfessionalRanking } from '@/components/dashboard/ProfessionalRanking'
import { PerformanceInsights } from '@/components/dashboard/performance-insights'
import { ClinicGamificationWidget } from '@/components/dashboard/ClinicGamificationWidget'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

interface DashboardData {
  appointmentsToday: number
  pendingNotes: number
  patientVolume: number
  totalRevenue: number
  pendingRevenue: number
  lowStock: number
}

interface DashboardSettings {
  appointments: boolean
  patients: boolean
  revenue: boolean
  pendingRevenue: boolean
  financialChart: boolean
  clinicalChart: boolean
}

export default function Index() {
  const { user } = useAuth()
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([])
  const [data, setData] = useState<DashboardData>({
    appointmentsToday: 0,
    pendingNotes: 0,
    patientVolume: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    lowStock: 0,
  })
  const [loading, setLoading] = useState(true)

  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    appointments: true,
    patients: true,
    revenue: true,
    pendingRevenue: true,
    financialChart: true,
    clinicalChart: true,
  })

  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | 'month'>('7d')
  const [financialChartData, setFinancialChartData] = useState<any[]>([])
  const [clinicalChartData, setClinicalChartData] = useState<any[]>([])
  const [chartsLoading, setChartsLoading] = useState(false)

  const role = user?.role || 'professional'
  const isManager = role === 'manager' || role === 'admin'
  const isReceptionist = role === 'receptionist'
  const isProfessional = role === 'professional' || role === 'admin'

  useEffect(() => {
    if (isManager && user?.id) {
      pb.collection('notifications')
        .getList(1, 5, {
          filter: `type = 'system' && is_read = false && user_id = '${user.id}'`,
          sort: '-created',
        })
        .then((res) => setSecurityAlerts(res.items))
        .catch(console.error)
    }
  }, [isManager, user?.id])

  useRealtime('notifications', (e) => {
    if (
      isManager &&
      user?.id &&
      e.record.type === 'system' &&
      e.record.is_read === false &&
      e.record.user_id === user.id
    ) {
      if (e.action === 'create') {
        setSecurityAlerts((prev) => [e.record, ...prev].slice(0, 5))
      }
    }
  })

  useEffect(() => {
    if (user?.settings?.dashboard) {
      setDashboardSettings((prev) => ({ ...prev, ...user.settings.dashboard }))
    }
  }, [user?.settings?.dashboard])

  const saveDashboardSettings = async (newSettings: DashboardSettings) => {
    setDashboardSettings(newSettings)
    if (user?.id) {
      try {
        const currentSettings = user.settings || {}
        const updatedUser = await pb.collection('users').update(user.id, {
          settings: { ...currentSettings, dashboard: newSettings },
        })
        pb.authStore.save(pb.authStore.token, updatedUser)
      } catch (e) {
        console.error('Failed to save dashboard settings', e)
      }
    }
  }

  useEffect(() => {
    async function loadMetrics() {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().split('T')[0]

        let appointmentsToday = 0
        let pendingNotes = 0
        let patientVolume = 0
        let totalRevenue = 0
        let pendingRevenue = 0
        let lowStock = 0

        const promises = []

        if (isProfessional || isReceptionist) {
          promises.push(
            pb
              .collection('appointments')
              .getList(1, 1, {
                filter: `start_time >= "${todayStr} 00:00:00" && start_time <= "${todayStr} 23:59:59"`,
              })
              .then((r) => (appointmentsToday = r.totalItems)),
          )
        }

        if (isProfessional) {
          promises.push(
            pb
              .collection('medical_notes')
              .getList(1, 1, { filter: `is_signed = false || status = 'scheduled'` })
              .then((r) => (pendingNotes = r.totalItems)),
            pb
              .collection('patients')
              .getList(1, 1)
              .then((r) => (patientVolume = r.totalItems)),
          )
        }

        if (isManager || isReceptionist) {
          promises.push(
            pb
              .collection('consultations_finance')
              .getFullList()
              .then((records) => {
                records.forEach((r) => {
                  if (r.status === 'paid') totalRevenue += r.amount
                  if (r.status === 'pending') pendingRevenue += r.amount
                })
              }),
          )
        }

        if (isManager) {
          promises.push(
            pb
              .collection('clinical_inventory')
              .getList(1, 1, { filter: `current_quantity <= min_quantity` })
              .then((r) => (lowStock = r.totalItems)),
          )
        }

        await Promise.all(promises)

        setData({
          appointmentsToday,
          pendingNotes,
          patientVolume,
          totalRevenue,
          pendingRevenue,
          lowStock,
        })
      } catch (err) {
        console.error('Dashboard error', err)
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [role, isManager, isProfessional, isReceptionist])

  useEffect(() => {
    async function loadChartData() {
      if (!isManager && !isProfessional && !isReceptionist) return

      setChartsLoading(true)
      try {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setHours(23, 59, 59, 999)

        const startDate = new Date(now)
        if (chartPeriod === '7d') startDate.setDate(now.getDate() - 6)
        else if (chartPeriod === '30d') startDate.setDate(now.getDate() - 29)
        else if (chartPeriod === 'month') startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)

        const startStr = startDate.toISOString().replace('T', ' ')

        const promises = []

        if (isManager || isReceptionist) {
          promises.push(
            pb
              .collection('consultations_finance')
              .getFullList({
                filter: `created >= "${startStr}" && status = 'paid'`,
              })
              .then((records) => {
                const grouped = records.reduce(
                  (acc, r) => {
                    const d = new Date(r.created)
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    acc[dateStr] = (acc[dateStr] || 0) + r.amount
                    return acc
                  },
                  {} as Record<string, number>,
                )

                const data = []
                for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  data.push({
                    date: dateStr,
                    revenue: grouped[dateStr] || 0,
                  })
                }
                setFinancialChartData(data)
              }),
          )
        }

        if (isProfessional || isManager || isReceptionist) {
          promises.push(
            pb
              .collection('appointments')
              .getFullList({
                filter: `start_time >= "${startStr}" && status != 'cancelled'`,
              })
              .then((records) => {
                const grouped = records.reduce(
                  (acc, r) => {
                    const d = new Date(r.start_time)
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                    acc[dateStr] = (acc[dateStr] || 0) + 1
                    return acc
                  },
                  {} as Record<string, number>,
                )

                const data = []
                for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  data.push({
                    date: dateStr,
                    appointments: grouped[dateStr] || 0,
                  })
                }
                setClinicalChartData(data)
              }),
          )
        }

        await Promise.all(promises)
      } catch (err) {
        console.error('Charts error', err)
      } finally {
        setChartsLoading(false)
      }
    }
    loadChartData()
  }, [chartPeriod, isManager, isProfessional, isReceptionist])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up pb-8 max-w-7xl mx-auto px-4 md:px-0">
      {securityAlerts.length > 0 && (
        <div className="space-y-3 pt-4">
          {securityAlerts.map((alert) => (
            <Alert
              key={alert.id}
              variant="destructive"
              className="bg-destructive/10 border-destructive/20 text-destructive animate-fade-in"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                <span>{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 hover:bg-destructive/20 hover:text-destructive w-fit"
                  onClick={async () => {
                    try {
                      await pb.collection('notifications').update(alert.id, { is_read: true })
                      setSecurityAlerts((prev) => prev.filter((a) => a.id !== alert.id))
                    } catch (e) {
                      console.error(e)
                    }
                  }}
                >
                  Marcar como lido
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4 md:pt-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            {role === 'admin'
              ? 'Painel Administrativo'
              : role === 'manager'
                ? 'Gestão da Clínica'
                : role === 'professional'
                  ? 'Meu Consultório'
                  : role === 'receptionist'
                    ? 'Recepção'
                    : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Bem-vindo de volta, <span className="font-semibold text-foreground">{user?.name}</span>.
            Aqui está o seu resumo de hoje.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={chartPeriod} onValueChange={(v: any) => setChartPeriod(v)}>
            <SelectTrigger className="w-[140px] h-10 bg-background rounded-full border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 border-border/50"
              >
                <Settings2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent className="rounded-l-2xl">
              <SheetHeader>
                <SheetTitle>Personalizar Visão</SheetTitle>
                <SheetDescription>Escolha quais métricas exibir no seu Dashboard.</SheetDescription>
              </SheetHeader>
              <div className="py-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                    Indicadores
                  </h4>
                  {isProfessional && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-app">Agendamentos</Label>
                        <Switch
                          id="s-app"
                          checked={dashboardSettings.appointments}
                          onCheckedChange={(c) =>
                            saveDashboardSettings({ ...dashboardSettings, appointments: c })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-pat">Total de Pacientes</Label>
                        <Switch
                          id="s-pat"
                          checked={dashboardSettings.patients}
                          onCheckedChange={(c) =>
                            saveDashboardSettings({ ...dashboardSettings, patients: c })
                          }
                        />
                      </div>
                    </>
                  )}
                  {(isManager || isReceptionist) && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-rev">Receita Total</Label>
                        <Switch
                          id="s-rev"
                          checked={dashboardSettings.revenue}
                          onCheckedChange={(c) =>
                            saveDashboardSettings({ ...dashboardSettings, revenue: c })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="s-prev">Receita Pendente</Label>
                        <Switch
                          id="s-prev"
                          checked={dashboardSettings.pendingRevenue}
                          onCheckedChange={(c) =>
                            saveDashboardSettings({ ...dashboardSettings, pendingRevenue: c })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider">
                    Gráficos
                  </h4>
                  {(isManager || isReceptionist) && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="s-fchart">Evolução Financeira</Label>
                      <Switch
                        id="s-fchart"
                        checked={dashboardSettings.financialChart}
                        onCheckedChange={(c) =>
                          saveDashboardSettings({ ...dashboardSettings, financialChart: c })
                        }
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="s-cchart">Volume Clínico</Label>
                    <Switch
                      id="s-cchart"
                      checked={dashboardSettings.clinicalChart}
                      onCheckedChange={(c) =>
                        saveDashboardSettings({ ...dashboardSettings, clinicalChart: c })
                      }
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="bg-muted/40 p-1 flex flex-nowrap w-max min-w-full justify-start h-auto rounded-2xl border border-border/40">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl py-2.5 px-6 transition-all font-medium flex-shrink-0"
            >
              <Activity className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="efficiency"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl py-2.5 px-6 transition-all font-medium flex-shrink-0"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-xl py-2.5 px-6 transition-all font-medium flex-shrink-0"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Auditoria</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-fade-in-up mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isProfessional && dashboardSettings.appointments && (
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Agendamentos Hoje</p>
                    <div className="h-10 w-10 bg-primary/10 flex items-center justify-center rounded-xl">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-bold tracking-tight text-foreground">
                      {data.appointmentsToday}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            )}

            {isProfessional && dashboardSettings.patients && (
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Total Pacientes</p>
                    <div className="h-10 w-10 bg-blue-500/10 flex items-center justify-center rounded-xl">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-bold tracking-tight text-foreground">
                      {data.patientVolume}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            )}

            {(isManager || isReceptionist) && dashboardSettings.revenue && (
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Receita Paga</p>
                    <div className="h-10 w-10 bg-emerald-500/10 flex items-center justify-center rounded-xl">
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-foreground">
                      <span className="text-xl text-muted-foreground font-semibold mr-1">R$</span>
                      {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            )}

            {(isManager || isReceptionist) && dashboardSettings.pendingRevenue && (
              <Card className="hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Receita Pendente</p>
                    <div className="h-10 w-10 bg-amber-500/10 flex items-center justify-center rounded-xl">
                      <Activity className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight text-foreground">
                      <span className="text-xl text-muted-foreground font-semibold mr-1">R$</span>
                      {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {(isManager || isReceptionist) && dashboardSettings.financialChart && (
              <Card className="flex flex-col">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-semibold">Evolução Financeira</h3>
                  <p className="text-sm text-muted-foreground">
                    Receita confirmada ao longo do período
                  </p>
                </div>
                <CardContent className="flex-1 p-6 pt-0">
                  {chartsLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                    </div>
                  ) : financialChartData.length > 0 ? (
                    <ChartContainer
                      config={{
                        revenue: { label: 'Receita', color: 'var(--primary)' },
                      }}
                      className="h-[280px] w-full"
                    >
                      <AreaChart
                        data={financialChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const [_, m, d] = val.split('-')
                            return `${d}/${m}`
                          }}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            `R$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`
                          }
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--primary)"
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado financeiro.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {dashboardSettings.clinicalChart && (
              <Card className="flex flex-col">
                <div className="p-6 pb-2">
                  <h3 className="text-lg font-semibold">Volume Clínico</h3>
                  <p className="text-sm text-muted-foreground">Atendimentos no período</p>
                </div>
                <CardContent className="flex-1 p-6 pt-0">
                  {chartsLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
                    </div>
                  ) : clinicalChartData.length > 0 ? (
                    <ChartContainer
                      config={{
                        appointments: { label: 'Atendimentos', color: 'hsl(var(--chart-2))' },
                      }}
                      className="h-[280px] w-full"
                    >
                      <BarChart
                        data={clinicalChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barSize={24}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const [_, m, d] = val.split('-')
                            return `${d}/${m}`
                          }}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="appointments"
                          fill="hsl(var(--chart-2))"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Nenhum atendimento.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6 animate-fade-in-up mt-0">
          <PerformanceInsights />
          <div className="grid gap-6 lg:grid-cols-2">
            <ClinicGamificationWidget />
            {isManager && (
              <div className="lg:col-span-2">
                <ProfessionalRanking />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6 animate-fade-in-up mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isProfessional && (
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-amber-500/10 flex items-center justify-center rounded-xl">
                      <FileText className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Prontuários Pendentes
                      </p>
                      <h3 className="text-3xl font-bold text-foreground">{data.pendingNotes}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isManager && (
              <Card className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-destructive/10 flex items-center justify-center rounded-xl">
                      <Package className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Alertas de Estoque
                      </p>
                      <h3 className="text-3xl font-bold text-foreground">{data.lowStock}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 flex items-center justify-center rounded-xl">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Score de Conformidade
                    </p>
                    <h3 className="text-3xl font-bold text-foreground">98%</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
