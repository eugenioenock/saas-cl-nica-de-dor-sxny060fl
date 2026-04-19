import React, { useState, useEffect } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  History,
  PackagePlus,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Switch } from '@/components/ui/switch'
import { ScannerDialog } from '@/components/ScannerDialog'
import { ScanBarcode } from 'lucide-react'

export default function Inventory() {
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [batchForm, setBatchForm] = useState({
    batch_number: '',
    expiry_date: '',
    initial_quantity: '',
    supplier: '',
    cost_price: '',
  })

  const [traceModalOpen, setTraceModalOpen] = useState(false)
  const [traceMaterial, setTraceMaterial] = useState<any>(null)
  const [traceLogs, setTraceLogs] = useState<any[]>([])

  const { user } = useAuth()

  const handleSaveCount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!countForm.material_id || !countForm.actual_quantity) return
    setIsSubmitting(true)

    try {
      const material = items.find((m) => m.id === countForm.material_id)
      const expected = material?.current_quantity || 0
      const actual = parseFloat(countForm.actual_quantity)
      const discrepancy = actual - expected

      await pb.collection('inventory_counts').create({
        material_id: material.id,
        expected_quantity: expected,
        actual_quantity: actual,
        discrepancy,
        professional_id: user?.id,
      })

      if (discrepancy !== 0) {
        await pb.collection('clinical_inventory').update(material.id, {
          current_quantity: actual,
        })
      }

      toast({ title: 'Contagem registrada com sucesso.' })
      setCountModalOpen(false)
      setCountForm({ material_id: '', actual_quantity: '' })
    } catch (err) {
      toast({ title: 'Erro ao registrar contagem.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const [formData, setFormData] = useState({
    name: '',
    min_quantity: '',
    unit: 'un',
    is_high_cost: false,
    barcode: '',
  })

  const [scannerOpen, setScannerOpen] = useState(false)

  const [countModalOpen, setCountModalOpen] = useState(false)
  const [countForm, setCountForm] = useState({
    material_id: '',
    actual_quantity: '',
  })

  const loadData = async () => {
    try {
      const [records, batchRecords] = await Promise.all([
        pb.collection('clinical_inventory').getFullList({ sort: 'name' }),
        pb
          .collection('inventory_batches')
          .getFullList({ sort: 'expiry_date', filter: 'current_quantity > 0' }),
      ])
      setItems(records)
      setBatches(batchRecords)
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
  useRealtime('inventory_batches', loadData)
  useRealtime('inventory_usage', loadData)

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const payload = {
        name: formData.name,
        min_quantity: parseFloat(formData.min_quantity),
        unit: formData.unit,
        is_high_cost: formData.is_high_cost,
        barcode: formData.barcode,
        current_quantity: editingId ? undefined : 0,
      }

      if (editingId) {
        await pb.collection('clinical_inventory').update(editingId, payload)
        toast({ title: 'Material atualizado.' })
      } else {
        await pb.collection('clinical_inventory').create(payload)
        toast({ title: 'Material adicionado.' })
      }

      setIsOpen(false)
      setEditingId(null)
      setFormData({ name: '', min_quantity: '', unit: 'un', is_high_cost: false, barcode: '' })
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})

    try {
      const qty = parseFloat(batchForm.initial_quantity)
      const payload = {
        material_id: selectedMaterialId,
        batch_number: batchForm.batch_number,
        expiry_date: new Date(batchForm.expiry_date).toISOString(),
        initial_quantity: qty,
        current_quantity: qty,
        supplier: batchForm.supplier,
        cost_price: batchForm.cost_price ? parseFloat(batchForm.cost_price) : 0,
        purchase_date: new Date().toISOString(),
      }

      await pb.collection('inventory_batches').create(payload)
      toast({ title: 'Lote adicionado com sucesso.' })
      setBatchModalOpen(false)
      setBatchForm({
        batch_number: '',
        expiry_date: '',
        initial_quantity: '',
        supplier: '',
        cost_price: '',
      })
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditMaterial = (item: any) => {
    setEditingId(item.id)
    setFormData({
      name: item.name,
      min_quantity: item.min_quantity.toString(),
      unit: item.unit,
      is_high_cost: !!item.is_high_cost,
      barcode: item.barcode || '',
    })
    setIsOpen(true)
  }

  const openAddBatch = (item: any) => {
    setSelectedMaterialId(item.id)
    setBatchForm({
      batch_number: '',
      expiry_date: '',
      initial_quantity: '',
      supplier: '',
      cost_price: '',
    })
    setFieldErrors({})
    setBatchModalOpen(true)
  }

  const openTraceability = async (material: any) => {
    setTraceMaterial(material)
    setTraceModalOpen(true)
    try {
      const logs = await pb.collection('inventory_usage').getFullList({
        filter: `batch_id.material_id = "${material.id}"`,
        expand: 'batch_id,patient_id,professional_id',
        sort: '-usage_date',
      })
      setTraceLogs(logs)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getBatchStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate)
    const now = new Date()
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24)
    if (diffDays < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-200' }
    if (diffDays <= 30)
      return { label: 'Vence em breve', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { label: 'Válido', color: 'bg-green-50 text-green-700 border-green-200' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estoque Avançado</h1>
          <p className="text-muted-foreground">Gerencie materiais, lotes e rastreabilidade.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setCountForm({ material_id: '', actual_quantity: '' })
              setCountModalOpen(true)
            }}
          >
            <History className="mr-2 h-4 w-4" /> Contagem Físico
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingId(null)}>
                <Plus className="mr-2 h-4 w-4" /> Novo Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Material' : 'Novo Material'}</DialogTitle>
                <DialogDescription>Cadastre o tipo de material.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveMaterial} className="grid gap-4 py-4">
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
                <div className="grid gap-2">
                  <Label>Código de Barras (Opcional)</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Escaneie ou digite"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2 pb-2">
                  <Switch
                    id="high-cost"
                    checked={formData.is_high_cost}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_high_cost: checked })
                    }
                  />
                  <Label htmlFor="high-cost">Material de Alto Custo (Exige Assinatura)</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Estoque Mínimo *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                      required
                    />
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
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Materiais e Lotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Estoque Total</TableHead>
                  <TableHead>Estoque Mínimo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum material cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const isLow = item.current_quantity < item.min_quantity
                    const isExpanded = expandedRows[item.id]
                    const itemBatches = batches.filter((b) => b.material_id === item.id)

                    return (
                      <React.Fragment key={item.id}>
                        <TableRow
                          className={cn(
                            'hover:bg-muted/50 transition-colors',
                            isExpanded && 'bg-muted/30',
                          )}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleRow(item.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                            {item.is_high_cost && (
                              <Badge
                                variant="outline"
                                className="ml-2 bg-purple-50 text-purple-700 border-purple-200"
                              >
                                Alto Custo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">{item.current_quantity}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.min_quantity}
                          </TableCell>
                          <TableCell className="uppercase">{item.unit}</TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge
                                variant="destructive"
                                className="flex w-fit items-center gap-1"
                              >
                                <AlertTriangle className="h-3 w-3" /> Estoque Baixo
                              </Badge>
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
                                size="sm"
                                onClick={() => openAddBatch(item)}
                              >
                                <PackagePlus className="h-4 w-4 mr-1" /> Add Lote
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openTraceability(item)}
                              >
                                <History className="h-4 w-4 mr-1" /> Histórico
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditMaterial(item)}
                              >
                                Editar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={7} className="p-0 border-b-0">
                              <div className="p-4 pl-14">
                                <h4 className="text-sm font-semibold mb-3">Lotes Ativos</h4>
                                {itemBatches.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-transparent hover:bg-transparent">
                                        <TableHead className="h-8">Lote</TableHead>
                                        <TableHead className="h-8">Validade</TableHead>
                                        <TableHead className="h-8">Qtd. Atual</TableHead>
                                        <TableHead className="h-8">Fornecedor</TableHead>
                                        <TableHead className="h-8">Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {itemBatches.map((b) => {
                                        const status = getBatchStatus(b.expiry_date)
                                        return (
                                          <TableRow
                                            key={b.id}
                                            className="bg-transparent hover:bg-transparent"
                                          >
                                            <TableCell className="py-2 font-mono text-xs">
                                              {b.batch_number}
                                            </TableCell>
                                            <TableCell className="py-2 text-sm">
                                              {new Date(b.expiry_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="py-2 text-sm font-medium">
                                              {b.current_quantity}
                                            </TableCell>
                                            <TableCell className="py-2 text-sm">
                                              {b.supplier || '-'}
                                            </TableCell>
                                            <TableCell className="py-2">
                                              <Badge variant="outline" className={status.color}>
                                                {status.label}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Nenhum lote com estoque disponível.
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Novo Lote</DialogTitle>
            <DialogDescription>Insira as informações do lote de entrada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBatch} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Número do Lote *</Label>
              <Input
                value={batchForm.batch_number}
                onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
                required
              />
              {fieldErrors.batch_number && (
                <span className="text-xs text-destructive">{fieldErrors.batch_number}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Validade *</Label>
                <Input
                  type="date"
                  value={batchForm.expiry_date}
                  onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantidade Inicial *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={batchForm.initial_quantity}
                  onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fornecedor (Opcional)</Label>
                <Input
                  value={batchForm.supplier}
                  onChange={(e) => setBatchForm({ ...batchForm, supplier: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Preço de Custo (Opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batchForm.cost_price}
                  onChange={(e) => setBatchForm({ ...batchForm, cost_price: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Lote
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={traceModalOpen} onOpenChange={setTraceModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rastreabilidade: {traceMaterial?.name}</DialogTitle>
            <DialogDescription>Histórico de uso deste material em pacientes.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Qtd.</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traceLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhum registro de uso encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  traceLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(log.usage_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.expand?.batch_id?.batch_number}
                      </TableCell>
                      <TableCell>{log.quantity_used}</TableCell>
                      <TableCell>{log.expand?.patient_id?.name}</TableCell>
                      <TableCell>
                        {log.expand?.professional_id?.name || log.expand?.professional_id?.email}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={countModalOpen} onOpenChange={setCountModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contagem Física de Estoque</DialogTitle>
            <DialogDescription>
              Ajuste o estoque do sistema de acordo com a contagem física real.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCount} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Material</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanBarcode className="w-4 h-4 mr-2" /> Escanear
                </Button>
              </div>
              <Select
                value={countForm.material_id}
                onValueChange={(v) =>
                  setCountForm({
                    ...countForm,
                    material_id: v,
                    actual_quantity:
                      items.find((m) => m.id === v)?.current_quantity?.toString() || '',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um material" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {countForm.material_id && (
              <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-muted rounded-md">
                <div>
                  <Label className="text-xs text-muted-foreground">Sistema Espera:</Label>
                  <div className="font-mono text-lg">
                    {items.find((m) => m.id === countForm.material_id)?.current_quantity || 0}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Quantidade Física Real *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={countForm.actual_quantity}
                    onChange={(e) =>
                      setCountForm({ ...countForm, actual_quantity: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !countForm.material_id}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Registrar e Ajustar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={(text) => {
          const matched = items.find((m) => m.barcode === text || m.id === text)
          if (matched) {
            setCountForm({
              ...countForm,
              material_id: matched.id,
              actual_quantity: matched.current_quantity?.toString() || '0',
            })
            toast({ title: 'Material encontrado', description: matched.name })
          } else {
            toast({ title: 'Material não encontrado', variant: 'destructive' })
          }
        }}
      />
    </div>
  )
}
