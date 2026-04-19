import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useAppContext } from '@/hooks/use-app-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Printer, Users, Calendar, DollarSign, Package } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export default function Index() {
  const { user } = useAuth()
  const { activeClinic } = useAppContext()
  const [stats, setStats] = useState({
    patients: 0,
    appointmentsToday: 0,
    revenue: 0,
    lowStock: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      if (!activeClinic?.id) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      try {
        const [pts, appts, finances, inv] = await Promise.all([
          pb.collection('patients').getList(1, 1, { filter: `clinic_id="${activeClinic.id}"` }),
          pb.collection('appointments').getList(1, 1, {
            filter: `clinic_id="${activeClinic.id}" && start_time >= "${today.toISOString()}" && start_time < "${tomorrow.toISOString()}"`,
          }),
          pb.collection('consultations_finance').getFullList({
            filter: `clinic_id="${activeClinic.id}" && status="paid" && created >= "${startOfMonth.toISOString()}"`,
          }),
          pb.collection('clinical_inventory').getFullList({
            filter: `clinic_id="${activeClinic.id}"`,
          }),
        ])

        const revenue = finances.reduce((acc, curr) => acc + curr.amount, 0)
        const lowStock = inv.filter((i) => i.current_quantity <= i.min_quantity).length

        setStats({
          patients: pts.totalItems,
          appointmentsToday: appts.totalItems,
          revenue,
          lowStock,
        })

        // Simple mock visualization logic based on accumulated revenue
        setChartData([
          { name: 'Semana 1', valor: revenue * 0.15 },
          { name: 'Semana 2', valor: revenue * 0.25 },
          { name: 'Semana 3', valor: revenue * 0.4 },
          { name: 'Semana 4', valor: revenue * 0.2 },
        ])
      } catch (err) {
        console.error(err)
      }
    }
    loadData()
  }, [activeClinic?.id])

  const handleExportCSV = () => {
    const csv = `Métrica,Valor\nPacientes Cadastrados,${stats.patients}\nConsultas Hoje,${stats.appointmentsToday}\nFaturamento Mensal,${stats.revenue}\nItens com Estoque Baixo,${stats.lowStock}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const showFinancials = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumo de performance da unidade {activeClinic?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.patients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
          </CardContent>
        </Card>
        {showFinancials && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Faturamento (Mês)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ {stats.revenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
        {showFinancials && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
              <Package className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.lowStock} itens</div>
            </CardContent>
          </Card>
        )}
      </div>

      {showFinancials && (
        <Card className="print:break-inside-avoid mt-6">
          <CardHeader>
            <CardTitle>Evolução Financeira Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ valor: { label: 'Receita', color: 'hsl(var(--primary))' } }}
              className="h-[300px] w-full"
            >
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => `R$${v}`} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Print specific layout additions */}
      <div className="hidden print:block mt-8">
        <div className="pt-4 border-t-2 border-black">
          <p className="text-sm text-gray-500 font-semibold mb-1">
            Relatório gerado em: {new Date().toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 font-semibold mb-1">
            Unidade Referência: {activeClinic?.name}
          </p>
          <p className="text-sm text-gray-500 font-semibold">
            Responsável: {user?.name || user?.email}
          </p>
        </div>
      </div>
    </div>
  )
}
