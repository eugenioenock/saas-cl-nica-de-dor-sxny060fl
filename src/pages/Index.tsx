import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, Activity, AlertTriangle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Link } from 'react-router-dom'

export default function Index() {
  const [totalPatients, setTotalPatients] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState<any[]>([])
  const [criticalPatients, setCriticalPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const patientsRes = await pb.collection('patients').getList(1, 1)
      setTotalPatients(patientsRes.totalItems)

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

      const critical = await pb.collection('pain_points').getList(1, 50, {
        filter: 'intensity >= 8',
        sort: '-created',
        expand: 'patient_id',
      })

      const seen = new Set()
      const dedupedCritical = []
      for (const pt of critical.items) {
        if (!seen.has(pt.patient_id)) {
          seen.add(pt.patient_id)
          dedupedCritical.push(pt)
        }
      }
      setCriticalPatients(dedupedCritical)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Clínico</h1>
        <p className="text-muted-foreground">Resumo diário e alertas críticos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{totalPatients}</div>
            )}
            <p className="text-xs text-muted-foreground">Pacientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Consultas marcadas para hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticos</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{criticalPatients.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Pacientes com dor ≥ 8</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Pacientes em Estado Crítico
            </CardTitle>
            <CardDescription>Último registro de dor com intensidade ≥ 8.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))
                ) : criticalPatients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum alerta crítico no momento.
                  </p>
                ) : (
                  criticalPatients.map((pt) => (
                    <Link
                      key={pt.id}
                      to={`/pacientes/${pt.patient_id}`}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-muted/50 p-2 rounded-md transition-colors -mx-2"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none text-primary hover:underline">
                          {pt.expand?.patient_id?.name || 'Paciente Desconhecido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pt.created).toLocaleDateString()} -{' '}
                          {pt.name || 'Ponto sem nome'}
                        </p>
                      </div>
                      <Badge variant="destructive" className="ml-auto">
                        Intensidade {pt.intensity}
                      </Badge>
                    </Link>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Agenda do Dia
            </CardTitle>
            <CardDescription>Consultas e procedimentos para hoje.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))
                ) : todayAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma consulta para hoje.
                  </p>
                ) : (
                  todayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {apt.expand?.patient_id?.name || 'Paciente Desconhecido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {apt.content
                            ? apt.content.substring(0, 50) + (apt.content.length > 50 ? '...' : '')
                            : 'Sem descrição'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold">
                          {new Date(apt.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            apt.status === 'completed'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : apt.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : ''
                          }
                        >
                          {apt.status === 'completed'
                            ? 'Concluído'
                            : apt.status === 'cancelled'
                              ? 'Cancelado'
                              : 'Agendado'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
