import { useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { mockPatients } from '@/lib/data'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Plus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Patients() {
  const { activeClinic } = useAppContext()
  const [searchTerm, setSearchTerm] = useState('')

  const patients = mockPatients.filter(
    (p) =>
      p.clinicId === activeClinic.id &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.document.includes(searchTerm)),
  )

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie o registro de pacientes da clínica.</p>
        </div>
        <Button className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Novo Paciente
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou CPF..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Nome</TableHead>
                <TableHead>Documento (CPF)</TableHead>
                <TableHead>Idade / Data de Nasc.</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right px-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="px-6 font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.document}</TableCell>
                    <TableCell>
                      {calculateAge(patient.dob)} anos (
                      {new Date(patient.dob).toLocaleDateString('pt-BR')})
                    </TableCell>
                    <TableCell>
                      {(patient as any).phone || (patient as any).email || '(11) 99999-9999'}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/pacientes/${patient.id}`}>
                          <FileText className="mr-2 h-4 w-4 text-primary" />
                          Ver Prontuário
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum paciente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
