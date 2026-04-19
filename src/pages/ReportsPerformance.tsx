import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export default function ReportsPerformance() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [materialId, setMaterialId] = useState('all')

  useEffect(() => {
    pb.collection('clinical_inventory')
      .getFullList({ sort: 'name' })
      .then(setMaterials)
      .catch(console.error)
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const usageFilter = []
      if (startDate) usageFilter.push(`usage_date >= "${startDate} 00:00:00"`)
      if (endDate) usageFilter.push(`usage_date <= "${endDate} 23:59:59"`)

      const apptFilter = []
      if (startDate) apptFilter.push(`start_time >= "${startDate} 00:00:00"`)
      if (endDate) apptFilter.push(`start_time <= "${endDate} 23:59:59"`)

      const [usages, appts, users] = await Promise.all([
        pb
          .collection('inventory_usage')
          .getFullList({ filter: usageFilter.join(' && '), expand: 'batch_id' }),
        pb.collection('appointments').getFullList({ filter: apptFilter.join(' && ') }),
        pb.collection('users').getFullList({ filter: 'role = "professional" || role = "admin"' }),
      ])

      const stats: Record<string, any> = {}
      users.forEach((u) => {
        stats[u.id] = { id: u.id, name: u.name || u.email, appointments: 0, usage: 0 }
      })

      appts.forEach((a) => {
        if (stats[a.professional_id]) stats[a.professional_id].appointments++
      })

      usages.forEach((u) => {
        if (materialId !== 'all') {
          if (u.expand?.batch_id?.material_id !== materialId) return
        }
        if (stats[u.professional_id]) stats[u.professional_id].usage += u.quantity_used
      })

      const finalData = Object.values(stats).map((s) => ({
        ...s,
        ratio: s.appointments > 0 ? (s.usage / s.appointments).toFixed(2) : '0.00',
      }))

      setData(finalData.filter((d) => d.appointments > 0 || d.usage > 0))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Desempenho e Consumo</h1>
        <p className="text-muted-foreground">
          Análise de eficiência do uso de materiais por profissional.
        </p>
      </div>

      <Card>
        <CardContent className="py-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data Final</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Label>Material</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Materiais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Materiais</SelectItem>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Filtrar
          </Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consumo por Profissional</CardTitle>
            <CardDescription>Total de insumos utilizados no período</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data.length > 0 ? (
              <ChartContainer
                config={{ usage: { label: 'Insumos Usados', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="usage" fill="var(--color-usage)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado para exibir.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tabela de Eficiência</CardTitle>
            <CardDescription>Relação entre procedimentos e insumos usados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Procedimentos</TableHead>
                  <TableHead>Insumos</TableHead>
                  <TableHead>Eficiência (Ins/Proc)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.appointments}</TableCell>
                    <TableCell>{d.usage}</TableCell>
                    <TableCell>{d.ratio}</TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum dado encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
