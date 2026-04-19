import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, Plus, Pencil, Trash2, X } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { ScrollArea } from '@/components/ui/scroll-area'

export default function FranchiseTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'consultation_pattern',
    config_data: '{}',
  })

  const [protocolData, setProtocolData] = useState({
    note_template: '',
    required_materials: [] as { material_id: string; quantity: number }[],
    financial_impact: { amount: 0, billing_type: 'private' },
  })

  const loadData = async () => {
    try {
      const [data, inv] = await Promise.all([
        pb.collection('clinic_templates').getFullList(),
        pb.collection('clinical_inventory').getFullList({ sort: 'name' }),
      ])
      setTemplates(data)
      setInventory(inv)
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

  const openDialog = (t?: any) => {
    if (t) {
      setEditingId(t.id)
      setFormData({
        name: t.name,
        type: t.type,
        config_data: JSON.stringify(t.config_data, null, 2),
      })
      if (t.type === 'consultation_pattern') {
        const conf = t.config_data || {}
        setProtocolData({
          note_template: conf.note_template || '',
          required_materials: conf.required_materials || [],
          financial_impact: {
            amount: conf.financial_impact?.amount || 0,
            billing_type: conf.financial_impact?.billing_type || 'private',
          },
        })
      }
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        type: 'consultation_pattern',
        config_data: '{}',
      })
      setProtocolData({
        note_template: '',
        required_materials: [],
        financial_impact: { amount: 0, billing_type: 'private' },
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      let finalConfig = {}
      if (formData.type === 'consultation_pattern') {
        finalConfig = protocolData
      } else {
        try {
          finalConfig = JSON.parse(formData.config_data)
        } catch (e) {
          toast.error('Formato JSON inválido')
          return
        }
      }

      const data = {
        name: formData.name,
        type: formData.type,
        config_data: finalConfig,
      }

      if (editingId) {
        await pb.collection('clinic_templates').update(editingId, data)
        toast.success('Template atualizado')
      } else {
        await pb.collection('clinic_templates').create(data)
        toast.success('Template criado')
      }
      setDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error('Erro ao salvar template')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este template?')) return
    await pb.collection('clinic_templates').delete(id)
    toast.success('Template excluído')
    loadData()
  }

  const addMaterial = () => {
    setProtocolData({
      ...protocolData,
      required_materials: [...protocolData.required_materials, { material_id: '', quantity: 1 }],
    })
  }

  const updateMaterial = (index: number, field: string, value: any) => {
    const newMats = [...protocolData.required_materials]
    newMats[index] = { ...newMats[index], [field]: value }
    setProtocolData({ ...protocolData, required_materials: newMats })
  }

  const removeMaterial = (index: number) => {
    const newMats = protocolData.required_materials.filter((_, i) => i !== index)
    setProtocolData({ ...protocolData, required_materials: newMats })
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Templates & Protocolos
          </h1>
          <p className="text-muted-foreground">
            Gerencie padrões de consulta, protocolos clínicos e configurações.
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
                        ? 'Configurações Gerais'
                        : t.type === 'consultation_pattern'
                          ? 'Protocolo Clínico (SOP)'
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation_pattern">Protocolo Clínico (SOP)</SelectItem>
                      <SelectItem value="general_settings">Configurações Gerais</SelectItem>
                      <SelectItem value="inventory_menu">Menu de Estoque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.type === 'consultation_pattern' ? (
                <div className="space-y-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Template do Prontuário</Label>
                    <Textarea
                      placeholder="Estrutura do texto que será inserido no prontuário..."
                      className="min-h-[120px]"
                      value={protocolData.note_template}
                      onChange={(e) =>
                        setProtocolData({ ...protocolData, note_template: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Materiais Obrigatórios (Estoque)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar Material
                      </Button>
                    </div>
                    {protocolData.required_materials.map((mat, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Select
                          value={mat.material_id}
                          onValueChange={(v) => updateMaterial(index, 'material_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o material" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventory.map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name} ({i.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Qtd"
                          className="w-24"
                          value={mat.quantity || ''}
                          onChange={(e) =>
                            updateMaterial(index, 'quantity', Number(e.target.value))
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMaterial(index)}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {protocolData.required_materials.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2 bg-slate-50 rounded border border-dashed">
                        Nenhum material vinculado a este protocolo.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label>Impacto Financeiro (Cobrança Automática)</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Valor Padrão (R$)</span>
                        <Input
                          type="number"
                          value={protocolData.financial_impact.amount}
                          onChange={(e) =>
                            setProtocolData({
                              ...protocolData,
                              financial_impact: {
                                ...protocolData.financial_impact,
                                amount: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Tipo Faturamento</span>
                        <Select
                          value={protocolData.financial_impact.billing_type}
                          onValueChange={(v) =>
                            setProtocolData({
                              ...protocolData,
                              financial_impact: {
                                ...protocolData.financial_impact,
                                billing_type: v,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Particular</SelectItem>
                            <SelectItem value="insurance">Convênio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Configuração (Objeto JSON)</Label>
                  <Textarea
                    rows={12}
                    className="font-mono text-sm"
                    value={formData.config_data}
                    onChange={(e) => setFormData({ ...formData, config_data: e.target.value })}
                  />
                </div>
              )}
            </div>
          </ScrollArea>
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
