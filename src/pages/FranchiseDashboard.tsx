import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, DollarSign, Activity } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

export default function FranchiseDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    totalRevenue: number
    totalAppointments: number
    chartData: any[]
  }>({ totalRevenue: 0, totalAppointments: 0, chartData: [] })

  useEffect(() => {
    const loadData = async () => {
      try {
        const clinics = await pb.collection('clinic_settings').getFullList()
        const finances = await pb.collection('consultations_finance').getFullList({
          filter: `status = 'paid'`,
        })
        const appointments = await pb.collection('appointments').getFullList()

        const revenueByClinic: Record<string, number> = {}
        const apptsByClinic: Record<string, number> = {}

        clinics.forEach((c) => {
          revenueByClinic[c.id] = 0
          apptsByClinic[c.id] = 0
        })

        let totalRevenue = 0
        finances.forEach((f) => {
          if (f.clinic_id && revenueByClinic[f.clinic_id] !== undefined) {
            revenueByClinic[f.clinic_id] += f.amount
            totalRevenue += f.amount
          }
        })

        let totalAppointments = appointments.length
        appointments.forEach((a) => {
          if (a.clinic_id && apptsByClinic[a.clinic_id] !== undefined) {
            apptsByClinic[a.clinic_id] += 1
          }
        })

        const chartData = clinics.map((c) => ({
          name: c.name,
          revenue: revenueByClinic[c.id],
          appointments: apptsByClinic[c.id],
        }))

        setData({ totalRevenue, totalAppointments, chartData })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Master Dashboard da Franquia
        </h1>
        <p className="text-muted-foreground">Visão consolidada de todas as unidades da rede.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total da Franquia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? '...'
                : `R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume de Atendimentos Geral</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : data.totalAppointments}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance por Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ChartContainer
                config={{
                  revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-1))' },
                  appointments: { label: 'Atendimentos', color: 'hsl(var(--chart-2))' },
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill="var(--color-revenue)"
                      radius={[4, 4, 0, 0]}
                      name="Receita (R$)"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="appointments"
                      fill="var(--color-appointments)"
                      radius={[4, 4, 0, 0]}
                      name="Atendimentos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
