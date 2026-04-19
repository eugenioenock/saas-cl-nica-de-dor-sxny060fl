import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Loader2, Target } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ProfessionalGoalDialog({ user, clinicId }: { user: any; clinicId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [goalId, setGoalId] = useState('')
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [baseGoal, setBaseGoal] = useState<number>(0)
  const [tiers, setTiers] = useState<{ min: number; max: number; rate: number }[]>([])

  const loadGoal = async () => {
    setLoading(true)
    try {
      const record = await pb
        .collection('professional_goals')
        .getFirstListItem(`professional_id = "${user.id}" && month = "${month}"`)
      setGoalId(record.id)
      setBaseGoal(record.base_goal)
      setTiers(record.commission_tiers || [])
    } catch (e) {
      setGoalId('')
      setBaseGoal(0)
      setTiers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadGoal()
  }, [open, month])

  const handleSave = async () => {
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].min >= tiers[i].max && tiers[i].max !== 0) {
        toast.error('Erro de validação: Min não pode ser maior que Max.')
        return
      }
      if (i > 0 && tiers[i].min <= tiers[i - 1].max) {
        toast.error('Erro de validação: Faixas sobrepostas.')
        return
      }
    }

    setSaving(true)
    try {
      const data = {
        professional_id: user.id,
        clinic_id: clinicId,
        month,
        base_goal: baseGoal,
        commission_tiers: tiers,
        status: 'active',
      }
      if (goalId) {
        await pb.collection('professional_goals').update(goalId, data)
      } else {
        const record = await pb.collection('professional_goals').create(data)
        setGoalId(record.id)
      }
      toast.success('Metas salvas com sucesso!')
      setOpen(false)
    } catch (e) {
      toast.error('Erro ao salvar metas')
    } finally {
      setSaving(false)
    }
  }

  const addTier = () => {
    setTiers([...tiers, { min: 0, max: 0, rate: 0 }])
  }

  const removeTier = (idx: number) => {
    setTiers(tiers.filter((_, i) => i !== idx))
  }

  const updateTier = (idx: number, field: string, value: number) => {
    const newTiers = [...tiers]
    newTiers[idx] = { ...newTiers[idx], [field]: value }
    setTiers(newTiers)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="h-4 w-4" /> Metas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Metas e Comissões: {user.name || user.email}</DialogTitle>
          <DialogDescription>
            Configure as metas de receita e comissões em cascata para este profissional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês Referência</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta Base de Receita (R$)</Label>
              <Input
                type="number"
                value={baseGoal}
                onChange={(e) => setBaseGoal(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Faixas de Comissão</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTier}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Faixa
              </Button>
            </div>

            <ScrollArea className="h-[250px] rounded-md border p-4 bg-muted/20">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                </div>
              ) : tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma faixa configurada.
                </p>
              ) : (
                <div className="space-y-4">
                  {tiers.map((t, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Mínimo (R$)</Label>
                        <Input
                          type="number"
                          value={t.min}
                          onChange={(e) => updateTier(idx, 'min', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Máximo (R$)</Label>
                        <Input
                          type="number"
                          value={t.max}
                          onChange={(e) => updateTier(idx, 'max', Number(e.target.value))}
                          placeholder="0 para ∞"
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs">Taxa (%)</Label>
                        <Input
                          type="number"
                          value={t.rate}
                          onChange={(e) => updateTier(idx, 'rate', Number(e.target.value))}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive mb-0.5"
                        onClick={() => removeTier(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Metas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
