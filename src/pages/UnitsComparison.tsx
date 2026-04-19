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
import { DollarSign, Calendar, Package, MapPin, Trophy, Award, Medal } from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'
import { getLevelInfo, BADGE_ICONS } from '@/lib/gamification'
import { useRealtime } from '@/hooks/use-realtime'

export default function UnitsComparison() {
  const { user } = useAuth()
  const [regionFilter, setRegionFilter] = useState('all')
  const [sortBy, setSortBy] = useState('xp')

  const [finance, setFinance] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadData()
    }
  }, [user])

  useRealtime('clinic_settings', () => {
    loadData()
  })

  const loadData = async () => {
    try {
      // Trigger backend to refresh gamification calculations silently
      await pb.send('/backend/v1/gamification/refresh', { method: 'POST' }).catch(() => {})

      const clinicsData = await pb.collection('clinic_settings').getFullList()
      setClinics(clinicsData)

      const [fin, appts, inv] = await Promise.all([
        pb.collection('consultations_finance').getFullList(),
        pb.collection('appointments').getFullList(),
        pb.collection('clinical_inventory').getFullList({ filter: 'is_high_cost = true' }),
      ])

      setFinance(fin)
      setAppointments(appts)
      setInventory(inv)
    } catch (e) {
      console.error(e)
    }
  }

  const regions = useMemo(() => {
    const set = new Set<string>()
    clinics.forEach((c) => c.region && set.add(c.region))
    return Array.from(set).sort()
  }, [clinics])

  const chartData = useMemo(() => {
    const filteredClinics = clinics.filter(
      (c) => regionFilter === 'all' || c.region === regionFilter,
    )

    return filteredClinics
      .map((clinic) => {
        const clinicId = clinic.id
        const revenue = finance
          .filter((f) => f.clinic_id === clinicId)
          .reduce((sum, f) => sum + (f.amount || 0), 0)
        const apptCount = appointments.filter((a) => a.clinic_id === clinicId).length
        const highCostItems = inventory
          .filter((i) => i.clinic_id === clinicId)
          .reduce((sum, i) => sum + (i.current_quantity || 0), 0)

        return {
          id: clinicId,
          name: clinic.name,
          revenue,
          appointments: apptCount,
          highCostItems,
          xp: clinic.xp || 0,
          level: clinic.level || 1,
          tier: clinic.tier || 'Bronze',
          badges: Array.isArray(clinic.badges) ? clinic.badges : [],
        }
      })
      .sort((a, b) => {
        if (sortBy === 'xp') return b.xp - a.xp
        if (sortBy === 'level') return b.level - a.level
        if (sortBy === 'revenue') return b.revenue - a.revenue
        return 0
      })
  }, [clinics, finance, appointments, inventory, regionFilter, sortBy])

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

  const chartConfigRevenue = { revenue: { label: 'Receita Total', color: 'hsl(var(--chart-1))' } }

  const getRankStyle = (index: number) => {
    if (index === 0)
      return 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-yellow-50/10'
    if (index === 1)
      return 'border-slate-300 shadow-[0_0_15px_rgba(148,163,184,0.3)] bg-slate-50/10'
    if (index === 2)
      return 'border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.2)] bg-orange-50/10'
    return ''
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400" />
    if (index === 2) return <Medal className="w-5 h-5 text-orange-500" />
    return <span className="font-bold text-muted-foreground w-5 text-center">{index + 1}</span>
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ranking Regional</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Gamificação e desempenho operacional das unidades.
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
                <SelectItem value="all">Todas as Regiões</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] md:w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xp">Maior XP</SelectItem>
              <SelectItem value="level">Maior Nível</SelectItem>
              <SelectItem value="revenue">Maior Receita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" /> Receita Global vs Unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigRevenue} className="h-[200px] w-full">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Leaderboard de Clínicas
          </CardTitle>
          <CardDescription>
            Classificação baseada em Experience Points (XP) gerados por faturamento e satisfação dos
            pacientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards View */}
          <div className="md:hidden space-y-4">
            {chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma clínica encontrada.</p>
            ) : (
              chartData.map((item, index) => {
                const lvl = getLevelInfo(item.xp)
                return (
                  <Card
                    key={item.id}
                    className={cn('overflow-hidden transition-all', getRankStyle(index))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {getRankIcon(index)}
                          </div>
                          <div className="font-semibold">{item.name}</div>
                        </div>
                        <Badge variant="outline" className={lvl.color}>
                          {item.tier} (Lv {item.level})
                        </Badge>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.xp} XP</span>
                          <span>Próximo: {lvl.nextXp} XP</span>
                        </div>
                        <Progress value={lvl.progress} className="h-2" />
                      </div>

                      {item.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.badges
                            .slice(-3)
                            .reverse()
                            .map((b: any) => {
                              const Icon = BADGE_ICONS[b.icon] || Award
                              return (
                                <Badge
                                  key={b.id}
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 h-5 bg-background"
                                >
                                  <Icon className="w-3 h-3 mr-1 text-amber-500" /> {b.name}
                                </Badge>
                              )
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Nível & Tier</TableHead>
                  <TableHead className="w-1/4">Progresso XP</TableHead>
                  <TableHead>Conquistas Recentes</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                      Nenhuma clínica encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  chartData.map((item, index) => {
                    const lvl = getLevelInfo(item.xp)
                    return (
                      <TableRow
                        key={item.id}
                        className={cn('transition-all duration-300', getRankStyle(index))}
                      >
                        <TableCell className="text-center">
                          <div className="flex justify-center">{getRankIcon(index)}</div>
                        </TableCell>
                        <TableCell className="font-semibold">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={lvl.color}>
                            {item.tier} • Lv {item.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5 w-full pr-4">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{item.xp} XP</span>
                              <span>{lvl.nextXp} XP</span>
                            </div>
                            <Progress value={lvl.progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            {item.badges.length === 0 && (
                              <span className="text-xs text-muted-foreground">Nenhuma ainda</span>
                            )}
                            {item.badges
                              .slice(-3)
                              .reverse()
                              .map((b: any) => {
                                const Icon = BADGE_ICONS[b.icon] || Award
                                return (
                                  <Badge
                                    key={b.id}
                                    variant="secondary"
                                    className="text-xs py-0 h-6 bg-background/80 border whitespace-nowrap"
                                  >
                                    <Icon className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> {b.name}
                                  </Badge>
                                )
                              })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
