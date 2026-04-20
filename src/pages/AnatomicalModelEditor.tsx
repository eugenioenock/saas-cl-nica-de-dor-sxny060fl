import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, Save, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import bodyImage from '@/assets/corpo-humano-a2474.jpg'

const DEFAULT_POINTS = [
  { id: 'cervical', name: 'Coluna Cervical', view: 'back', x: 50, y: 15, w: 10, h: 8 },
  { id: 'toracica', name: 'Coluna Torácica', view: 'back', x: 50, y: 28, w: 12, h: 14 },
  { id: 'lombar', name: 'Coluna Lombar', view: 'back', x: 50, y: 44, w: 14, h: 12 },
  { id: 'ombro_esq', name: 'Ombro Esquerdo', view: 'back', x: 34, y: 20, w: 12, h: 10 },
  { id: 'ombro_dir', name: 'Ombro Direito', view: 'back', x: 66, y: 20, w: 12, h: 10 },
  { id: 'cotovelo_esq', name: 'Cotovelo Esquerdo', view: 'back', x: 23, y: 38, w: 10, h: 10 },
  { id: 'cotovelo_dir', name: 'Cotovelo Direito', view: 'back', x: 77, y: 38, w: 10, h: 10 },
  { id: 'punho_esq', name: 'Punho Esquerdo', view: 'back', x: 18, y: 50, w: 8, h: 10 },
  { id: 'punho_dir', name: 'Punho Direito', view: 'back', x: 82, y: 50, w: 8, h: 10 },
  { id: 'quadril_esq', name: 'Quadril Esquerdo', view: 'back', x: 38, y: 54, w: 14, h: 14 },
  { id: 'quadril_dir', name: 'Quadril Direito', view: 'back', x: 62, y: 54, w: 14, h: 14 },
  { id: 'joelho_esq', name: 'Joelho Esquerdo', view: 'back', x: 39, y: 68, w: 12, h: 12 },
  { id: 'joelho_dir', name: 'Joelho Direito', view: 'back', x: 61, y: 68, w: 12, h: 12 },
  { id: 'pe_esq', name: 'Pé Esquerdo', view: 'back', x: 41, y: 94, w: 10, h: 8 },
  { id: 'pe_dir', name: 'Pé Direito', view: 'back', x: 59, y: 94, w: 10, h: 8 },
]

export default function AnatomicalModelEditor() {
  const { user } = useAuth()
  const [template, setTemplate] = useState<any>(null)
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const records = await pb
          .collection('clinic_templates')
          .getFullList({ filter: 'type="anatomical_model"' })
        if (records.length > 0) {
          setTemplate(records[0])
          setPoints(records[0].config_data?.points || DEFAULT_POINTS)
        } else {
          setPoints(DEFAULT_POINTS)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadTemplate()
  }, [])

  const saveModel = async () => {
    setSaving(true)
    try {
      if (template) {
        await pb.collection('clinic_templates').update(template.id, {
          config_data: { points },
        })
      } else {
        const res = await pb.collection('clinic_templates').create({
          name: 'Padrão Anatômico Global',
          type: 'anatomical_model',
          config_data: { points },
        })
        setTemplate(res)
      }
      toast.success('Master template synchronized successfully')
    } catch (err) {
      toast.error('Erro ao salvar modelo')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modelo Anatômico Master</h1>
          <p className="text-muted-foreground">
            Configure as posições globais padrão para os marcadores de dor
          </p>
        </div>
        <Button onClick={saveModel} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Salvando...' : 'Salvar Modelo'}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Editor Visual</CardTitle>
            <CardDescription>
              Arraste os marcadores para definir a posição padrão de cada região no modelo humano.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-slate-950 flex items-center justify-center rounded-b-xl border-t">
            <div
              ref={containerRef}
              className="relative aspect-[1/2] w-full max-w-sm rounded-2xl overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] select-none touch-none"
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/10 via-transparent to-transparent" />
              <img
                src={bodyImage}
                alt="Anatomia Muscular"
                className="w-full h-full object-cover pointer-events-none opacity-80"
                onError={(e) => {
                  e.currentTarget.src =
                    'https://img.usecurling.com/p/600/1200?q=anatomy%20back%20muscles&color=cyan'
                }}
              />

              {points.map((pt) => {
                return (
                  <div
                    key={pt.id}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      setDraggingPointId(pt.id)
                    }}
                    onPointerMove={(e) => {
                      if (draggingPointId !== pt.id || !containerRef.current) return
                      const rect = containerRef.current.getBoundingClientRect()
                      let x = ((e.clientX - rect.left) / rect.width) * 100
                      let y = ((e.clientY - rect.top) / rect.height) * 100
                      x = Number(Math.max(0, Math.min(100, x)).toFixed(1))
                      y = Number(Math.max(0, Math.min(100, y)).toFixed(1))
                      setPoints((prev) => prev.map((p) => (p.id === pt.id ? { ...p, x, y } : p)))
                    }}
                    onPointerUp={(e) => {
                      if (draggingPointId !== pt.id) return
                      e.currentTarget.releasePointerCapture(e.pointerId)
                      setDraggingPointId(null)
                    }}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 rounded-[40%] transition-all duration-75 cursor-move z-30',
                      draggingPointId === pt.id
                        ? 'bg-cyan-400/80 shadow-[0_0_20px_10px_rgba(34,211,238,0.8)] border-2 border-cyan-400 scale-110'
                        : 'bg-cyan-400/40 shadow-[0_0_10px_5px_rgba(34,211,238,0.4)] border-2 border-cyan-400/80',
                      draggingPointId && draggingPointId !== pt.id && 'opacity-50',
                    )}
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      width: `${pt.w}%`,
                      height: `${pt.h}%`,
                      touchAction: 'none',
                    }}
                    title={pt.name}
                  >
                    {draggingPointId === pt.id && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-50">
                        {pt.name} ({pt.x}%, {pt.y}%)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Lista de Marcadores
            </CardTitle>
            <CardDescription>Coordenadas padrão</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
              {points.map((pt, i) => (
                <div
                  key={pt.id}
                  className="flex justify-between items-center p-2 rounded border bg-muted/20 text-sm"
                >
                  <span className="font-medium">
                    {i + 1}. {pt.name}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    X: {pt.x} Y: {pt.y}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
