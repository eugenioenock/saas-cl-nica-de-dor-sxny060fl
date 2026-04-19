import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Loader2, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react'
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart'

interface FinanceRecord {
  id: string
  amount: number
  status: string
  clinic_id: string
  created: string
}

interface InventoryRecord {
  id: string
  name: string
  current_quantity: number
  min_quantity: number
  clinic_id: string
}

export default function MatrixDashboard() {
  const { user } = useAuth()
  const [clinics, setClinics] = useState<any[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string>('all')
  const [finances, setFinances] = useState<FinanceRecord[]>([])
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [clinicsData, financeData, inventoryData] = await Promise.all([
          pb.collection('clinic_settings').getFullList({ sort: 'name' }),
          pb.collection('consultations_finance').getFullList<FinanceRecord>(),
          pb.collection('clinical_inventory').getFullList<InventoryRecord>(),
        ])
        setClinics(clinicsData)
        setFinances(financeData)
        setInventory(inventoryData)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredFinances = useMemo(() => {
    if (selectedClinic === 'all') return finances
    return finances.filter((f) => f.clinic_id === selectedClinic)
  }, [finances, selectedClinic])

  const filteredInventory = useMemo(() => {
    if (selectedClinic === 'all') return inventory
    return inventory.filter((i) => i.clinic_id === selectedClinic)
  }, [inventory, selectedClinic])

  const kpis = useMemo(() => {
    let totalRevenue = 0
    let pendingRevenue = 0
    let lowStockCount = 0

    filteredFinances.forEach((f) => {
      if (f.status === 'paid') totalRevenue += f.amount
      if (f.status === 'pending' || f.status === 'transfer_pending') pendingRevenue += f.amount
    })

    filteredInventory.forEach((i) => {
      if (i.current_quantity <= i.min_quantity) lowStockCount++
    })

    return { totalRevenue, pendingRevenue, lowStockCount }
  }, [filteredFinances, filteredInventory])

  const chartData = useMemo(() => {
    const map: Record<string, { name: string; faturado: number; pendente: number }> = {}

    clinics.forEach((c) => {
      if (selectedClinic === 'all' || selectedClinic === c.id) {
        map[c.id] = { name: c.name, faturado: 0, pendente: 0 }
      }
    })

    filteredFinances.forEach((f) => {
      const clinicId = f.clinic_id
      if (map[clinicId]) {
        if (f.status === 'paid') map[clinicId].faturado += f.amount
        if (f.status === 'pending' || f.status === 'transfer_pending')
          map[clinicId].pendente += f.amount
      }
    })

    return Object.values(map).filter((d) => d.faturado > 0 || d.pendente > 0)
  }, [filteredFinances, clinics, selectedClinic])

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Matriz</h1>
          <p className="text-muted-foreground">
            Visão global de performance e indicadores de todas as unidades.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedClinic} onValueChange={setSelectedClinic}>
            <SelectTrigger>
              <SelectValue placeholder="Filtro de Clínica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Clínicas (Global)</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Global (Paga)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              R$ {kpis.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Consolidado em tempo real</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Pendente</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              R$ {kpis.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando pagamento/repasse</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Estoque Global</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpis.lowStockCount} itens</div>
            <p className="text-xs text-muted-foreground">Abaixo da quantidade mínima</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Comparativo Financeiro por Unidade</CardTitle>
          <CardDescription>Receita paga vs pendente distribuída entre as clínicas</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {chartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Sem dados financeiros para o filtro selecionado.
            </div>
          ) : (
            <ChartContainer
              config={{
                faturado: {
                  label: 'Faturado',
                  color: 'hsl(var(--primary))',
                },
                pendente: {
                  label: 'Pendente',
                  color: 'hsl(var(--destructive))',
                },
              }}
              className="h-[350px] w-full"
            >
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => `R$${value}`}
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="faturado" fill="var(--color-faturado)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendente" fill="var(--color-pendente)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
