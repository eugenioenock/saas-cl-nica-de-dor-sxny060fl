import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Activity, TrendingUp } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { format, isSameMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

export default function Index() {
  const [finances, setFinances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const records = await pb.collection('consultations_finance').getFullList({ sort: '-created' })
      setFinances(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('consultations_finance', loadData)

  const now = new Date()

  const currentMonthPaid = finances
    .filter(
      (f) =>
        f.status === 'paid' &&
        (f.due_date
          ? isSameMonth(parseISO(f.due_date), now)
          : isSameMonth(parseISO(f.created), now)),
    )
    .reduce((sum, f) => sum + f.amount, 0)

  const pendingAmount = finances
    .filter((f) => f.status === 'pending')
    .reduce((sum, f) => sum + f.amount, 0)

  const revenuePrediction = finances
    .filter(
      (f) =>
        (f.status === 'paid' || f.status === 'pending') &&
        (f.due_date
          ? isSameMonth(parseISO(f.due_date), now)
          : isSameMonth(parseISO(f.created), now)),
    )
    .reduce((sum, f) => sum + f.amount, 0)

  const monthlyDataMap = finances.reduce(
    (acc, f) => {
      if (f.status === 'cancelled') return acc
      const date = f.due_date ? parseISO(f.due_date) : parseISO(f.created)
      const month = format(date, 'MMM/yy', { locale: ptBR })
      if (!acc[month]) acc[month] = { month, paid: 0, pending: 0 }
      if (f.status === 'paid') acc[month].paid += f.amount
      else if (f.status === 'pending') acc[month].pending += f.amount
      return acc
    },
    {} as Record<string, any>,
  )

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = format(d, 'MMM/yy', { locale: ptBR })
    monthlyData.push(monthlyDataMap[month] || { month, paid: 0, pending: 0 })
  }

  const paymentMethodsMap = finances.reduce(
    (acc, f) => {
      if (f.status === 'paid') {
        const method = f.payment_method || 'unknown'
        acc[method] = (acc[method] || 0) + f.amount
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const paymentMethodsData = Object.entries(paymentMethodsMap).map(([name, value]) => ({
    name:
      name === 'pix'
        ? 'PIX'
        : name === 'card'
          ? 'Cartão'
          : name === 'cash'
            ? 'Dinheiro'
            : name === 'transfer'
              ? 'Transferência'
              : 'Outro',
    value,
  }))

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

  const paymentChartConfig = paymentMethodsData.reduce(
    (acc, d, i) => {
      acc[d.name] = { label: d.name, color: COLORS[i % COLORS.length] }
      return acc
    },
    {} as Record<string, any>,
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
        <p className="text-muted-foreground">Acompanhe a saúde financeira da clínica.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Pago (Mês Atual)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {currentMonthPaid.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebimentos Pendentes</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">R$ {pendingAmount.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão de Receita (Mês Atual)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {revenuePrediction.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                paid: { label: 'Pago', color: 'hsl(var(--chart-1))' },
                pending: { label: 'Pendente', color: 'hsl(var(--chart-2))' },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Métodos de Pagamento (Pagos)</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center h-[300px]">
            {paymentMethodsData.length > 0 ? (
              <ChartContainer config={paymentChartConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent valueFormatter={(v) => `R$ ${v}`} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} className="flex-wrap" />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm">
                Nenhum dado de pagamento pago disponível.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
