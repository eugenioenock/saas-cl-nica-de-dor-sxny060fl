import { useState, useEffect, useMemo } from 'react'
import { format, isBefore, subDays } from 'date-fns'
import { PenLine, Loader2, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function SignatureAudit() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [clinics, setClinics] = useState<any[]>([])

  const [clinicFilter, setClinicFilter] = useState<string>('all')
  const [profFilter, setProfFilter] = useState<string>('all')

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.role === 'admin') {
          const clinicsRes = await pb.collection('clinic_settings').getFullList()
          setClinics(clinicsRes)
        }

        const notesRes = await pb.collection('medical_notes').getFullList({
          filter: "is_signed = false && status = 'completed'",
          expand: 'patient_id,clinic_id',
          sort: '-created',
        })
        setNotes(notesRes)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.role])

  const professionals = useMemo(() => {
    const profs = new Set(notes.map((n) => n.professionalId).filter(Boolean))
    return Array.from(profs)
  }, [notes])

  const filteredNotes = notes.filter((n) => {
    if (clinicFilter !== 'all' && n.clinic_id !== clinicFilter) return false
    if (profFilter !== 'all' && n.professionalId !== profFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria de Assinaturas</h1>
          <p className="text-muted-foreground">
            Monitore os prontuários concluídos que ainda estão pendentes de assinatura do paciente.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Prontuários Pendentes
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para localizar prontuários. Itens vermelhos estão pendentes há
            mais de 7 dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {user?.role === 'admin' && (
              <div className="w-full sm:w-64">
                <Select value={clinicFilter} onValueChange={setClinicFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as Clínicas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Clínicas</SelectItem>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-full sm:w-64">
              <Select value={profFilter} onValueChange={setProfFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Profissionais</SelectItem>
                  {professionals.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Data do Procedimento</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  {user?.role === 'admin' && <TableHead>Clínica</TableHead>}
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => {
                  const isOld = isBefore(new Date(note.created), subDays(new Date(), 7))
                  return (
                    <TableRow key={note.id}>
                      <TableCell>
                        <Badge
                          variant={isOld ? 'destructive' : 'secondary'}
                          className="flex w-fit items-center gap-1"
                        >
                          {isOld && <AlertTriangle className="h-3 w-3" />}
                          {isOld ? '+7 Dias' : 'Recente'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(note.created), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">
                        {note.expand?.patient_id?.name || 'Desconhecido'}
                      </TableCell>
                      <TableCell>{note.professionalId || 'N/A'}</TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-muted-foreground text-sm">
                          {note.expand?.clinic_id?.name || 'N/A'}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/pacientes/${note.patient_id}`}>
                            Solicitar Assinatura
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredNotes.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={user?.role === 'admin' ? 6 : 5}
                      className="h-24 text-center"
                    >
                      Nenhum prontuário pendente de assinatura encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
