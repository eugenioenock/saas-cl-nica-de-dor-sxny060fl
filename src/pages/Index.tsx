import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  Users,
  Calendar as CalendarIcon,
  FileText,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { ProfessionalRanking } from '@/components/dashboard/ProfessionalRanking'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.name || 'usuário'}. Aqui está o seu resumo atual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isProfessional && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.appointmentsToday}</div>
                <p className="text-xs text-muted-foreground">Pacientes agendados para hoje</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prontuários Pendentes</CardTitle>
                <FileText className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{data.pendingNotes}</div>
                <p className="text-xs text-muted-foreground">
                  Aguardando finalização ou assinatura
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.patientVolume}</div>
                <p className="text-xs text-muted-foreground">Pacientes registrados na base</p>
              </CardContent>
            </Card>
          </>
        )}

        {isManager && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total (Paga)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Faturamento realizado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita a Receber</CardTitle>
                <Activity className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  R$ {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Faturas e repasses pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{data.lowStock}</div>
                <p className="text-xs text-muted-foreground">Itens abaixo da quantidade mínima</p>
              </CardContent>
            </Card>
          </>
        )}

        {isReceptionist && !isManager && !isProfessional && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fluxo Diário</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.appointmentsToday}</div>
                <p className="text-xs text-muted-foreground">Agendamentos previstos para hoje</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  R$ {data.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Cobranças aguardando quitação</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isManager && (
        <div className="mt-6">
          <ProfessionalRanking />
        </div>
      )}

      <Card className="mt-6 border-dashed bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center p-10 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 opacity-50" />
          <h3 className="font-medium text-lg">Área de Trabalho Otimizada</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Você está visualizando os painéis configurados especificamente para a função de{' '}
            <strong className="capitalize">{role}</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
