import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Calendar, CheckCircle2, Clock, XCircle, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useAppContext } from '@/hooks/use-app-context'
import { useRealtime } from '@/hooks/use-realtime'
import { updateAppointment, type Appointment } from '@/services/appointments'
import { PatientRegistrationDialog } from '@/components/reception/patient-registration-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function ReceptionDashboard() {
  const { activeClinic } = useAppContext()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadAppointments = async () => {
    if (!activeClinic?.id) return
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startStr = today.toISOString().split('T')[0] + ' 00:00:00'
      const endStr = today.toISOString().split('T')[0] + ' 23:59:59'

      const res = await pb.collection('appointments').getFullList<Appointment>({
        filter: `start_time >= "${startStr}" && start_time <= "${endStr}" && clinic_id = "${activeClinic.id}"`,
        expand: 'patient_id,professional_id',
        sort: 'start_time',
      })
      setAppointments(res)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [activeClinic?.id])

  useRealtime('appointments', () => {
    loadAppointments()
  })

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointment(id, { status })
      toast.success('Status atualizado')
    } catch (e) {
      toast.error('Erro ao atualizar status')
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      apt.expand?.patient_id?.name.toLowerCase().includes(s) ||
      apt.expand?.professional_id?.name?.toLowerCase().includes(s) ||
      apt.specialty?.toLowerCase().includes(s)
    )
  })

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Agendado
          </Badge>
        )
      case 'confirmed':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            Em Espera
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            Concluído
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0 pb-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 md:pt-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recepção</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }).replace(/^\w/, (c) =>
              c.toUpperCase(),
            )}
          </p>
        </div>
        <PatientRegistrationDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Espera (Confirmado)</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Agenda do Dia</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente ou profissional..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Horário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional / Espec.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Nenhum agendamento encontrado para hoje.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(apt.start_time), 'HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{apt.expand?.patient_id?.name}</div>
                        <div className="text-xs text-muted-foreground">{apt.title}</div>
                      </TableCell>
                      <TableCell>
                        <div>{apt.expand?.professional_id?.name || 'Profissional'}</div>
                        <div className="text-xs text-muted-foreground">{apt.specialty || '-'}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(apt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {apt.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 border-amber-200"
                              onClick={() => handleStatusChange(apt.id, 'confirmed')}
                            >
                              Check-in
                            </Button>
                          )}
                          {apt.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-200"
                              onClick={() => handleStatusChange(apt.id, 'completed')}
                            >
                              Concluir
                            </Button>
                          )}
                          {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleStatusChange(apt.id, 'cancelled')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
