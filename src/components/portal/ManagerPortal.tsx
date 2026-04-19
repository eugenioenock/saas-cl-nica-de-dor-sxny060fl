import { useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, DollarSign, Users, Star, Megaphone, AlertTriangle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-1))' },
}

export function ManagerPortal() {
  const { activeClinic } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    revenue: 0,
    appointments: 0,
    avgRating: 0,
    momRevenuePercent: 0,
    momRevenueTrend: 'neutral',
  })
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  const loadData = async () => {
    if (!activeClinic?.id) return
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const dateStr = thirtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      const date60Str = sixtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

      const [finances, appts, feedbacks, news, oldFinances] = await Promise.all([
        pb.collection('consultations_finance').getFullList({
          filter: `clinic_id = "${activeClinic.id}" && status = 'paid' && created >= "${dateStr}"`,
        }),
        pb.collection('appointments').getFullList({
          filter: `clinic_id = "${activeClinic.id}" && created >= "${dateStr}"`,
        }),
        pb.collection('feedbacks').getFullList({
          filter: `clinic_id = "${activeClinic.id}" && created >= "${dateStr}"`,
        }),
        pb.collection('announcements').getFullList({
          filter: `clinic_id = "" || clinic_id = "${activeClinic.id}"`,
          sort: '-created',
        }),
        pb.collection('consultations_finance').getFullList({
          filter: `clinic_id = "${activeClinic.id}" && status = 'paid' && created >= "${date60Str}" && created < "${dateStr}"`,
        }),
      ])

      const revenue = finances.reduce((sum, f) => sum + f.amount, 0)
      const oldRevenue = oldFinances.reduce((sum, f) => sum + f.amount, 0)
      let momRevenuePercent = 0
      let momRevenueTrend = 'neutral'

      if (oldRevenue > 0) {
        momRevenuePercent = ((revenue - oldRevenue) / oldRevenue) * 100
        momRevenueTrend = momRevenuePercent > 0 ? 'up' : momRevenuePercent < 0 ? 'down' : 'neutral'
      } else if (revenue > 0) {
        momRevenuePercent = 100
        momRevenueTrend = 'up'
      }

      const avgRating = feedbacks.length
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0

      setMetrics({
        revenue,
        appointments: appts.length,
        avgRating,
        momRevenuePercent,
        momRevenueTrend,
      })
      setAnnouncements(news)

      const days = [...Array(7)]
        .map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          return d.toISOString().split('T')[0]
        })
        .reverse()

      const cData = days.map((day) => {
        const dayRevs = finances
          .filter((f) => f.created.startsWith(day))
          .reduce((sum, f) => sum + f.amount, 0)
        return { date: day.substring(5), revenue: dayRevs }
      })
      setChartData(cData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeClinic?.id])
  useRealtime('consultations_finance', loadData)
  useRealtime('appointments', loadData)
  useRealtime('announcements', loadData)

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin text-primary" />
      </div>
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portal do Gestor Local</h1>
        <p className="text-muted-foreground">
          Métricas isoladas e comunicados da Matriz para a unidade: {activeClinic?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (30 dias)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {metrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência (MoM)</CardTitle>
            {metrics.momRevenueTrend === 'up' ? (
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
              >
                +{metrics.momRevenuePercent.toFixed(1)}%
              </Badge>
            ) : metrics.momRevenueTrend === 'down' ? (
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"
              >
                {metrics.momRevenuePercent.toFixed(1)}%
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200"
              >
                0%
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-4">Comparado aos 30 dias anteriores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.appointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgRating.toFixed(1)} / 5.0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Comunicados da Rede
            </CardTitle>
            <CardDescription>Avisos e informativos emitidos pela Matriz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum comunicado recente.</p>
            ) : (
              announcements.map((a) => (
                <Alert
                  key={a.id}
                  variant={a.priority === 'urgent' ? 'destructive' : 'default'}
                  className={a.priority === 'urgent' ? 'bg-destructive/10' : 'bg-muted/50'}
                >
                  {a.priority === 'urgent' && <AlertTriangle className="h-4 w-4" />}
                  <AlertTitle className="font-semibold flex items-center justify-between">
                    {a.title}
                    <Badge
                      variant={a.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs uppercase"
                    >
                      {a.priority}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-sm whitespace-pre-wrap">
                    {a.content}
                  </AlertDescription>
                  <div className="text-xs text-muted-foreground mt-2 font-mono">
                    {new Date(a.created).toLocaleDateString()}
                  </div>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução de Faturamento (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
