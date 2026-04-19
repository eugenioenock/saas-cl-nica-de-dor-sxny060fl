import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRightLeft, Plus, CheckCircle, XCircle } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function FranchiseTransfers() {
  const { user } = useAuth()
  const [transfers, setTransfers] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    type: 'inventory',
    source_clinic_id: '',
    target_clinic_id: '',
    item_id: '',
    quantity: 1,
  })
  const [sourceItems, setSourceItems] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [tData, cData] = await Promise.all([
        pb.collection('unit_transfers').getFullList({
          expand: 'source_clinic_id,target_clinic_id,requested_by,approved_by',
          sort: '-created',
        }),
        pb.collection('clinic_settings').getFullList(),
      ])
      setTransfers(tData)
      setClinics(cData)
    } catch (e) {
      toast.error('Erro ao carregar transferências')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const loadItems = async () => {
      if (!formData.source_clinic_id) {
        setSourceItems([])
        return
      }
      try {
        if (formData.type === 'inventory') {
          const batches = await pb.collection('inventory_batches').getFullList({
            filter: `clinic_id = '${formData.source_clinic_id}'`,
            expand: 'material_id',
          })
          setSourceItems(
            batches.map((b) => ({
              id: b.id,
              name: `${b.expand?.material_id?.name || 'Item'} (Lote: ${b.batch_number}) - Qtd: ${b.current_quantity}`,
            })),
          )
        } else {
          const patients = await pb.collection('patients').getFullList({
            filter: `clinic_id = '${formData.source_clinic_id}'`,
          })
          setSourceItems(patients.map((p) => ({ id: p.id, name: p.name })))
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadItems()
  }, [formData.source_clinic_id, formData.type])

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  const handleRequest = async () => {
    try {
      await pb.collection('unit_transfers').create({
        type: formData.type,
        source_clinic_id: formData.source_clinic_id,
        target_clinic_id: formData.target_clinic_id,
        item_id: formData.item_id,
        quantity: formData.type === 'inventory' ? formData.quantity : null,
        status: 'pending',
        requested_by: user.id,
      })
      toast.success('Transferência solicitada com sucesso')
      setDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error('Erro ao solicitar transferência')
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await pb.collection('unit_transfers').update(id, {
        status: 'approved',
        approved_by: user.id,
      })
      toast.success('Transferência aprovada')
      loadData()
    } catch (e) {
      toast.error('Erro ao aprovar')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await pb.collection('unit_transfers').update(id, {
        status: 'rejected',
        approved_by: user.id,
      })
      toast.success('Transferência rejeitada')
      loadData()
    } catch (e) {
      toast.error('Erro ao rejeitar')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            Transferências entre Unidades
          </h1>
          <p className="text-muted-foreground">
            Solicitações de movimentação de pacientes e lotes de estoque.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nenhuma transferência solicitada
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created).toLocaleDateString()}</TableCell>
                    <TableCell>{t.type === 'inventory' ? 'Estoque' : 'Paciente'}</TableCell>
                    <TableCell>{t.expand?.source_clinic_id?.name || '-'}</TableCell>
                    <TableCell>{t.expand?.target_clinic_id?.name || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${t.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : t.status === 'approved' || t.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprove(t.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleReject(t.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                          </Button>
                        </div>
                      )}
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
            <DialogTitle>Solicitar Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Transferência</Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData({ ...formData, type: v, source_clinic_id: '', item_id: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Lote de Estoque</SelectItem>
                  <SelectItem value="patient_record">Cadastro de Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clínica de Origem</Label>
                <Select
                  value={formData.source_clinic_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, source_clinic_id: v, item_id: '' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Clínica de Destino</Label>
                <Select
                  value={formData.target_clinic_id}
                  onValueChange={(v) => setFormData({ ...formData, target_clinic_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.source_clinic_id && (
              <div className="space-y-2">
                <Label>
                  {formData.type === 'inventory' ? 'Selecione o Lote' : 'Selecione o Paciente'}
                </Label>
                <Select
                  value={formData.item_id}
                  onValueChange={(v) => setFormData({ ...formData, item_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o item..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'inventory' && (
              <div className="space-y-2">
                <Label>Quantidade a Transferir (Apenas para registro)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRequest}
              disabled={
                !formData.source_clinic_id ||
                !formData.target_clinic_id ||
                !formData.item_id ||
                formData.source_clinic_id === formData.target_clinic_id
              }
            >
              Confirmar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
