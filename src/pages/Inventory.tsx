import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Loader2, MinusCircle, PlusCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Inventory() {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    current_quantity: '',
    min_quantity: '',
    unit: 'un',
  })

  const loadData = async () => {
    try {
      const records = await pb.collection('clinical_inventory').getFullList({ sort: 'name' })
      setItems(records)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('clinical_inventory', loadData)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const payload = {
        name: formData.name,
        current_quantity: parseFloat(formData.current_quantity),
        min_quantity: parseFloat(formData.min_quantity),
        unit: formData.unit,
      }

      if (editingId) {
        await pb.collection('clinical_inventory').update(editingId, payload)
        toast({ title: 'Item atualizado com sucesso.' })
      } else {
        await pb.collection('clinical_inventory').create(payload)
        toast({ title: 'Item adicionado com sucesso.' })
      }

      setIsOpen(false)
      resetForm()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      name: '',
      current_quantity: '',
      min_quantity: '',
      unit: 'un',
    })
    setFieldErrors({})
  }

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      current_quantity: item.current_quantity.toString(),
      min_quantity: item.min_quantity.toString(),
      unit: item.unit,
    })
    setIsOpen(true)
  }

  const adjustQuantity = async (item: any, amount: number) => {
    try {
      const newQty = Math.max(0, item.current_quantity + amount)
      await pb.collection('clinical_inventory').update(item.id, {
        current_quantity: newQty,
      })
      toast({ title: 'Quantidade atualizada com sucesso.' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar quantidade.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">Gerencie os materiais e suprimentos da clínica.</p>
        </div>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Item' : 'Novo Item'}</DialogTitle>
              <DialogDescription>Adicione ou atualize um item do estoque.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome do Material *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {fieldErrors.name && (
                  <span className="text-xs text-destructive">{fieldErrors.name}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Qtd. Atual *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.current_quantity}
                    onChange={(e) => setFormData({ ...formData, current_quantity: e.target.value })}
                    required
                  />
                  {fieldErrors.current_quantity && (
                    <span className="text-xs text-destructive">{fieldErrors.current_quantity}</span>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Qtd. Mínima *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_quantity}
                    onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                    required
                  />
                  {fieldErrors.min_quantity && (
                    <span className="text-xs text-destructive">{fieldErrors.min_quantity}</span>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Unidade de Medida *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                    <SelectItem value="pct">Pacote (pct)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Estoque Atual</TableHead>
                <TableHead>Estoque Mínimo</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum item cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isLow = item.current_quantity <= item.min_quantity
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-bold">{item.current_quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.min_quantity}</TableCell>
                      <TableCell className="uppercase">{item.unit}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive">Estoque Baixo</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Regular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => adjustQuantity(item, -1)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => adjustQuantity(item, 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => openEdit(item)}>
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
