import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Loader2,
  Users,
  CalendarCheck,
  TrendingUp,
  Activity,
  Star,
  ShieldAlert,
} from 'lucide-react'

export default function Index() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
  })
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [satisfaction, setSatisfaction] = useState(0)
  const [insurancePending, setInsurancePending] = useState(0)

  const loadData = async () => {
    try {
      const [patients, appointments, finances, usersRes, feedbacks] = await Promise.all([
        pb.collection('patients').getFullList(),
        pb.collection('appointments').getFullList(),
        pb.collection('consultations_finance').getFullList({ expand: 'medical_note_id' }),
        pb.collection('users').getFullList(),
        pb.collection('feedbacks').getFullList(),
      ])

      if (feedbacks.length > 0) {
        const avg = feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length
        setSatisfaction(avg)
      } else {
        setSatisfaction(0)
      }

      const totalRevenue = finances
        .filter((f) => f.status === 'paid')
        .reduce((sum, f) => sum + f.amount, 0)

      const pendingRevenue = finances
        .filter((f) => f.status === 'pending')
        .reduce((sum, f) => sum + f.amount, 0)

      const totalInsurancePending = finances
        .filter((f) => f.billing_type === 'insurance' && f.status === 'transfer_pending')
        .reduce((sum, f) => sum + f.amount, 0)
      setInsurancePending(totalInsurancePending)

      setKpis({
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        totalRevenue,
        pendingRevenue,
      })

      // Aggregate Professional Performance
      const userMap = new Map(usersRes.map((u) => [u.id, u.name || u.email || 'Desconhecido']))
      const perfMap: Record<string, { name: string; consultations: number; revenue: number }> = {}

      // Count consultations
      appointments.forEach((app) => {
        const profId = app.professional_id
        if (!profId) return
        if (!perfMap[profId]) {
          perfMap[profId] = {
            name: userMap.get(profId) || 'Desconhecido',
            consultations: 0,
            revenue: 0,
          }
        }
        perfMap[profId].consultations += 1
      })

      // Sum revenue
      finances.forEach((f) => {
        if (f.status !== 'paid') return
        const profId = f.expand?.medical_note_id?.professionalId
        if (profId) {
          if (!perfMap[profId]) {
            perfMap[profId] = {
              name: userMap.get(profId) || 'Desconhecido',
              consultations: 0,
              revenue: 0,
            }
          }
          perfMap[profId].revenue += f.amount
        }
      })

      const chartData = Object.values(perfMap).sort((a, b) => b.consultations - a.consultations)
      setPerformanceData(chartData)
    } catch (e) {
      console.error('Error loading dashboard data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('appointments', loadData)
  useRealtime('consultations_finance', loadData)
  useRealtime('patients', loadData)
  useRealtime('medical_notes', loadData)
  useRealtime('feedbacks', loadData)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do desempenho e métricas da clínica.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Consultas</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Receita</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ {kpis.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pendente</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ {kpis.pendingRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Satisfação</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {satisfaction > 0 ? satisfaction.toFixed(1) : '-'}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ 5</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">A Receber (Convênio)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">R$ {insurancePending.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volume de Consultas por Profissional</CardTitle>
            <CardDescription>
              Número total de atendimentos agendados por membro da equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceData.length > 0 ? (
              <ChartContainer
                config={{ consultations: { label: 'Consultas', color: 'hsl(var(--primary))' } }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceData}
                    margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="consultations"
                      fill="var(--color-consultations)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Profissional</CardTitle>
            <CardDescription>
              Valor gerado vinculado aos prontuários e pagamentos confirmados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceData.some((d) => d.revenue > 0) ? (
              <ChartContainer
                config={{ revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-2))' } }}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={performanceData}
                    margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-center px-4">
                Receita por profissional requer faturamentos pagos e vinculados a prontuários
                médicos.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
