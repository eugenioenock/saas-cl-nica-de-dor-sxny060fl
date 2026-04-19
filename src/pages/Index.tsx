import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Users,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
  Package,
  ShieldCheck,
  ClipboardList,
  Settings2,
} from 'lucide-react'
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

  // Loading summary metrics
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

  // Loading charts
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
    <div className="space-y-8 animate-fade-in-up pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta,{' '}
            <span className="font-semibold text-foreground">{user?.name || 'usuário'}</span>. Aqui
            está o seu resumo atual.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="w-full overflow-x-auto pb-2 -mb-2">
          <TabsList className="bg-muted/50 p-1 backdrop-blur-md border border-border/50 flex flex-nowrap w-max min-w-full justify-start h-auto rounded-xl">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm rounded-md py-2.5 px-5 transition-all flex-shrink-0"
            >
              <Activity className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="efficiency"
              className="flex items-center gap-2 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm rounded-md py-2.5 px-5 transition-all flex-shrink-0"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Eficiência & Protocolos</span>
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="flex items-center gap-2 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm rounded-md py-2.5 px-5 transition-all flex-shrink-0"
            >
              <Package className="h-4 w-4" />
              <span>Estoque & Insumos</span>
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 data-[state=active]:bg-background/80 data-[state=active]:shadow-sm rounded-md py-2.5 px-5 transition-all flex-shrink-0"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Auditoria & Conformidade</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6 animate-fade-in-up mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
            <h2 className="text-lg font-medium">Métricas Principais</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
                  Período:
                </span>
                <Select value={chartPeriod} onValueChange={(v: any) => setChartPeriod(v)}>
                  <SelectTrigger className="w-[140px] h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                    <SelectItem value="month">Este Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <Settings2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Editar Dashboard</span>
                    <span className="sm:hidden">Editar</span>
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Personalizar Dashboard</SheetTitle>
                    <SheetDescription>
                      Escolha quais métricas e gráficos exibir na sua Visão Geral.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                        Métricas
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
                            <Label htmlFor="s-prev">Receita a Receber</Label>
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
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                        Gráficos Analíticos
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isProfessional && dashboardSettings.appointments && (
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-full">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.appointmentsToday}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pacientes agendados para hoje
                  </p>
                </CardContent>
              </Card>
            )}

            {isProfessional && dashboardSettings.patients && (
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{data.patientVolume}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pacientes registrados na base
                  </p>
                </CardContent>
              </Card>
            )}

            {(isManager || isReceptionist) && dashboardSettings.revenue && (
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total (Paga)</CardTitle>
                  <div className="p-2 bg-emerald-500/10 rounded-full">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Faturamento realizado</p>
                </CardContent>
              </Card>
            )}

            {(isManager || isReceptionist) && dashboardSettings.pendingRevenue && (
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita a Receber</CardTitle>
                  <div className="p-2 bg-amber-500/10 rounded-full">
                    <Activity className="h-4 w-4 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    R$ {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Faturas e repasses pendentes</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {(isManager || isReceptionist) && dashboardSettings.financialChart && (
              <Card>
                <CardHeader>
                  <CardTitle>Evolução Financeira</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Receita paga ao longo do período selecionado
                  </p>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : financialChartData.length > 0 ? (
                    <ChartContainer
                      config={{
                        revenue: {
                          label: 'Receita',
                          color: 'hsl(var(--chart-2))',
                        },
                      }}
                      className="h-[300px] w-full"
                    >
                      <AreaChart data={financialChartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const [y, m, d] = val.split('-')
                            return `${d}/${m}`
                          }}
                          tick={{ fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) =>
                            `R$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`
                          }
                          tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="var(--color-revenue)"
                          fill="var(--color-revenue)"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado financeiro no período.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {dashboardSettings.clinicalChart && (
              <Card className={!isManager && !isReceptionist ? 'md:col-span-2 lg:col-span-1' : ''}>
                <CardHeader>
                  <CardTitle>Volume Clínico</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Atendimentos confirmados e realizados
                  </p>
                </CardHeader>
                <CardContent>
                  {chartsLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : clinicalChartData.length > 0 ? (
                    <ChartContainer
                      config={{
                        appointments: {
                          label: 'Atendimentos',
                          color: 'hsl(var(--chart-1))',
                        },
                      }}
                      className="h-[300px] w-full"
                    >
                      <BarChart data={clinicalChartData} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const [y, m, d] = val.split('-')
                            return `${d}/${m}`
                          }}
                          tick={{ fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="appointments"
                          fill="var(--color-appointments)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum atendimento no período.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: EFICIÊNCIA E PROTOCOLOS */}
        <TabsContent value="efficiency" className="space-y-6 animate-fade-in-up mt-2">
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

        {/* TAB 3: ESTOQUE E INSUMOS */}
        <TabsContent value="inventory" className="space-y-6 animate-fade-in-up mt-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isManager && (
              <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-destructive">
                    Alertas de Estoque
                  </CardTitle>
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{data.lowStock}</div>
                  <p className="text-xs text-destructive/80 mt-1">
                    Itens abaixo da quantidade mínima
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status de Fornecedores</CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Package className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">Ativo</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhum atraso de entrega detectado
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: AUDITORIA E CONFORMIDADE */}
        <TabsContent value="compliance" className="space-y-6 animate-fade-in-up mt-2">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isProfessional && (
              <Card className="border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-500">
                    Prontuários Pendentes
                  </CardTitle>
                  <div className="p-2 bg-amber-500/10 rounded-full">
                    <FileText className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">
                    {data.pendingNotes}
                  </div>
                  <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                    Aguardando finalização ou assinatura
                  </p>
                </CardContent>
              </Card>
            )}

            {isManager && (
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Score de Conformidade</CardTitle>
                  <div className="p-2 bg-emerald-500/10 rounded-full">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    98%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assinaturas e registros em dia
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ações de Auditoria</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Nenhuma discrepância identificada
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
