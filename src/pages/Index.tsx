import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, AlertTriangle, DollarSign, Activity, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Link } from 'react-router-dom'

export default function Index() {
  const [totalPatients, setTotalPatients] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [criticalPatients, setCriticalPatients] = useState<any[]>([])
  const [revenue, setRevenue] = useState(0)
  const [pending, setPending] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [needsFollowUp, setNeedsFollowUp] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const patientsRes = await pb.collection('patients').getFullList({ sort: '-created' })
      setTotalPatients(patientsRes.length)

      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const notes = await pb.collection('medical_notes').getFullList({
        filter: `date >= "${start.toISOString().replace('T', ' ')}" && date <= "${end.toISOString().replace('T', ' ')}"`,
        expand: 'patient_id',
        sort: 'date',
      })
      setTodayAppointments(notes)

      const critical = await pb
        .collection('pain_points')
        .getList(1, 50, { filter: 'intensity >= 8', sort: '-created', expand: 'patient_id' })
      const seen = new Set()
      const dedupedCritical = []
      for (const pt of critical.items) {
        if (!seen.has(pt.patient_id)) {
          seen.add(pt.patient_id)
          dedupedCritical.push(pt)
        }
      }
      setCriticalPatients(dedupedCritical)

      const finances = await pb
        .collection('consultations_finance')
        .getFullList({ expand: 'patient_id', sort: '-created' })
      setRevenue(finances.filter((f) => f.status === 'paid').reduce((a, f) => a + f.amount, 0))
      setPending(finances.filter((f) => f.status === 'pending').reduce((a, f) => a + f.amount, 0))
      setRecentTransactions(finances.slice(0, 5))

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentNotes = await pb
        .collection('medical_notes')
        .getFullList({ filter: `created >= "${thirtyDaysAgo.toISOString().replace('T', ' ')}"` })
      const activeIds = new Set(recentNotes.map((n) => n.patient_id))
      setNeedsFollowUp(patientsRes.filter((p) => !activeIds.has(p.id)))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('patients', loadData)
  useRealtime('medical_notes', loadData)
  useRealtime('pain_points', loadData)
  useRealtime('consultations_finance', loadData)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Clínico</h1>
        <p className="text-muted-foreground">Resumo geral de atividades e finanças.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : todayAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Paga)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {loading ? '-' : revenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber (Pendente)</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              R$ {loading ? '-' : pending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Alertas Críticos (Dor ≥ 8)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px]">
              <div className="space-y-4 pr-4">
                {criticalPatients.map((pt) => (
                  <Link
                    key={pt.id}
                    to={`/pacientes/${pt.patient_id}`}
                    className="flex justify-between items-center border-b pb-2 last:border-0 hover:bg-muted p-2 rounded -mx-2"
                  >
                    <div>
                      <p className="text-sm font-medium hover:underline">
                        {pt.expand?.patient_id?.name || 'Desconhecido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pt.created).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">Nível {pt.intensity}</Badge>
                  </Link>
                ))}
                {!loading && criticalPatients.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem alertas críticos.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" /> Necessita Retorno (30+ dias)
            </CardTitle>
            <CardDescription>Pacientes sem prontuário recente.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[230px]">
              <div className="space-y-4 pr-4">
                {needsFollowUp.map((pt) => (
                  <div
                    key={pt.id}
                    className="flex justify-between items-center border-b pb-2 last:border-0"
                  >
                    <p className="text-sm font-medium">{pt.name}</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/pacientes/${pt.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
                {!loading && needsFollowUp.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Todos os pacientes estão atualizados.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{tx.expand?.patient_id?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className={
                        tx.status === 'paid'
                          ? 'text-green-600'
                          : tx.status === 'pending'
                            ? 'text-orange-500'
                            : ''
                      }
                    >
                      {tx.status}
                    </Badge>
                    <span className="font-semibold">R$ {tx.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {!loading && recentTransactions.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma transação.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
