import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function FranchiseTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'general_settings',
    config_data: '{}',
  })

  const loadTemplates = async () => {
    try {
      const data = await pb.collection('clinic_templates').getFullList()
      setTemplates(data)
    } catch (e) {
      toast.error('Erro ao carregar templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const openDialog = (t?: any) => {
    if (t) {
      setEditingId(t.id)
      setFormData({
        name: t.name,
        type: t.type,
        config_data: JSON.stringify(t.config_data, null, 2),
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        type: 'general_settings',
        config_data: '{\n  "opening_time": "08:00",\n  "closing_time": "18:00"\n}',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      let parsedConfig = {}
      try {
        parsedConfig = JSON.parse(formData.config_data)
      } catch (e) {
        toast.error('Formato JSON inválido')
        return
      }

      const data = {
        name: formData.name,
        type: formData.type,
        config_data: parsedConfig,
      }

      if (editingId) {
        await pb.collection('clinic_templates').update(editingId, data)
        toast.success('Template atualizado')
      } else {
        await pb.collection('clinic_templates').create(data)
        toast.success('Template criado')
      }
      setDialogOpen(false)
      loadTemplates()
    } catch (e) {
      toast.error('Erro ao salvar template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este template?')) return
    await pb.collection('clinic_templates').delete(id)
    toast.success('Template excluído')
    loadTemplates()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Templates de Unidade
          </h1>
          <p className="text-muted-foreground">
            Padrões de configuração para novas clínicas da rede.
          </p>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">
                    Nenhum template cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      {t.type === 'general_settings'
                        ? 'Config. Gerais'
                        : t.type === 'consultation_pattern'
                          ? 'Padrão de Consulta'
                          : 'Menu de Estoque'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Template</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_settings">Configurações Gerais</SelectItem>
                  <SelectItem value="consultation_pattern">Padrão de Consulta</SelectItem>
                  <SelectItem value="inventory_menu">Menu de Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Configuração (Objeto JSON)</Label>
              <Textarea
                rows={8}
                className="font-mono text-sm"
                value={formData.config_data}
                onChange={(e) => setFormData({ ...formData, config_data: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
