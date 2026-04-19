import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Database, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function SettingsMaintenance() {
  const { user } = useAuth()
  const [clinics, setClinics] = useState<any[]>([])
  const [selectedClinic, setSelectedClinic] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    pb.collection('clinic_settings')
      .getFullList({ sort: 'name' })
      .then((data) => {
        setClinics(data)
        if (data.length > 0) setSelectedClinic(data[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleMigrate = async () => {
    if (!selectedClinic) {
      toast.error('Selecione uma clínica destino')
      return
    }

    if (
      !confirm(
        'Esta ação irá associar todos os registros órfãos à clínica selecionada. Deseja continuar?',
      )
    ) {
      return
    }

    setMigrating(true)
    try {
      const res = await pb.send('/backend/v1/maintenance/migrate-orphans', {
        method: 'POST',
        body: JSON.stringify({ clinic_id: selectedClinic }),
      })
      toast.success(`${res.updated} registros atualizados com sucesso.`)
    } catch (error: any) {
      console.error(error)
      toast.error('Erro na migração', { description: error.message })
    } finally {
      setMigrating(false)
    }
  }

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
          Manutenção de Dados
        </h1>
        <p className="text-muted-foreground">
          Ferramentas avançadas para integridade do banco de dados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorização de Dados Legados</CardTitle>
          <CardDescription>
            Atribui registros antigos que não possuem uma clínica associada (órfãos) a uma clínica
            específica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Esta operação afeta pacientes, consultas, prontuários e inventário que foram criados
              antes do sistema multi-clínicas.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Clínica de Destino para Registros Órfãos
              </label>
              <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a clínica..." />
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

            <Button onClick={handleMigrate} disabled={migrating} className="w-full sm:w-auto">
              {migrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Executar Migração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
