import { useState, useEffect } from 'react'
import { FileSignature, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ProtocolModalProps {
  patientId: string
  onSuccess: () => void
}

export function ProtocolModal({ patientId, onSuccess }: ProtocolModalProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [noteContent, setNoteContent] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [billingType, setBillingType] = useState('private')
  const [loading, setLoading] = useState(false)
  const [stockWarning, setStockWarning] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadTemplates()
    } else {
      setSelectedTemplate(null)
      setNoteContent('')
      setAmount(0)
      setStockWarning(null)
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      const data = await pb.collection('clinic_templates').getFullList({
        filter: `type='consultation_pattern'`,
        sort: 'name',
      })
      setTemplates(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelect = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    setSelectedTemplate(t)
    if (t) {
      const config = t.config_data || {}
      setNoteContent(config.note_template || '')
      setAmount(config.financial_impact?.amount || 0)
      setBillingType(config.financial_impact?.billing_type || 'private')
    }
    setStockWarning(null)
  }

  const handleSubmit = async (ignoreStock = false) => {
    if (!selectedTemplate) return
    setLoading(true)
    setStockWarning(null)

    try {
      await pb.send('/backend/v1/protocols/apply', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          template_id: selectedTemplate.id,
          note_content: noteContent,
          amount: Number(amount),
          billing_type: billingType,
          ignore_stock: ignoreStock,
        }),
      })

      toast.success('Protocolo clínico aplicado com sucesso!')
      setOpen(false)
      onSuccess()
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      if (errors._stock_warning) {
        setStockWarning(errors._stock_warning)
      } else {
        toast.error(err.message || 'Erro ao aplicar protocolo clínico')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2 shrink-0">
          <FileSignature className="h-4 w-4" />
          Aplicar Protocolo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aplicar Protocolo Clínico</DialogTitle>
          <DialogDescription>
            Selecione um protocolo para preencher automaticamente o prontuário, deduzir materiais do
            estoque e gerar a cobrança respectiva.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Protocolo Padrão</Label>
            <Select onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um protocolo..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <>
              <div className="space-y-2">
                <Label>Prontuário Gerado</Label>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Gerado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Faturamento</Label>
                  <Select value={billingType} onValueChange={setBillingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Particular</SelectItem>
                      <SelectItem value="insurance">Convênio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-600">
                <strong>Materiais previstos: </strong>
                {selectedTemplate.config_data?.required_materials?.length > 0 ? (
                  <span>
                    {selectedTemplate.config_data.required_materials.length} item(ns) será(ão)
                    deduzido(s) do estoque.
                  </span>
                ) : (
                  <span>Nenhum material associado a este protocolo.</span>
                )}
              </div>
            </>
          )}

          {stockWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Estoque Insuficiente</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{stockWarning}</p>
                <p>
                  Deseja prosseguir assim mesmo? (Os materiais sem estoque suficiente não serão
                  deduzidos totalmente).
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sim, Continuar e Ignorar Falta de Estoque
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={!selectedTemplate || loading || !!stockWarning}
          >
            {loading && !stockWarning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
