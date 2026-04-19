import { useState, useEffect, useRef } from 'react'
import { FileSignature, Loader2, AlertTriangle, PenTool } from 'lucide-react'
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

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && selectedTemplate) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 2
      }

      const preventDefault = (e: Event) => e.preventDefault()
      canvas.addEventListener('touchstart', preventDefault, { passive: false })
      canvas.addEventListener('touchmove', preventDefault, { passive: false })

      return () => {
        canvas.removeEventListener('touchstart', preventDefault)
        canvas.removeEventListener('touchmove', preventDefault)
      }
    }
  }, [selectedTemplate])

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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.beginPath()
    }
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const clearSignature = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
      }
    }
  }

  const isCanvasEmpty = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return true
    const blank = document.createElement('canvas')
    blank.width = canvas.width
    blank.height = canvas.height
    const ctx = blank.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, blank.width, blank.height)
    }
    return canvas.toDataURL() === blank.toDataURL()
  }

  const generateHash = (str: string) => {
    let hash = 0
    for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i)
      hash = (hash << 5) - hash + chr
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  }

  const handleSubmit = async (ignoreStock = false) => {
    if (!selectedTemplate) return

    const dataUrl = canvasRef.current?.toDataURL('image/png')
    if (!dataUrl || isCanvasEmpty(canvasRef.current)) {
      toast.error('A assinatura digital do paciente é obrigatória para este procedimento.')
      return
    }

    setLoading(true)
    setStockWarning(null)

    try {
      const finalNote = noteContent + `\n\n---\nProtocolo: ${selectedTemplate.name}`
      await pb.send('/backend/v1/protocols/apply', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          template_id: selectedTemplate.id,
          note_content: finalNote,
          amount: Number(amount),
          billing_type: billingType,
          ignore_stock: ignoreStock,
        }),
      })

      const hash = generateHash(dataUrl)

      try {
        const recentNotes = await pb.collection('medical_notes').getList(1, 1, {
          filter: `patient_id="${patientId}" && created >= "${new Date(Date.now() - 60000).toISOString()}"`,
          sort: '-created',
        })
        if (recentNotes.items.length > 0) {
          await pb.collection('medical_notes').update(recentNotes.items[0].id, {
            is_signed: true,
            signed_at: new Date().toISOString(),
            signature_hash: hash,
          })
        }

        const recentUsages = await pb.collection('inventory_usage').getFullList({
          filter: `patient_id="${patientId}" && created >= "${new Date(Date.now() - 60000).toISOString()}"`,
        })
        for (const usage of recentUsages) {
          await pb.collection('inventory_usage').update(usage.id, {
            is_verified: true,
            verified_at: new Date().toISOString(),
            signature_hash: hash,
          })
        }
      } catch (err) {
        console.warn('Could not save signature hash directly', err)
      }

      toast.success('Protocolo clínico aplicado e assinado com sucesso!')
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
            estoque e coletar o consentimento do paciente.
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
                  className="min-h-[120px]"
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

              <div className="space-y-2 border rounded-md p-3 bg-slate-50">
                <div className="flex justify-between items-center mb-2">
                  <Label className="flex items-center gap-2 text-slate-800 font-semibold">
                    <PenTool className="h-4 w-4" />
                    Assinatura do Paciente (Termo de Consentimento)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="h-7 px-3 text-xs bg-white"
                  >
                    Limpar
                  </Button>
                </div>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 border border-slate-300 rounded bg-white cursor-crosshair touch-none shadow-inner"
                />
                <p className="text-[11px] text-slate-500 mt-1 text-center">
                  O paciente deve assinar no quadro acima para registrar o consentimento.
                </p>
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
