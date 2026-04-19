import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Loader2, ArrowLeft, ScanBarcode } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { ScannerDialog } from '@/components/ScannerDialog'

export default function QuickUsage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [materials, setMaterials] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])

  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [quantity, setQuantity] = useState<number | ''>('')

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [mats, pats] = await Promise.all([
          pb
            .collection('clinical_inventory')
            .getFullList({ filter: 'current_quantity > 0', sort: 'name' }),
          pb.collection('patients').getFullList({ sort: 'name' }),
        ])
        setMaterials(mats)
        setPatients(pats)
      } catch (e) {
        console.error(e)
      } finally {
        setInitialLoading(false)
      }
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (!selectedMaterial) {
      setBatches([])
      setSelectedBatch('')
      return
    }
    const loadBatches = async () => {
      try {
        const b = await pb.collection('inventory_batches').getFullList({
          filter: `material_id = "${selectedMaterial}" && current_quantity > 0`,
          sort: 'expiry_date',
        })
        setBatches(b)
        if (b.length > 0) {
          setSelectedBatch(b[0].id)
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadBatches()
  }, [selectedMaterial])

  const handleConfirm = async () => {
    if (!selectedBatch || !quantity || quantity <= 0 || !selectedPatient) {
      toast({ title: 'Preencha todos os campos corretamente', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const batch = batches.find((b) => b.id === selectedBatch)
      if (quantity > batch.current_quantity) {
        toast({
          title: `Quantidade indisponível. Lote tem apenas ${batch.current_quantity}`,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // 1. Create Usage Record
      await pb.collection('inventory_usage').create({
        batch_id: selectedBatch,
        patient_id: selectedPatient,
        quantity_used: quantity,
        professional_id: user?.id,
        usage_date: new Date().toISOString(),
      })

      // 2. Decrement Batch
      await pb.collection('inventory_batches').update(selectedBatch, {
        current_quantity: batch.current_quantity - quantity,
      })

      // 3. Decrement Material
      const material = materials.find((m) => m.id === selectedMaterial)
      if (material) {
        await pb.collection('clinical_inventory').update(selectedMaterial, {
          current_quantity: material.current_quantity - quantity,
        })
      }

      toast({ title: 'Uso registrado com sucesso!' })

      setSelectedMaterial('')
      setSelectedBatch('')
      setSelectedPatient('')
      setQuantity('')
    } catch (e) {
      console.error(e)
      toast({ title: 'Erro ao registrar uso', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    )
  }

  const handleScan = (text: string) => {
    const matchedBatch = batches.find((b) => b.batch_number === text)
    if (matchedBatch) {
      setSelectedMaterial(matchedBatch.material_id)
      setTimeout(() => setSelectedBatch(matchedBatch.id), 100)
      toast({ title: 'Lote encontrado' })
      return
    }
    const matchedMat = materials.find((m) => m.barcode === text || m.id === text)
    if (matchedMat) {
      setSelectedMaterial(matchedMat.id)
      toast({ title: 'Material encontrado' })
      return
    }
    toast({ title: 'Código não reconhecido', variant: 'destructive' })
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Uso Rápido</h1>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Registrar Consumo</CardTitle>
          <CardDescription>Acesse pelo celular durante o atendimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Material / Lote</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
              >
                <ScanBarcode className="w-4 h-4 mr-2" /> Escanear
              </Button>
            </div>
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione o material" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}{' '}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({m.current_quantity} {m.unit})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {batches.length > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-base font-semibold">Lote (Auto-sugerido por validade)</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione o lote" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      Lote: {b.batch_number}{' '}
                      <span className="text-muted-foreground ml-2 text-xs">
                        (Disp: {b.current_quantity})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-base font-semibold">Paciente Associado</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Quantidade Utilizada</Label>
            <Input
              type="number"
              className="h-14 text-lg font-bold text-center"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full h-14 text-lg font-bold rounded-xl"
            onClick={handleConfirm}
            disabled={loading || !selectedBatch || !quantity || !selectedPatient}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-6 h-6 mr-2" />
            )}
            Confirmar Uso
          </Button>
        </CardFooter>
      </Card>

      <ScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} />
    </div>
  )
}
