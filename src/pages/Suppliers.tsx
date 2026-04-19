import { useState, useEffect } from 'react'
import { Plus, Search, Building2, Mail, Phone, Package, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Suppliers() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    materials: [] as string[],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const [suppRes, invRes] = await Promise.all([
        pb.collection('suppliers').getFullList({ sort: '-created', expand: 'materials' }),
        pb.collection('clinical_inventory').getFullList({ sort: 'name' }),
      ])
      setSuppliers(suppRes)
      setInventory(invRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDialog = (supplier: any = null) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        materials: supplier.materials || [],
      })
    } else {
      setEditingSupplier(null)
      setFormData({ name: '', email: '', phone: '', materials: [] })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name) return
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        clinic_id: user?.clinic_id,
      }

      if (editingSupplier) {
        await pb.collection('suppliers').update(editingSupplier.id, payload)
        toast({ title: 'Fornecedor atualizado com sucesso!' })
      } else {
        await pb.collection('suppliers').create(payload)
        toast({ title: 'Fornecedor cadastrado com sucesso!' })
      }

      setIsDialogOpen(false)
      loadData()
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: Object.values(errors)[0] || 'Ocorreu um erro ao salvar o fornecedor.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este fornecedor?')) return
    try {
      await pb.collection('suppliers').delete(id)
      toast({ title: 'Fornecedor removido com sucesso.' })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: 'Não foi possível remover o fornecedor.',
      })
    }
  }

  const toggleMaterial = (materialId: string) => {
    setFormData((prev) => {
      if (prev.materials.includes(materialId)) {
        return { ...prev, materials: prev.materials.filter((m) => m !== materialId) }
      }
      return { ...prev, materials: [...prev.materials, materialId] }
    })
  }

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie fornecedores e automatize pedidos de cotação para itens com estoque baixo.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestão de Fornecedores</CardTitle>
              <CardDescription>
                Vincule materiais aos fornecedores para que o sistema solicite cotações
                automaticamente.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedores..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Itens Vinculados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {supplier.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {supplier.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {supplier.phone}
                        </div>
                      )}
                      {!supplier.email && !supplier.phone && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {supplier.materials?.length || 0} itens
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor e selecione quais itens ele fornece.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nome da Empresa / Fornecedor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: MedCorp Suprimentos"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail para Cotações</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vendas@medcorp.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid gap-2 mt-4">
              <Label>Materiais Fornecidos</Label>
              <p className="text-xs text-muted-foreground">
                Selecione os materiais para automatizar solicitações de cotação.
              </p>
              <ScrollArea className="h-48 rounded-md border p-4">
                <div className="flex flex-col gap-3">
                  {inventory.map((item) => (
                    <div key={item.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`mat-${item.id}`}
                        checked={formData.materials.includes(item.id)}
                        onCheckedChange={() => toggleMaterial(item.id)}
                      />
                      <label
                        htmlFor={`mat-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {item.name}
                      </label>
                    </div>
                  ))}
                  {inventory.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      Nenhum material cadastrado no estoque.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingSupplier ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
