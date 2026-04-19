import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { DollarSign, Calendar, Package, TrendingUp, TrendingDown, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function UnitsComparison() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState('7days')
  const [regionFilter, setRegionFilter] = useState('all')

  const [finance, setFinance] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadData()
    }
  }, [user, dateRange])

  const getStartDate = (range: string) => {
    const d = new Date()
    if (range === 'today') {
      d.setHours(0, 0, 0, 0)
    } else if (range === '7days') {
      d.setDate(d.getDate() - 7)
    } else if (range === 'mtd') {
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
    }
    return d.toISOString().replace('T', ' ').substring(0, 19)
  }

  const loadData = async () => {
    try {
      const clinicsData = await pb.collection('clinic_settings').getFullList()
      setClinics(clinicsData)

      const filter = dateRange === 'all' ? '' : `created >= "${getStartDate(dateRange)}"`
      const apptFilter = dateRange === 'all' ? '' : `start_time >= "${getStartDate(dateRange)}"`

      const [fin, appts, inv, profs] = await Promise.all([
        pb.collection('consultations_finance').getFullList({ filter }),
        pb.collection('appointments').getFullList({ filter: apptFilter }),
        pb.collection('clinical_inventory').getFullList({ filter: 'is_high_cost = true' }),
        pb.collection('users').getFullList({ filter: "role = 'professional'" }),
      ])

      setFinance(fin)
      setAppointments(appts)
      setInventory(inv)
      setProfessionals(profs)
    } catch (e) {
      console.error(e)
    }
  }

  const regions = useMemo(() => {
    const set = new Set<string>()
    clinics.forEach((c) => c.region && set.add(c.region))
    return Array.from(set).sort()
  }, [clinics])

  const { chartData, benchmarkingData } = useMemo(() => {
    const filteredClinics = clinics.filter(
      (c) => regionFilter === 'all' || c.region === regionFilter,
    )

    const cData = filteredClinics.map((clinic) => {
      const clinicId = clinic.id
      const clinicFinance = finance.filter((f) => f.clinic_id === clinicId)
      const revenue = clinicFinance.reduce((sum, f) => sum + (f.amount || 0), 0)

      const clinicAppts = appointments.filter((a) => a.clinic_id === clinicId)
      const apptCount = clinicAppts.length
      const completedAppts = clinicAppts.filter((a) => a.status === 'completed').length

      const clinicInv = inventory.filter((i) => i.clinic_id === clinicId)
      const highCostItems = clinicInv.reduce((sum, i) => sum + (i.current_quantity || 0), 0)

      const clinicProfs = professionals.filter((p) => p.clinic_id === clinicId)
      const profCount = clinicProfs.length || 1

      const config = clinic.bonus_config || { revenue_percentage: 0 }
      const avgBonus = (revenue * (config.revenue_percentage / 100)) / profCount

      const efficiency = apptCount > 0 ? (completedAppts / apptCount) * 100 : 0
      const score = Math.min(efficiency * 0.4 + (revenue > 0 ? 60 : 0), 100)

      return {
        id: clinicId,
        name: clinic.name,
        region: clinic.region || '-',
        revenue,
        appointments: apptCount,
        highCostItems,
        avgBonus,
        score,
        profCount,
      }
    })

    const totalAvgBonus = cData.reduce((s, c) => s + c.avgBonus, 0) / (cData.length || 1)
    const totalAvgScore = cData.reduce((s, c) => s + c.score, 0) / (cData.length || 1)

    const bData = cData
      .map((c) => {
        const bonusDiff = totalAvgBonus > 0 ? (c.avgBonus - totalAvgBonus) / totalAvgBonus : 0
        const scoreDiff = totalAvgScore > 0 ? (c.score - totalAvgScore) / totalAvgScore : 0
        return { ...c, bonusDiff, scoreDiff }
      })
      .sort((a, b) => b.score - a.score)

    return {
      chartData: cData,
      benchmarkingData: {
        clinics: bData,
        regionalAvgBonus: totalAvgBonus,
        regionalAvgScore: totalAvgScore,
      },
    }
  }, [clinics, finance, appointments, inventory, professionals, regionFilter])

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

  const chartConfigRevenue = { revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-1))' } }
  const chartConfigAppts = { appointments: { label: 'Consultas', color: 'hsl(var(--chart-2))' } }
  const chartConfigInv = {
    highCostItems: { label: 'Itens Alto Custo', color: 'hsl(var(--chart-3))' },
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Comparativo e Benchmarking
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Analise o desempenho da rede e compare as unidades.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {regions.length > 0 && (
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[140px] md:w-[160px]">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] md:w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="mtd">Este mês</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigRevenue} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R${val}`}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" /> Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigAppts} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="appointments"
                  fill="var(--color-appointments)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" /> Estoque (Alto Custo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigInv} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="highCostItems"
                  fill="var(--color-highCostItems)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Benchmarking Regional</CardTitle>
          <CardDescription>
            Análise detalhada de performance por unidade. Valores com variação acima de 20% da média
            regional são destacados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Média Score</p>
              <p className="text-xl sm:text-2xl font-bold">
                {benchmarkingData.regionalAvgScore.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">
                Média Bônus/Prof
              </p>
              <p className="text-xl sm:text-2xl font-bold">
                R${' '}
                {benchmarkingData.regionalAvgBonus.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                  Alta
                </Badge>{' '}
                +20% que a média
              </span>
              <span className="flex items-center gap-1">
                <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">
                  Baixa
                </Badge>{' '}
                -20% que a média
              </span>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="hidden md:table-cell">Região</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                  <TableHead className="text-center">Score Médio</TableHead>
                  <TableHead className="text-right">Bônus Médio/Prof</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmarkingData.clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Nenhuma unidade encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  benchmarkingData.clinics.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {item.region}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            className={cn(
                              'font-bold',
                              item.scoreDiff > 0.2
                                ? 'text-emerald-600'
                                : item.scoreDiff < -0.2
                                  ? 'text-red-600'
                                  : '',
                            )}
                          >
                            {item.score.toFixed(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={cn(
                              'font-bold',
                              item.bonusDiff > 0.2
                                ? 'text-emerald-600'
                                : item.bonusDiff < -0.2
                                  ? 'text-red-600'
                                  : '',
                            )}
                          >
                            R$ {item.avgBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {item.bonusDiff > 0.2 ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-200"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" /> Acima
                          </Badge>
                        ) : item.bonusDiff < -0.2 ? (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-600 border-red-200"
                          >
                            <TrendingDown className="h-3 w-3 mr-1" /> Abaixo
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Na Média</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
