import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Building, Plus, Pencil, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface Clinic {
  id: string
  name: string
  address: string
  phone: string
  email: string
  opening_time: string
  closing_time: string
}

export default function FranchiseManagement() {
  const { user } = useAuth()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none')

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    opening_time: '',
    closing_time: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const loadClinics = async () => {
    try {
      const data = await pb.collection('clinic_settings').getFullList<Clinic>({ sort: 'name' })
      setClinics(data)
    } catch (e) {
      toast.error('Erro ao carregar unidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinics()
    pb.collection('clinic_templates')
      .getFullList()
      .then(setTemplates)
      .catch(() => {})
  }, [])

  useRealtime('clinic_settings', loadClinics)

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const handleOpenDialog = (clinic?: Clinic) => {
    setErrors({})
    setSelectedTemplate('none')
    if (clinic) {
      setEditingClinic(clinic)
      setFormData({
        name: clinic.name,
        address: clinic.address || '',
        phone: clinic.phone || '',
        email: clinic.email || '',
        opening_time: clinic.opening_time || '',
        closing_time: clinic.closing_time || '',
      })
    } else {
      setEditingClinic(null)
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        opening_time: '',
        closing_time: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setErrors({})
    try {
      let finalData = { ...formData }
      if (!editingClinic && selectedTemplate !== 'none') {
        const tpl = templates.find((t) => t.id === selectedTemplate)
        if (tpl && tpl.config_data) {
          finalData = { ...finalData, ...tpl.config_data }
        }
      }

      if (editingClinic) {
        await pb.collection('clinic_settings').update(editingClinic.id, finalData)
        toast.success('Unidade atualizada com sucesso!')
      } else {
        await pb.collection('clinic_settings').create(finalData)
        toast.success('Unidade criada com sucesso!')
      }
      setDialogOpen(false)
    } catch (e) {
      setErrors(extractFieldErrors(e))
      toast.error('Erro ao salvar unidade. Verifique os campos.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta unidade?')) return
    try {
      await pb.collection('clinic_settings').delete(id)
      toast.success('Unidade excluída com sucesso')
    } catch (e) {
      toast.error('Erro ao excluir unidade')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            Gestão de Franquia
          </h1>
          <p className="text-muted-foreground">
            Gerencie as unidades da franquia e suas informações.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Nova Unidade
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades (Clínicas)</CardTitle>
          <CardDescription>Lista de todas as clínicas cadastradas na rede.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma unidade cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  clinics.map((clinic) => (
                    <TableRow key={clinic.id}>
                      <TableCell className="font-medium">{clinic.name}</TableCell>
                      <TableCell>{clinic.email || '-'}</TableCell>
                      <TableCell>{clinic.phone || '-'}</TableCell>
                      <TableCell>
                        {clinic.opening_time && clinic.closing_time
                          ? `${clinic.opening_time} - ${clinic.closing_time}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(clinic)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(clinic.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClinic ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da unidade. Clique em salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Unidade *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            {!editingClinic && (
              <div className="grid gap-2">
                <Label htmlFor="template">Aplicar Template de Configuração (Opcional)</Label>
                <select
                  id="template"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                >
                  <option value="none">Nenhum template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
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
                <Label htmlFor="email">Email de Contato</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opening_time">Horário de Abertura</Label>
                <Input
                  id="opening_time"
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closing_time">Horário de Fechamento</Label>
                <Input
                  id="closing_time"
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
