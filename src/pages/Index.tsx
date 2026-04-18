import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts'
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertCircle,
  ShoppingCart,
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
  const [abcData, setAbcData] = useState<any[]>([])
  const [criticalStock, setCriticalStock] = useState<any[]>([])
  const [recentCounts, setRecentCounts] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [
        patients,
        appointments,
        finances,
        usersRes,
        feedbacks,
        usageRecords,
        inventoryRes,
        countsRes,
      ] = await Promise.all([
        pb.collection('patients').getFullList(),
        pb.collection('appointments').getFullList(),
        pb.collection('consultations_finance').getFullList({ expand: 'medical_note_id' }),
        pb.collection('users').getFullList(),
        pb.collection('feedbacks').getFullList(),
        pb.collection('inventory_usage').getFullList({ expand: 'batch_id.material_id' }),
        pb.collection('clinical_inventory').getFullList(),
        pb
          .collection('inventory_counts')
          .getList(1, 10, { sort: '-created', expand: 'material_id,professional_id' }),
      ])

      setRecentCounts(countsRes.items)

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

      // ABC Curve Logic
      const materialCostMap = new Map<string, { name: string; totalValue: number }>()
      usageRecords.forEach((u) => {
        const batch = u.expand?.batch_id
        const material = batch?.expand?.material_id
        if (material && batch) {
          const cost = u.quantity_used * (batch.cost_price || 0)
          if (cost > 0) {
            const existing = materialCostMap.get(material.id)
            if (existing) {
              existing.totalValue += cost
            } else {
              materialCostMap.set(material.id, { name: material.name, totalValue: cost })
            }
          }
        }
      })
      const sortedMaterials = Array.from(materialCostMap.values()).sort(
        (a, b) => b.totalValue - a.totalValue,
      )
      const totalOverallValue = sortedMaterials.reduce((sum, m) => sum + m.totalValue, 0)

      let cumulative = 0
      const abcItems = sortedMaterials.map((m) => {
        cumulative += m.totalValue
        const percentage = (cumulative / totalOverallValue) * 100
        let category = 'C'
        if (percentage <= 70) category = 'A'
        else if (percentage <= 90) category = 'B'
        return { ...m, category }
      })

      const abcSummary = [
        {
          name: 'Cat A (70%)',
          value: abcItems
            .filter((m) => m.category === 'A')
            .reduce((sum, m) => sum + m.totalValue, 0),
          fill: 'hsl(var(--destructive))',
        },
        {
          name: 'Cat B (20%)',
          value: abcItems
            .filter((m) => m.category === 'B')
            .reduce((sum, m) => sum + m.totalValue, 0),
          fill: 'hsl(var(--warning))',
        },
        {
          name: 'Cat C (10%)',
          value: abcItems
            .filter((m) => m.category === 'C')
            .reduce((sum, m) => sum + m.totalValue, 0),
          fill: 'hsl(var(--primary))',
        },
      ].filter((item) => item.value > 0)
      setAbcData(abcSummary)

      // Critical Stock
      const critical = inventoryRes.filter((item) => item.current_quantity <= item.min_quantity)
      setCriticalStock(critical)
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
  useRealtime('inventory_counts', loadData)

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ABC Curve */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Curva ABC - Consumo de Estoque</CardTitle>
            <CardDescription>
              Classificação financeira dos materiais (A: 70%, B: 20%, C: 10%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {abcData.length > 0 ? (
              <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={abcData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {abcData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados de consumo para análise ABC
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Counts / Discrepancies */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Auditoria de Estoque (Físico x Sistema)</CardTitle>
            <CardDescription>Últimas contagens e divergências encontradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCounts.length > 0 ? (
              <div className="space-y-4 mt-4">
                {recentCounts.map((count) => {
                  const isLoss = count.discrepancy < 0
                  return (
                    <div
                      key={count.id}
                      className="flex items-center justify-between border-b pb-2 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {count.expand?.material_id?.name || 'Material'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(count.created).toLocaleDateString()} por{' '}
                          {count.expand?.professional_id?.name?.split(' ')[0] || 'Staff'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold">Físico: {count.actual_quantity}</span>
                        {count.discrepancy !== 0 ? (
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              isLoss ? 'text-destructive' : 'text-green-600',
                            )}
                          >
                            {isLoss ? 'Perda:' : 'Sobra:'}{' '}
                            {count.discrepancy > 0 ? `+${count.discrepancy}` : count.discrepancy}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sincronizado</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhuma contagem registrada.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Stock */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Estoque Crítico
              </CardTitle>
              <CardDescription>Materiais abaixo da quantidade mínima</CardDescription>
            </div>
            <Link to="/inventory/orders">
              <ShoppingCart className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
          </CardHeader>
          <CardContent>
            {criticalStock.length > 0 ? (
              <div className="space-y-4 mt-4">
                {criticalStock.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Mínimo: {item.min_quantity} {item.unit}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-destructive font-bold text-sm">
                        {item.current_quantity} {item.unit}
                      </span>
                      <Link
                        to="/inventory/orders"
                        className="text-[10px] text-primary hover:underline"
                      >
                        Ver Pedidos
                      </Link>
                    </div>
                  </div>
                ))}
                {criticalStock.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    + {criticalStock.length - 5} outros itens críticos
                  </p>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Nenhum item em estado crítico
              </div>
            )}
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
