import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, DollarSign, Activity, AlertTriangle, Users, TrendingUp } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subMonths,
  isWithinInterval,
  format,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FranchiseDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'30d' | 'month' | 'quarter'>('month')

  const [clinics, setClinics] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [totalPatients, setTotalPatients] = useState(0)

  const loadData = async () => {
    try {
      const oneYearAgo = subMonths(new Date(), 12)
      const [clinicsRes, financesRes, appointmentsRes, patientsRes] = await Promise.all([
        pb.collection('clinic_settings').getFullList(),
        pb.collection('consultations_finance').getFullList({
          filter: `status = 'paid' && created >= '${oneYearAgo.toISOString()}'`,
        }),
        pb.collection('appointments').getFullList({
          filter: `start_time >= '${oneYearAgo.toISOString()}'`,
        }),
        pb.collection('patients').getList(1, 1),
      ])
      setClinics(clinicsRes)
      setFinances(financesRes)
      setAppointments(appointmentsRes)
      setTotalPatients(patientsRes.totalItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const bounds = useMemo(() => {
    const n = new Date()
    switch (filterType) {
      case '30d':
        return { start: subDays(n, 30), end: n, prevStart: subDays(n, 60), prevEnd: subDays(n, 30) }
      case 'month':
        return {
          start: startOfMonth(n),
          end: endOfMonth(n),
          prevStart: startOfMonth(subMonths(n, 1)),
          prevEnd: endOfMonth(subMonths(n, 1)),
        }
      case 'quarter':
        return {
          start: startOfQuarter(n),
          end: endOfQuarter(n),
          prevStart: startOfQuarter(subMonths(n, 3)),
          prevEnd: endOfQuarter(subMonths(n, 3)),
        }
    }
  }, [filterType])

  const { currentFinances, prevFinances, currentAppts } = useMemo(() => {
    if (!bounds) return { currentFinances: [], prevFinances: [], currentAppts: [] }
    const currF = finances.filter((f) => isWithinInterval(new Date(f.created), bounds))
    const prevF = finances.filter((f) =>
      isWithinInterval(new Date(f.created), { start: bounds.prevStart, end: bounds.prevEnd }),
    )
    const currA = appointments.filter((a) => isWithinInterval(new Date(a.start_time), bounds))
    return { currentFinances: currF, prevFinances: prevF, currentAppts: currA }
  }, [finances, appointments, bounds])

  const totalRevenue = currentFinances.reduce((acc, f) => acc + f.amount, 0)
  const totalAppointmentsCount = currentAppts.length
  const avgClinicRevenue = clinics.length ? totalRevenue / clinics.length : 0

  const clinicStats = useMemo(() => {
    return clinics
      .map((clinic) => {
        const cFinances = currentFinances.filter((f) => f.clinic_id === clinic.id)
        const pFinances = prevFinances.filter((f) => f.clinic_id === clinic.id)
        const cAppts = currentAppts.filter((a) => a.clinic_id === clinic.id)

        const cRev = cFinances.reduce((acc, f) => acc + f.amount, 0)
        const pRev = pFinances.reduce((acc, f) => acc + f.amount, 0)

        let dropWarning = false
        let variation = 0
        if (pRev > 0) {
          variation = ((cRev - pRev) / pRev) * 100
          if (variation <= -20) dropWarning = true
        } else if (pRev === 0 && cRev > 0) {
          variation = 100
        }

        return {
          id: clinic.id,
          name: clinic.name,
          revenue: cRev,
          appointments: cAppts.length,
          variation,
          dropWarning,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [clinics, currentFinances, prevFinances, currentAppts])

  const pieColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]
  const pieData = clinicStats
    .filter((c) => c.revenue > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.revenue,
      color: pieColors[i % pieColors.length],
    }))

  const trendData = useMemo(() => {
    const months = []
    const n = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(n, i)
      months.push({
        label: format(d, 'MMM/yy', { locale: ptBR }),
        start: startOfMonth(d),
        end: endOfMonth(d),
      })
    }

    return months.map((m) => {
      const mFinances = finances.filter((f) =>
        isWithinInterval(new Date(f.created), { start: m.start, end: m.end }),
      )
      const mAppts = appointments.filter((a) =>
        isWithinInterval(new Date(a.start_time), { start: m.start, end: m.end }),
      )
      return {
        month: m.label,
        revenue: mFinances.reduce((acc, f) => acc + f.amount, 0),
        appointments: mAppts.length,
      }
    })
  }, [finances, appointments])

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">Carregando painel da franquia...</div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Franchise Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitoramento global e performance da rede de clínicas.
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Mês Atual</SelectItem>
              <SelectItem value="quarter">Trimestre Atual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalRevenue,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume de Atendimentos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointmentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Sessões no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Pacientes ativos na rede</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio por Clínica</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                avgClinicRevenue,
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita média / unidade</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Distribuição de Receita</CardTitle>
            <CardDescription>Participação de cada unidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ChartContainer config={{}} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value: number) =>
                          new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(value)
                        }
                      />
                      <Legend verticalAlign="bottom" height={36} />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        label={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem receita no período
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Crescimento da Franquia (6 Meses)</CardTitle>
            <CardDescription>Evolução de receita e atendimentos em toda a rede</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  revenue: { label: 'Receita', color: 'hsl(var(--chart-1))' },
                  appointments: { label: 'Atend.', color: 'hsl(var(--chart-2))' },
                }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(v) => `R$${v / 1000}k`}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Receita"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="appointments"
                      stroke="var(--color-appointments)"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Atendimentos"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Unidade</CardTitle>
          <CardDescription>
            Receita, volume de atendimentos e status em relação ao período anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clínica</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-center">Status de Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicStats.map((clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">{clinic.name}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(clinic.revenue)}
                    </TableCell>
                    <TableCell className="text-right">{clinic.appointments}</TableCell>
                    <TableCell className="text-center">
                      {clinic.dropWarning ? (
                        <Badge
                          variant="destructive"
                          className="flex items-center justify-center gap-1 w-32 mx-auto"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Alerta ({clinic.variation > 0 ? '+' : ''}
                          {clinic.variation.toFixed(1)}%)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600 bg-green-50 flex items-center justify-center gap-1 w-32 mx-auto"
                        >
                          <TrendingUp className="w-3 h-3" />
                          Saudável ({clinic.variation > 0 ? '+' : ''}
                          {clinic.variation.toFixed(1)}%)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {clinicStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhuma clínica encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
