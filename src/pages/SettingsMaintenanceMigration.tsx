import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Database, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

export default function SettingsMaintenanceMigration() {
  const { user } = useAuth()
  const [clinics, setClinics] = useState<any[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string>('')
  const [batchSize, setBatchSize] = useState<string>('50')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [processed, setProcessed] = useState(0)

  useEffect(() => {
    pb.collection('clinic_settings')
      .getFullList({ sort: 'name' })
      .then((data) => {
        setClinics(data)
        if (data.length > 0) setSelectedClinic(data[0].id)
      })
      .catch(() => toast.error('Erro ao carregar clínicas'))
      .finally(() => setLoading(false))
  }, [])

  const handleMigrate = async () => {
    if (!selectedClinic) return toast.error('Selecione uma clínica destino')

    setMigrating(true)
    setProcessed(0)
    let hasMore = true
    let totalMigrated = 0

    try {
      while (hasMore) {
        const res = await pb.send('/backend/v1/maintenance/migrate-batch', {
          method: 'POST',
          body: JSON.stringify({
            clinic_id: selectedClinic,
            batch_size: parseInt(batchSize, 10),
          }),
        })

        totalMigrated += res.migrated
        hasMore = res.remaining
        setProcessed(totalMigrated)

        if (res.migrated === 0) hasMore = false
      }
      toast.success(`Migração concluída! ${totalMigrated} registros processados.`)
    } catch (error) {
      toast.error('Erro durante a migração em lote')
    } finally {
      setMigrating(false)
    }
  }

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8 text-primary" />
          Migração de Histórico
        </h1>
        <p className="text-muted-foreground">
          Processe registros órfãos em lotes e os atribua a uma unidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração do Lote</CardTitle>
          <CardDescription>
            Defina o destino e a quantidade de registros por ciclo de migração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Esta operação associa registros antigos sem clínica à unidade selecionada.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Clínica de Destino</label>
              <Select value={selectedClinic} onValueChange={setSelectedClinic}>
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
              <label className="text-sm font-medium">Tamanho do Lote</label>
              <Select value={batchSize} onValueChange={setBatchSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="500">500 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {migrating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground animate-pulse">Processando lotes...</span>
                <span className="font-medium">{processed} migrados</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={migrating} className="w-full sm:w-auto mt-4">
                {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Migração
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Migração</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja processar os registros órfãos em lotes de {batchSize} e
                  associá-los à clínica selecionada? Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={handleMigrate}>Confirmar e Iniciar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
