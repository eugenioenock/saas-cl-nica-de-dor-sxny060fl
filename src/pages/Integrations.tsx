import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { IntegrationCard } from '@/components/integrations/IntegrationCard'
import { IntegrationEditor } from '@/components/integrations/IntegrationEditor'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '@/hooks/use-app-context'

export default function Integrations() {
  const { user } = useAuth()
  const { activeClinic } = useAppContext()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const loadData = async () => {
    if (!activeClinic?.id) return
    try {
      const records = await pb
        .collection('integrations')
        .getFullList({ sort: '-created', filter: `clinic_id = "${activeClinic.id}"` })
      setIntegrations(records)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') loadData()
  }, [user, activeClinic?.id])

  useRealtime('integrations', loadData, user?.role === 'admin')

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await pb.collection('integrations').update(id, { is_active: active })
      toast.success(active ? 'Integração ativada' : 'Integração desativada')
    } catch (e) {
      toast.error('Erro ao alterar status da integração')
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        await pb.collection('integrations').update(data.id, data)
        toast.success('Integração atualizada com sucesso')
      } else {
        await pb.collection('integrations').create({ ...data, clinic_id: activeClinic?.id })
        toast.success('Nova integração adicionada')
      }
      setIsEditorOpen(false)
    } catch (e) {
      toast.error('Erro ao salvar configuração')
    }
  }

  const openEditor = (item?: any) => {
    setEditing(item || null)
    setIsEditorOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Gerencie serviços externos e templates de comunicação.
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Integração
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {integrations.map((item) => (
          <IntegrationCard
            key={item.id}
            integration={item}
            onEdit={() => openEditor(item)}
            onToggle={handleToggle}
          />
        ))}
        {integrations.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed rounded-lg bg-muted/10 text-muted-foreground flex flex-col items-center justify-center gap-2">
            Nenhuma integração configurada ainda.
            <Button variant="link" onClick={() => openEditor()}>
              Adicione sua primeira integração
            </Button>
          </div>
        )}
      </div>

      <IntegrationEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        integration={editing}
        onSave={handleSave}
      />
    </div>
  )
}
