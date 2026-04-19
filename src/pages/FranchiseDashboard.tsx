import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  BarChart3,
  DollarSign,
  Activity,
  AlertTriangle,
  Users,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Printer,
  MapPin,
  Info,
  Medal,
  Award,
  Star,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [selectedState, setSelectedState] = useState<string>('all')

  const [clinics, setClinics] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [patientsCount, setPatientsCount] = useState(0)
  const [usersList, setUsersList] = useState<any[]>([])

  const loadData = async () => {
    try {
      const oneYearAgo = subMonths(new Date(), 12)
      const [clinicsRes, financesRes, appointmentsRes, patientsRes, usersRes] = await Promise.all([
        pb.collection('clinic_settings').getFullList(),
        pb.collection('consultations_finance').getFullList({
          filter: `(status = 'paid' || status = 'pending') && created >= '${oneYearAgo.toISOString()}'`,
        }),
        pb.collection('appointments').getFullList({
          filter: `start_time >= '${oneYearAgo.toISOString()}'`,
        }),
        pb.collection('patients').getList(1, 1),
        pb.collection('users').getFullList(),
      ])
      setClinics(clinicsRes)
      setFinances(financesRes)
      setAppointments(appointmentsRes)
      setPatientsCount(patientsRes.totalItems)
      setUsersList(usersRes)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const availableRegions = useMemo(
    () => Array.from(new Set(clinics.map((c) => c.region).filter(Boolean))).sort(),
    [clinics],
  )

  const availableStates = useMemo(
    () =>
      Array.from(
        new Set(
          clinics
            .filter((c) => selectedRegion === 'all' || c.region === selectedRegion)
            .map((c) => c.state)
            .filter(Boolean),
        ),
      ).sort(),
    [clinics, selectedRegion],
  )

  useEffect(() => {
    if (
      selectedRegion !== 'all' &&
      selectedState !== 'all' &&
      !availableStates.includes(selectedState)
    ) {
      setSelectedState('all')
    }
  }, [selectedRegion, availableStates, selectedState])

  const filteredClinics = useMemo(
    () =>
      clinics.filter(
        (c) =>
          (selectedRegion === 'all' || c.region === selectedRegion) &&
          (selectedState === 'all' || c.state === selectedState),
      ),
    [clinics, selectedRegion, selectedState],
  )

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
    const clinicIds = new Set(filteredClinics.map((c) => c.id))

    const currF = finances.filter(
      (f) => clinicIds.has(f.clinic_id) && isWithinInterval(new Date(f.created), bounds),
    )
    const prevF = finances.filter(
      (f) =>
        clinicIds.has(f.clinic_id) &&
        isWithinInterval(new Date(f.created), { start: bounds.prevStart, end: bounds.prevEnd }),
    )
    const currA = appointments.filter(
      (a) => clinicIds.has(a.clinic_id) && isWithinInterval(new Date(a.start_time), bounds),
    )
    return { currentFinances: currF, prevFinances: prevF, currentAppts: currA }
  }, [finances, appointments, bounds, filteredClinics])

  const totalRevenue = currentFinances.reduce((acc, f) => acc + f.amount, 0)
  const totalAppointmentsCount = currentAppts.length
  const avgClinicRevenue = filteredClinics.length ? totalRevenue / filteredClinics.length : 0

  const clinicStats = useMemo(() => {
    return filteredClinics
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
          region: clinic.region,
          state: clinic.state,
          revenue: cRev,
          appointments: cAppts.length,
          variation,
          dropWarning,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
  }, [filteredClinics, currentFinances, prevFinances, currentAppts])

  const occupancyStats = useMemo(() => {
    if (!bounds || filteredClinics.length === 0) return { professionals: [], specialties: [] }
    const daysInPeriod = Math.max(
      1,
      Math.ceil((bounds.end.getTime() - bounds.start.getTime()) / 86400000),
    )
    const workDays = Math.ceil(daysInPeriod * (5 / 7))

    const profMap = new Map()
    const specMap = new Map()

    const getDailyHours = (start?: string, end?: string) => {
      if (!start || !end) return 8
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      return Math.max(1, eh + em / 60 - (sh + sm / 60))
    }

    currentAppts.forEach((a) => {
      const clinic = filteredClinics.find((c) => c.id === a.clinic_id)
      if (!clinic) return

      const profId = a.professional_id
      const spec = a.specialty || 'Clínico Geral'

      if (profId) {
        if (!profMap.has(profId)) {
          const dailyHours = getDailyHours(clinic.opening_time, clinic.closing_time)
          profMap.set(profId, {
            count: 0,
            capacity: dailyHours * workDays,
            clinicName: clinic.name,
          })
        }
        profMap.get(profId).count++
      }

      specMap.set(spec, (specMap.get(spec) || 0) + 1)
    })

    const professionals = Array.from(profMap.entries())
      .map(([id, data]) => {
        const user = usersList.find((u) => u.id === id)
        return {
          id,
          name: user?.name || 'Profissional',
          clinicName: data.clinicName,
          rate: Math.min(100, (data.count / Math.max(1, data.capacity)) * 100),
        }
      })
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10) // Top 10

    const specialties = Array.from(specMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return { professionals, specialties }
  }, [currentAppts, filteredClinics, bounds, usersList])

  const rankingStats = useMemo(() => {
    if (!bounds || filteredClinics.length === 0) return []

    const daysInPeriod = Math.max(
      1,
      Math.ceil((bounds.end.getTime() - bounds.start.getTime()) / 86400000),
    )
    const workDays = Math.ceil(daysInPeriod * (5 / 7))

    const clinicData = filteredClinics.map((clinic) => {
      const cFinances = currentFinances.filter(
        (f) => f.clinic_id === clinic.id && (f.status === 'paid' || f.status === 'pending'),
      )
      const cAppts = currentAppts.filter((a) => a.clinic_id === clinic.id)

      const revenue = cFinances.reduce((sum, f) => sum + f.amount, 0)
      const volume = cAppts.length

      const completedAppts = cAppts.filter((a) => a.status === 'completed').length
      const completionRate = volume > 0 ? (completedAppts / volume) * 100 : 0

      let totalApptHours = 0
      const uniqueProfs = new Set()
      cAppts.forEach((a) => {
        if (a.professional_id) uniqueProfs.add(a.professional_id)
        if (a.start_time && a.end_time) {
          const start = new Date(a.start_time).getTime()
          const end = new Date(a.end_time).getTime()
          const hours = (end - start) / 3600000
          if (hours > 0 && hours < 24) totalApptHours += hours
        }
      })

      const getDailyHours = (start?: string, end?: string) => {
        if (!start || !end) return 8
        const [sh, sm] = start.split(':').map(Number)
        const [eh, em] = end.split(':').map(Number)
        return Math.max(1, eh + em / 60 - (sh + sm / 60))
      }

      const dailyHours = getDailyHours(clinic.opening_time, clinic.closing_time)
      const profCount = Math.max(1, uniqueProfs.size)
      const capacityHours = dailyHours * workDays * profCount
      const occupancyRate = Math.min(
        100,
        capacityHours > 0 ? (totalApptHours / capacityHours) * 100 : 0,
      )

      const efficiencyScore = (completionRate + occupancyRate) / 2

      return {
        id: clinic.id,
        name: clinic.name,
        region: clinic.region,
        state: clinic.state,
        revenue,
        volume,
        completionRate,
        occupancyRate,
        efficiencyScore,
      }
    })

    const maxRevenue = Math.max(...clinicData.map((c) => c.revenue), 1)
    const maxVolume = Math.max(...clinicData.map((c) => c.volume), 1)

    const scoredClinics = clinicData
      .map((c) => {
        const revenueScore = (c.revenue / maxRevenue) * 100
        const volumeScore = (c.volume / maxVolume) * 100

        const finalScore = revenueScore * 0.4 + volumeScore * 0.3 + c.efficiencyScore * 0.3

        let tier = 'Bronze'
        if (finalScore >= 80) tier = 'Gold'
        else if (finalScore >= 60) tier = 'Silver'

        return {
          ...c,
          revenueScore,
          volumeScore,
          finalScore,
          tier,
        }
      })
      .sort((a, b) => b.finalScore - a.finalScore)

    return scoredClinics
  }, [filteredClinics, currentFinances, currentAppts, bounds])

  const trendData = useMemo(() => {
    const months = []
    const n = new Date()
    const clinicIds = new Set(filteredClinics.map((c) => c.id))

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(n, i)
      months.push({
        label: format(d, 'MMM/yy', { locale: ptBR }),
        start: startOfMonth(d),
        end: endOfMonth(d),
      })
    }

    return months.map((m) => {
      const mFinances = finances.filter(
        (f) =>
          clinicIds.has(f.clinic_id) &&
          isWithinInterval(new Date(f.created), { start: m.start, end: m.end }),
      )
      const mAppts = appointments.filter(
        (a) =>
          clinicIds.has(a.clinic_id) &&
          isWithinInterval(new Date(a.start_time), { start: m.start, end: m.end }),
      )
      return {
        month: m.label,
        revenue: mFinances.reduce((acc, f) => acc + f.amount, 0),
        appointments: mAppts.length,
      }
    })
  }, [finances, appointments, filteredClinics])

  const exportCSV = () => {
    const headers = [
      'Clinica',
      'Regiao',
      'Estado',
      'Receita_R$',
      'Atendimentos',
      'Status',
      'Variacao_%',
    ]
    const rows = clinicStats.map((c) => [
      `"${c.name}"`,
      `"${c.region || '-'}"`,
      `"${c.state || '-'}"`,
      c.revenue.toFixed(2),
      c.appointments,
      c.dropWarning ? 'Alerta' : 'Saudavel',
      c.variation.toFixed(2),
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_franquia_${format(new Date(), 'yyyyMMdd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[400px] md:col-span-1" />
          <Skeleton className="h-[400px] md:col-span-2" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    )
  }

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="print:block hidden mb-6 pb-6 border-b">
        <h1 className="text-3xl font-bold">Relatório Executivo da Franquia</h1>
        <p className="text-sm text-muted-foreground">
          Gerado em {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Franchise Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitoramento global e performance da rede de clínicas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="flex items-center bg-background border rounded-md px-3 py-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" /> {filteredClinics.length} unidades
          </div>

          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Região" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Regiões</SelectItem>
              {availableRegions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedState}
            onValueChange={setSelectedState}
            disabled={selectedRegion !== 'all' && availableStates.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {availableStates.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Mês Atual</SelectItem>
              <SelectItem value="quarter">Trimestre Atual</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV (Tabela)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredClinics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border rounded-lg border-dashed">
          <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma clínica encontrada</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-md">
            Não há unidades operacionais registradas para a combinação de região e estado
            selecionada no momento.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Filtrado</CardTitle>
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
                <p className="text-xs text-muted-foreground mt-1">Sessões nas unidades</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patientsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Base global da franquia</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio por Unidade</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    avgClinicRevenue,
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receita média / unidade visível
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 print:break-inside-avoid">
              <CardHeader>
                <CardTitle>Crescimento e Volume</CardTitle>
                <CardDescription>
                  Evolução de receita e atendimentos nas unidades selecionadas
                </CardDescription>
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
                      <LineChart
                        data={trendData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
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
                        <RechartsTooltip content={<ChartTooltipContent />} />
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

            <Card className="md:col-span-1 print:break-inside-avoid">
              <CardHeader>
                <CardTitle>Distribuição de Receita</CardTitle>
                <CardDescription>Participação de cada unidade visível</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {pieData.length > 0 ? (
                    <ChartContainer config={{}} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip
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
          </div>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Painel Analítico de Ocupação</CardTitle>
              <CardDescription>
                Utilização da capacidade da rede: comparativo entre demanda e capacidade instalada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center justify-between">
                    <span>Taxa de Ocupação (Top Profissionais)</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Capacidade baseada no horário da clínica
                    </span>
                  </h4>
                  <div className="space-y-3">
                    {occupancyStats.professionals.length > 0 ? (
                      occupancyStats.professionals.map((p) => (
                        <div key={p.id} className="flex justify-between items-center">
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.clinicName}</p>
                          </div>
                          <Badge
                            variant={p.rate > 90 ? 'destructive' : 'outline'}
                            className={`ml-4 flex-shrink-0 ${
                              p.rate < 40 && p.rate > 0
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100'
                                : ''
                            }`}
                          >
                            {p.rate.toFixed(1)}%
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sem dados de atendimento
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-4">
                    Volume por Especialidade / Procedimento
                  </h4>
                  <div className="h-[250px]">
                    {occupancyStats.specialties.length > 0 ? (
                      <ChartContainer
                        config={{ count: { label: 'Atend.', color: 'hsl(var(--chart-3))' } }}
                        className="h-full w-full"
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={occupancyStats.specialties}
                            layout="vertical"
                            margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={120}
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Ranking de Eficiência da Rede</CardTitle>
              <CardDescription>
                Classificação das unidades baseada em Receita (40%), Volume (30%) e Eficiência
                (30%).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Clínica</TableHead>
                      <TableHead className="text-center">Score Final</TableHead>
                      <TableHead className="text-center">Classificação</TableHead>
                      <TableHead className="text-right">Métricas Principais</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankingStats.map((clinic, index) => (
                      <TableRow key={clinic.id}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{clinic.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {clinic.region || '-'} {clinic.state ? `/ ${clinic.state}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-bold text-lg">
                              {clinic.finalScore.toFixed(1)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                              </TooltipTrigger>
                              <TooltipContent className="p-3 w-64 space-y-2">
                                <div className="font-semibold text-sm mb-2">Composição da Nota</div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Receita (40%):</span>
                                  <span>{clinic.revenueScore.toFixed(1)} / 100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Volume (30%):</span>
                                  <span>{clinic.volumeScore.toFixed(1)} / 100</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Eficiência (30%):</span>
                                  <span>{clinic.efficiencyScore.toFixed(1)} / 100</span>
                                </div>
                                <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                                  Taxa de Conclusão: {clinic.completionRate.toFixed(1)}%<br />
                                  Ocupação: {clinic.occupancyRate.toFixed(1)}%
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {clinic.tier === 'Gold' && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white w-24 justify-center">
                              <Award className="w-3 h-3 mr-1" /> Alta
                            </Badge>
                          )}
                          {clinic.tier === 'Silver' && (
                            <Badge className="bg-slate-400 hover:bg-slate-500 text-white w-24 justify-center">
                              <Medal className="w-3 h-3 mr-1" /> Média
                            </Badge>
                          )}
                          {clinic.tier === 'Bronze' && (
                            <Badge className="bg-amber-700 hover:bg-amber-800 text-white w-24 justify-center">
                              <Star className="w-3 h-3 mr-1" /> Atenção
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground">
                            {clinic.volume} atends. |{' '}
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(clinic.revenue)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rankingStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhum dado para gerar ranking.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="print:break-inside-avoid">
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
                      <TableHead>Região / Estado</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-center">Status de Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinicStats.map((clinic) => (
                      <TableRow key={clinic.id}>
                        <TableCell className="font-medium">{clinic.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {clinic.region || '-'} {clinic.state ? `/ ${clinic.state}` : ''}
                        </TableCell>
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
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
