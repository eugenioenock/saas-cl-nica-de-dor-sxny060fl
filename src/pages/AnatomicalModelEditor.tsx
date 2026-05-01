import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { Navigate, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, Save, MapPin, ArrowLeft } from 'lucide-react'
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
  { id: 'cabeca_frente', name: 'Cabeça', view: 'front', x: 50, y: 10, w: 12, h: 10 },
  { id: 'peito_esq', name: 'Peitoral Esquerdo', view: 'front', x: 66, y: 25, w: 12, h: 12 },
  { id: 'peito_dir', name: 'Peitoral Direito', view: 'front', x: 34, y: 25, w: 12, h: 12 },
  { id: 'abdomen', name: 'Abdômen', view: 'front', x: 50, y: 40, w: 16, h: 14 },
  {
    id: 'ombro_frente_esq',
    name: 'Ombro Esquerdo (Frente)',
    view: 'front',
    x: 78,
    y: 22,
    w: 10,
    h: 10,
  },
  {
    id: 'ombro_frente_dir',
    name: 'Ombro Direito (Frente)',
    view: 'front',
    x: 22,
    y: 22,
    w: 10,
    h: 10,
  },
  {
    id: 'braco_frente_esq',
    name: 'Braço Esquerdo (Frente)',
    view: 'front',
    x: 82,
    y: 35,
    w: 8,
    h: 12,
  },
  {
    id: 'braco_frente_dir',
    name: 'Braço Direito (Frente)',
    view: 'front',
    x: 18,
    y: 35,
    w: 8,
    h: 12,
  },
  { id: 'coxa_esq', name: 'Coxa Esquerda', view: 'front', x: 62, y: 55, w: 12, h: 16 },
  { id: 'coxa_dir', name: 'Coxa Direita', view: 'front', x: 38, y: 55, w: 12, h: 16 },
  {
    id: 'joelho_frente_esq',
    name: 'Joelho Esquerdo (Frente)',
    view: 'front',
    x: 61,
    y: 68,
    w: 10,
    h: 10,
  },
  {
    id: 'joelho_frente_dir',
    name: 'Joelho Direito (Frente)',
    view: 'front',
    x: 39,
    y: 68,
    w: 10,
    h: 10,
  },
  { id: 'canela_esq', name: 'Canela Esquerda', view: 'front', x: 61, y: 82, w: 10, h: 14 },
  { id: 'canela_dir', name: 'Canela Direita', view: 'front', x: 39, y: 82, w: 10, h: 14 },
  { id: 'pe_frente_esq', name: 'Pé Esquerdo (Frente)', view: 'front', x: 63, y: 94, w: 10, h: 8 },
  { id: 'pe_frente_dir', name: 'Pé Direito (Frente)', view: 'front', x: 37, y: 94, w: 10, h: 8 },
]

export default function AnatomicalModelEditor() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<any>(null)
  const [points, setPoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<'front' | 'back'>('back')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        document.getElementById('save-model-btn')?.click()
        return
      }

      if (!selectedPointId) return

      if (e.key === 'Escape') {
        setSelectedPointId(null)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        setPoints((prev) => prev.filter((p) => p.id !== selectedPointId))
        setSelectedPointId(null)
        return
      }

      const step = e.shiftKey ? 5 : 1
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedPointId ? { ...p, y: Math.max(0, p.y - step) } : p)),
        )
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedPointId ? { ...p, y: Math.min(100, p.y + step) } : p)),
        )
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedPointId ? { ...p, x: Math.max(0, p.x - step) } : p)),
        )
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedPointId ? { ...p, x: Math.min(100, p.x + step) } : p)),
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPointId])

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const records = await pb
          .collection('clinic_templates')
          .getFullList({ filter: 'type="anatomical_model"' })
        if (records.length > 0) {
          setTemplate(records[0])
          const savedPoints = records[0].config_data?.points || []
          // Merge with DEFAULT_POINTS to ensure any new regions are included automatically
          const mergedPoints = [...savedPoints]
          DEFAULT_POINTS.forEach((dp) => {
            if (!mergedPoints.find((p) => p.id === dp.id)) {
              mergedPoints.push(dp)
            }
          })
          setPoints(mergedPoints)
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
      toast.success('Modelo anatômico atualizado com sucesso!')
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
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Modelo Anatômico Master</h1>
            <p className="text-muted-foreground">
              Configure as posições globais padrão para os marcadores de dor
            </p>
          </div>
        </div>
        <Button id="save-model-btn" onClick={saveModel} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saving ? 'Salvando...' : 'Salvar Modelo'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-0 glass-panel overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 border-b pb-4">
            <div>
              <CardTitle className="text-lg">Editor Visual</CardTitle>
              <CardDescription>
                Ajuste os pontos padrão arrastando-os sobre a imagem.
              </CardDescription>
            </div>
            <div className="flex bg-muted p-1 rounded-lg shrink-0">
              <Button
                size="sm"
                variant={currentView === 'front' ? 'default' : 'ghost'}
                onClick={() => setCurrentView('front')}
                className="h-7 text-xs px-3"
              >
                Frente
              </Button>
              <Button
                size="sm"
                variant={currentView === 'back' ? 'default' : 'ghost'}
                onClick={() => setCurrentView('back')}
                className="h-7 text-xs px-3"
              >
                Costas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 bg-slate-950 flex flex-col items-center justify-center relative">
            <div className="absolute top-4 right-4 bg-black/60 text-[10px] text-white p-3 rounded-lg border border-white/10 hidden lg:block z-10 pointer-events-none backdrop-blur-sm">
              <p className="font-semibold mb-2 text-cyan-400">Atalhos de Teclado:</p>
              <ul className="space-y-1.5 opacity-90">
                <li>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded mr-1 shadow-sm">Setas</kbd>{' '}
                  Mover 1%
                </li>
                <li>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded mr-1 shadow-sm">
                    Shift+Setas
                  </kbd>{' '}
                  Mover 5%
                </li>
                <li>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded mr-1 shadow-sm">Del</kbd>{' '}
                  Remover
                </li>
                <li>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded mr-1 shadow-sm">Esc</kbd>{' '}
                  Deselecionar
                </li>
                <li>
                  <kbd className="bg-white/20 px-1.5 py-0.5 rounded mr-1 shadow-sm">Ctrl+S</kbd>{' '}
                  Salvar
                </li>
              </ul>
            </div>

            <div
              ref={containerRef}
              className="relative aspect-[1/2] w-full max-w-[320px] rounded-2xl overflow-hidden shadow-[0_0_40px_-15px_rgba(0,0,0,0.5)] select-none touch-none"
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/10 via-transparent to-transparent" />
              <img
                src={
                  currentView === 'back'
                    ? bodyImage
                    : 'https://img.usecurling.com/p/600/1200?q=detailed%20human%20anatomy%20front%20muscles&color=cyan&dpr=2'
                }
                alt={
                  currentView === 'back'
                    ? 'Anatomia Muscular (Costas)'
                    : 'Anatomia Muscular (Frente)'
                }
                className="w-full h-full object-cover pointer-events-none opacity-85 transition-all duration-500"
                onError={(e) => {
                  e.currentTarget.src =
                    currentView === 'back'
                      ? 'https://img.usecurling.com/p/600/1200?q=detailed%20human%20anatomy%20back%20muscles&color=cyan&dpr=2'
                      : 'https://img.usecurling.com/p/600/1200?q=detailed%20human%20anatomy%20front%20muscles&color=cyan&dpr=2'
                }}
              />

              {points
                .filter((pt) => (pt.view || 'back') === currentView)
                .map((pt) => {
                  return (
                    <div
                      key={pt.id}
                      onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setDraggingPointId(pt.id)
                        setSelectedPointId(pt.id)
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
                        draggingPointId === pt.id || selectedPointId === pt.id
                          ? 'bg-cyan-400/80 shadow-[0_0_20px_10px_rgba(34,211,238,0.8)] border-2 border-cyan-400 scale-110 ring-2 ring-white/80'
                          : 'bg-cyan-400/40 shadow-[0_0_10px_5px_rgba(34,211,238,0.4)] border-2 border-cyan-400/80',
                        selectedPointId && selectedPointId !== pt.id && 'opacity-50',
                      )}
                      style={{
                        left: `${pt.x}%`,
                        top: `${pt.y}%`,
                        width: `${pt.w || 10}%`,
                        height: `${pt.h || 10}%`,
                        touchAction: 'none',
                      }}
                      title={pt.name}
                    >
                      {(draggingPointId === pt.id || selectedPointId === pt.id) && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50 font-medium">
                          {pt.name} ({pt.x}%, {pt.y}%)
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 glass-panel flex flex-col h-[700px] lg:h-auto">
          <CardHeader className="bg-background/50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Lista de Regiões
            </CardTitle>
            <CardDescription>
              {points.filter((pt) => (pt.view || 'back') === currentView).length} regiões na visão
              atual
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-muted/10">
            <div className="p-4 space-y-2">
              {points
                .filter((pt) => (pt.view || 'back') === currentView)
                .map((pt, i) => (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPointId(pt.id)}
                    className={cn(
                      'flex justify-between items-center p-3 rounded-xl border transition-colors cursor-pointer',
                      selectedPointId === pt.id
                        ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                        : 'bg-background hover:bg-muted/50 hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          selectedPointId === pt.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {i + 1}
                      </div>
                      <span className="font-medium text-sm text-foreground truncate max-w-[140px]">
                        {pt.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                      {pt.x}%, {pt.y}%
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
