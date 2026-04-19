import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { useAppContext } from '@/hooks/use-app-context'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const { toast } = useToast()
  const { activeClinic } = useAppContext()

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  const [batchData, setBatchData] = useState({
    batch_number: '',
    expiry_date: '',
    supplier: '',
    cost_price: 0,
    initial_quantity: 0,
  })

  const loadOrders = async () => {
    if (!activeClinic?.id) return
    try {
      const records = await pb.collection('purchase_orders').getFullList({
        sort: '-created',
        expand: 'material_id',
        filter: `clinic_id = "${activeClinic.id}"`,
      })
      setOrders(records)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [activeClinic?.id])

  useRealtime('purchase_orders', loadOrders)

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection('purchase_orders').update(id, { status: newStatus })
      toast({ title: 'Status atualizado com sucesso' })
    } catch (e) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const handleReceiveClick = (order: any) => {
    setSelectedOrder(order)
    setBatchData({
      batch_number: '',
      expiry_date: '',
      supplier: order.supplier || '',
      cost_price: 0,
      initial_quantity: order.quantity,
    })
    setReceiveDialogOpen(true)
  }

  const confirmReceive = async () => {
    if (!batchData.batch_number || !batchData.expiry_date || batchData.initial_quantity <= 0) {
      toast({ title: 'Preencha os campos obrigatórios do lote', variant: 'destructive' })
      return
    }

    try {
      await pb.collection('inventory_batches').create({
        material_id: selectedOrder.material_id,
        batch_number: batchData.batch_number,
        expiry_date: batchData.expiry_date,
        initial_quantity: batchData.initial_quantity,
        current_quantity: batchData.initial_quantity,
        supplier: batchData.supplier,
        purchase_date: new Date().toISOString(),
        cost_price: batchData.cost_price,
        clinic_id: activeClinic?.id,
      })

      await pb.collection('purchase_orders').update(selectedOrder.id, { status: 'received' })

      const material = await pb.collection('clinical_inventory').getOne(selectedOrder.material_id)
      await pb.collection('clinical_inventory').update(material.id, {
        current_quantity: material.current_quantity + batchData.initial_quantity,
      })

      toast({ title: 'Ordem recebida e lote criado!' })
      setReceiveDialogOpen(false)
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao processar recebimento', variant: 'destructive' })
    }
  }

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ordens de Compra</h1>
          <p className="text-muted-foreground">Gerencie pedidos de reposição de estoque.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="pending_approval">Pendente Aprovação</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="ordered">Solicitado</SelectItem>
              <SelectItem value="received">Recebido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma ordem encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{format(new Date(order.created), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-medium">{order.expand?.material_id?.name}</TableCell>
                    <TableCell>
                      {order.quantity} {order.expand?.material_id?.unit}
                    </TableCell>
                    <TableCell>{order.supplier || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'received'
                            ? 'default'
                            : order.status === 'ordered'
                              ? 'secondary'
                              : order.status === 'approved'
                                ? 'default'
                                : order.status === 'cancelled'
                                  ? 'destructive'
                                  : order.status === 'pending_approval'
                                    ? 'destructive'
                                    : 'outline'
                        }
                        className={
                          order.status === 'pending_approval'
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : ''
                        }
                      >
                        {order.status === 'draft' && 'Rascunho'}
                        {order.status === 'pending_approval' && 'Pendente Aprovação'}
                        {order.status === 'approved' && 'Aprovado'}
                        {order.status === 'ordered' && 'Solicitado'}
                        {order.status === 'received' && 'Recebido'}
                        {order.status === 'cancelled' && 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(order.id, 'pending_approval')}
                        >
                          Enviar Aprovação
                        </Button>
                      )}
                      {order.status === 'pending_approval' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              const reason = window.prompt('Motivo da rejeição (opcional):')
                              if (reason !== null) {
                                updateStatus(order.id, 'cancelled')
                                if (reason) {
                                  pb.collection('action_logs')
                                    .create({
                                      action: 'reject_order',
                                      collection_name: 'purchase_orders',
                                      record_id: order.id,
                                      details: { reason },
                                      clinic_id: activeClinic?.id,
                                    })
                                    .catch(console.error)
                                }
                              }
                            }}
                          >
                            Rejeitar
                          </Button>
                          <Button size="sm" onClick={() => updateStatus(order.id, 'approved')}>
                            Aprovar
                          </Button>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateStatus(order.id, 'ordered')}
                        >
                          Marcar Solicitado
                        </Button>
                      )}
                      {order.status === 'ordered' && (
                        <Button size="sm" onClick={() => handleReceiveClick(order)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Receber
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Para marcar como recebido, crie o lote correspondente no sistema.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número do Lote</Label>
                <Input
                  value={batchData.batch_number}
                  onChange={(e) => setBatchData({ ...batchData, batch_number: e.target.value })}
                  placeholder="Ex: L-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Validade</Label>
                <Input
                  type="date"
                  value={batchData.expiry_date}
                  onChange={(e) => setBatchData({ ...batchData, expiry_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade Recebida</Label>
                <Input
                  type="number"
                  value={batchData.initial_quantity}
                  onChange={(e) =>
                    setBatchData({ ...batchData, initial_quantity: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Preço de Custo (Total ou Unitário)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batchData.cost_price}
                  onChange={(e) =>
                    setBatchData({ ...batchData, cost_price: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  value={batchData.supplier}
                  onChange={(e) => setBatchData({ ...batchData, supplier: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmReceive}>Confirmar e Receber</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
