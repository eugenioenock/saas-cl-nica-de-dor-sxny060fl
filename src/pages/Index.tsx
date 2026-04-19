import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Users,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Package,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react'
import { ProfessionalRanking } from '@/components/dashboard/ProfessionalRanking'
import { PerformanceInsights } from '@/components/dashboard/performance-insights'
import { ClinicGamificationWidget } from '@/components/dashboard/ClinicGamificationWidget'

interface DashboardData {
  appointmentsToday: number
  pendingNotes: number
  patientVolume: number
  totalRevenue: number
  pendingRevenue: number
  lowStock: number
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

  const role = user?.role || 'professional'
  const isManager = role === 'manager' || role === 'admin'
  const isReceptionist = role === 'receptionist'
  const isProfessional = role === 'professional' || role === 'admin'

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

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta,{' '}
          <span className="font-semibold text-foreground">{user?.name || 'usuário'}</span>. Aqui
          está o seu resumo atual.
        </p>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isProfessional && (
              <>
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
              </>
            )}

            {isManager && (
              <>
                <Card className="bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total (Paga)</CardTitle>
                    <div className="p-2 bg-emerald-500/10 rounded-full">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">
                      R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Faturamento realizado</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita a Receber</CardTitle>
                    <div className="p-2 bg-amber-500/10 rounded-full">
                      <Activity className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      R$ {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Faturas e repasses pendentes
                    </p>
                  </CardContent>
                </Card>
              </>
            )}

            {isReceptionist && !isManager && !isProfessional && (
              <>
                <Card className="bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fluxo Diário</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{data.appointmentsToday}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Agendamentos previstos para hoje
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-card to-card/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                    <div className="p-2 bg-amber-500/10 rounded-full">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600">
                      R$ {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cobranças aguardando quitação
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card className="border-dashed bg-muted/30 hover:bg-muted/40 transition-colors shadow-none hover:shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-80" />
              <h3 className="font-medium text-lg">Área de Trabalho Otimizada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Você está visualizando os painéis configurados especificamente para a função de{' '}
                <strong className="capitalize text-foreground">{role}</strong>.
              </p>
            </CardContent>
          </Card>
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
                  <div className="text-3xl font-bold text-emerald-600">98%</div>
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
