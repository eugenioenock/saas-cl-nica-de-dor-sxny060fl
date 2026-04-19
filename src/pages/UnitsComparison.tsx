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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { DollarSign, Calendar, Package } from 'lucide-react'

export default function UnitsComparison() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState('7days')

  const [finance, setFinance] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadData()
    }
  }, [user, dateRange])

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

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

      const [fin, appts, inv] = await Promise.all([
        pb.collection('consultations_finance').getFullList({ filter }),
        pb.collection('appointments').getFullList({ filter: apptFilter }),
        pb.collection('clinical_inventory').getFullList({ filter: 'is_high_cost = true' }),
      ])

      setFinance(fin)
      setAppointments(appts)
      setInventory(inv)
    } catch (e) {
      console.error(e)
    }
  }

  const chartData = useMemo(() => {
    return clinics.map((clinic) => {
      const clinicId = clinic.id
      const clinicFinance = finance.filter((f) => f.clinic_id === clinicId)
      const revenue = clinicFinance.reduce((sum, f) => sum + (f.amount || 0), 0)

      const clinicAppts = appointments.filter((a) => a.clinic_id === clinicId).length

      const clinicInv = inventory.filter((i) => i.clinic_id === clinicId)
      const highCostItems = clinicInv.reduce((sum, i) => sum + (i.current_quantity || 0), 0)

      return {
        name: clinic.name,
        revenue,
        appointments: clinicAppts,
        highCostItems,
      }
    })
  }, [clinics, finance, appointments, inventory])

  const chartConfigRevenue = { revenue: { label: 'Receita (R$)', color: 'hsl(var(--chart-1))' } }
  const chartConfigAppts = { appointments: { label: 'Consultas', color: 'hsl(var(--chart-2))' } }
  const chartConfigInv = {
    highCostItems: { label: 'Itens Alto Custo', color: 'hsl(var(--chart-3))' },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comparativo de Unidades</h1>
          <p className="text-muted-foreground">Compare o desempenho entre as clínicas da rede.</p>
        </div>
        <div className="w-[200px]">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Receita
            </CardTitle>
            <CardDescription>Volume financeiro no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigRevenue} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Consultas
            </CardTitle>
            <CardDescription>Agendamentos no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigAppts} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="appointments"
                  fill="var(--color-appointments)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> Estoque (Alto Custo)
            </CardTitle>
            <CardDescription>Quantidade atual de itens críticos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfigInv} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="highCostItems"
                  fill="var(--color-highCostItems)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
