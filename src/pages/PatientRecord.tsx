import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppContext } from '@/hooks/use-app-context'
import { mockPatients, mockAppointments, mockUsers, Appointment } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Phone, Mail, Calendar, FileText, Activity } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BodyMap } from '@/components/medical/body-map'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProcedureModal } from '@/components/medical/procedure-modal'

const calculateAge = (dob: string) => {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export default function PatientRecord() {
  const { activeClinic } = useAppContext()
  const { id } = useParams()

  const [localProcedures, setLocalProcedures] = useState<Appointment[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  const patient = useMemo(
    () => mockPatients.find((p) => p.id === id && p.clinicId === activeClinic.id),
    [id, activeClinic.id],
  )

  useEffect(() => {
    if (patient && !isInitialized) {
      setLocalProcedures(
        mockAppointments
          .filter((apt) => apt.patientId === patient.id && apt.clinicId === activeClinic.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      )
      setIsInitialized(true)
    }
  }, [patient, activeClinic.id, isInitialized])

  const handleAddProcedure = useCallback((newProcedure: Appointment) => {
    setLocalProcedures((prev) =>
      [newProcedure, ...prev].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    )
  }, [])

  if (!patient) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[50vh] text-center">
        <h2 className="text-2xl font-bold mb-4">Paciente não encontrado</h2>
        <p className="text-muted-foreground mb-6">
          O paciente que você está procurando não existe ou não pertence a esta clínica.
        </p>
        <Button asChild>
          <Link to="/pacientes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
          </Link>
        </Button>
      </div>
    )
  }

  const getProfessionalName = (profId?: string) => {
    if (!profId) return 'Não atribuído'
    const user = mockUsers.find((u) => u.id === profId)
    return user ? user.name : 'Desconhecido'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">
            Concluído
          </Badge>
        )
      case 'scheduled':
        return (
          <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-200">
            Agendado
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button variant="outline" asChild className="shrink-0">
          <Link to="/pacientes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prontuário do Paciente</h1>
          <p className="text-muted-foreground">Visão detalhada e histórico clínico</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-2xl flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            {patient.name}
          </CardTitle>
          <CardDescription>Resumo de informações do paciente</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Idade / Nasc.
              </p>
              <p className="font-medium">
                {calculateAge(patient.dob)} anos (
                {new Date(patient.dob).toLocaleDateString('pt-BR')})
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Documento (CPF)
              </p>
              <p className="font-medium">{patient.document}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contato
              </p>
              <p className="font-medium">{(patient as any).phone || '(11) 99999-9999'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" /> E-mail
              </p>
              <p className="font-medium">{(patient as any).email || 'Não informado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="procedures" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="procedures">Procedimentos</TabsTrigger>
          <TabsTrigger value="map">Mapa Anatômico</TabsTrigger>
        </TabsList>

        <TabsContent value="procedures" className="mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Procedimentos
                </CardTitle>
                <CardDescription>
                  Histórico de todos os procedimentos clínicos associados a este paciente.
                </CardDescription>
              </div>
              <ProcedureModal patientId={patient.id} onAdd={handleAddProcedure} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6">Data</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead>Profissional Responsável</TableHead>
                    <TableHead className="text-right px-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localProcedures.length > 0 ? (
                    localProcedures.map((proc) => (
                      <TableRow key={proc.id}>
                        <TableCell className="px-6 whitespace-nowrap">
                          {new Date(proc.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell
                          className="font-medium max-w-[300px] truncate"
                          title={proc.procedure}
                        >
                          {proc.procedure}
                        </TableCell>
                        <TableCell>{getProfessionalName(proc.professionalId)}</TableCell>
                        <TableCell className="text-right px-6">
                          {getStatusBadge(proc.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground/30" />
                          <p>Nenhum procedimento encontrado.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pontos de Dor & Patologias</CardTitle>
              <CardDescription>
                Mapa interativo com os registros anatômicos do paciente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BodyMap patientId={patient.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
