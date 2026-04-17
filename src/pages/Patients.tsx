import { useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Plus, FileText, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Patients() {
  const { activeClinic } = useAppContext()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [localPatients, setLocalPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    dob: '',
    email: '',
    phone: '',
    gender: '',
  })

  const [pathologies, setPathologies] = useState<string[]>([])
  const [selectedPathology, setSelectedPathology] = useState<string>('all')
  const [filteredPatientIds, setFilteredPatientIds] = useState<Set<string> | null>(null)

  useEffect(() => {
    const loadPathologies = async () => {
      try {
        const records = await pb.collection('pathologies_catalog').getFullList({ sort: 'name' })
        setPathologies(records.map((r: any) => r.name))
      } catch (e) {
        console.error(e)
      }
    }
    loadPathologies()
  }, [])

  useEffect(() => {
    const filterByPathology = async () => {
      if (selectedPathology === 'all') {
        setFilteredPatientIds(null)
        return
      }
      try {
        const points = await pb.collection('pain_points').getFullList({
          filter: `pathologies ~ '"${selectedPathology}"' || pathologies ~ '${selectedPathology}'`,
          fields: 'patient_id',
        })
        setFilteredPatientIds(new Set(points.map((p: any) => p.patient_id)))
      } catch (e) {
        console.error(e)
      }
    }
    filterByPathology()
  }, [selectedPathology])

  const loadData = async () => {
    try {
      const records = await pb.collection('patients').getFullList({ sort: '-created' })
      setLocalPatients(records)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('patients', () => {
    loadData()
  })

  const patients = localPatients.filter(
    (p) =>
      (!p.clinicId || p.clinicId === activeClinic.id) &&
      (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.document?.includes(searchTerm)) &&
      (filteredPatientIds === null || filteredPatientIds.has(p.id)),
  )

  const calculateAge = (dob: string) => {
    if (!dob) return 0
    const bd = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - bd.getFullYear()
    const m = today.getMonth() - bd.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
      age--
    }
    return age
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const payload = {
        ...formData,
        dob: formData.dob ? new Date(formData.dob).toISOString().replace('T', ' ') : '',
        clinicId: activeClinic.id,
      }
      await pb.collection('patients').create(payload)
      setIsOpen(false)
      setFormData({ name: '', document: '', dob: '', email: '', phone: '', gender: '' })
      toast({
        title: 'Paciente cadastrado',
        description: 'O paciente foi adicionado com sucesso no banco de dados.',
      })
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie o registro de pacientes da clínica.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Novo Paciente</DialogTitle>
              <DialogDescription>Insira os dados do novo paciente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {fieldErrors.name && (
                  <span className="text-xs text-destructive">{fieldErrors.name}</span>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="document">Documento (CPF)</Label>
                <Input
                  id="document"
                  placeholder="000.000.000-00"
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
                {fieldErrors.document && (
                  <span className="text-xs text-destructive">{fieldErrors.document}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dob">Data de Nasc.</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(v) => setFormData({ ...formData, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Masculino</SelectItem>
                      <SelectItem value="Female">Feminino</SelectItem>
                      <SelectItem value="Other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Paciente
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nome ou CPF..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedPathology} onValueChange={setSelectedPathology}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filtrar por Patologia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Patologias</SelectItem>
              {pathologies.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : patients.length > 0 ? (
                patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="px-6 font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.document}</TableCell>
                    <TableCell>
                      {calculateAge(patient.dob)} anos (
                      {patient.dob && new Date(patient.dob).toLocaleDateString('pt-BR')})
                    </TableCell>
                    <TableCell>{patient.phone || patient.email || '(11) 99999-9999'}</TableCell>
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
