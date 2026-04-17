import { useState } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { mockPatients, Patient } from '@/lib/data'
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
import { Search, Plus, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Patients() {
  const { activeClinic } = useAppContext()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [localPatients, setLocalPatients] = useState<Patient[]>(mockPatients)
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    dob: '',
    email: '',
    phone: '',
    gender: '',
  })

  const patients = localPatients.filter(
    (p) =>
      p.clinicId === activeClinic.id &&
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.document.includes(searchTerm)),
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.document) return

    const newPatient: Patient = {
      id: `p${Date.now()}`,
      clinicId: activeClinic.id,
      name: formData.name,
      document: formData.document,
      dob: formData.dob || new Date().toISOString().split('T')[0],
      gender: formData.gender || 'Other',
      email: formData.email,
      phone: formData.phone,
    }

    setLocalPatients([newPatient, ...localPatients])
    setIsOpen(false)
    setFormData({ name: '', document: '', dob: '', email: '', phone: '', gender: '' })
    toast({
      title: 'Paciente cadastrado',
      description: 'O paciente foi adicionado com sucesso (apenas sessão local).',
    })
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
              <DialogDescription>
                Insira os dados do novo paciente. Cadastro válido apenas para esta sessão (mock).
              </DialogDescription>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="document">Documento (CPF) *</Label>
                <Input
                  id="document"
                  placeholder="000.000.000-00"
                  required
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
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
                <Button type="submit">Salvar Paciente</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
