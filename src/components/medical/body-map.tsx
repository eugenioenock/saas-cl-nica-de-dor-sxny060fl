import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Trash2, MapPin, Loader2, X, Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'

type MapView = 'front' | 'back'

const ANATOMY_REGIONS = [
  { id: 'cervical', name: 'Coluna Cervical', view: 'back', x: 50, y: 14, w: 14, h: 10 },
  { id: 'toracica', name: 'Coluna Torácica', view: 'back', x: 50, y: 28, w: 16, h: 15 },
  { id: 'lombar', name: 'Coluna Lombar', view: 'back', x: 50, y: 46, w: 18, h: 12 },

  { id: 'ombro_dir_f', name: 'Ombro Direito', view: 'front', x: 28, y: 20, w: 15, h: 12 },
  { id: 'ombro_esq_f', name: 'Ombro Esquerdo', view: 'front', x: 72, y: 20, w: 15, h: 12 },
  { id: 'ombro_dir_b', name: 'Ombro Direito', view: 'back', x: 72, y: 20, w: 15, h: 12 },
  { id: 'ombro_esq_b', name: 'Ombro Esquerdo', view: 'back', x: 28, y: 20, w: 15, h: 12 },

  { id: 'cotovelo_dir_f', name: 'Cotovelo Direito', view: 'front', x: 18, y: 40, w: 12, h: 10 },
  { id: 'cotovelo_esq_f', name: 'Cotovelo Esquerdo', view: 'front', x: 82, y: 40, w: 12, h: 10 },
  { id: 'cotovelo_dir_b', name: 'Cotovelo Direito', view: 'back', x: 82, y: 40, w: 12, h: 10 },
  { id: 'cotovelo_esq_b', name: 'Cotovelo Esquerdo', view: 'back', x: 18, y: 40, w: 12, h: 10 },

  { id: 'punho_dir_f', name: 'Punho Direito', view: 'front', x: 10, y: 55, w: 10, h: 8 },
  { id: 'punho_esq_f', name: 'Punho Esquerdo', view: 'front', x: 90, y: 55, w: 10, h: 8 },
  { id: 'punho_dir_b', name: 'Punho Direito', view: 'back', x: 90, y: 55, w: 10, h: 8 },
  { id: 'punho_esq_b', name: 'Punho Esquerdo', view: 'back', x: 10, y: 55, w: 10, h: 8 },

  { id: 'quadril_dir_f', name: 'Quadril Direito', view: 'front', x: 38, y: 52, w: 16, h: 12 },
  { id: 'quadril_esq_f', name: 'Quadril Esquerdo', view: 'front', x: 62, y: 52, w: 16, h: 12 },
  { id: 'quadril_dir_b', name: 'Quadril Direito', view: 'back', x: 62, y: 52, w: 16, h: 12 },
  { id: 'quadril_esq_b', name: 'Quadril Esquerdo', view: 'back', x: 38, y: 52, w: 16, h: 12 },

  { id: 'joelho_dir_f', name: 'Joelho Direito', view: 'front', x: 35, y: 75, w: 15, h: 10 },
  { id: 'joelho_esq_f', name: 'Joelho Esquerdo', view: 'front', x: 65, y: 75, w: 15, h: 10 },
  { id: 'joelho_dir_b', name: 'Joelho Direito', view: 'back', x: 65, y: 75, w: 15, h: 10 },
  { id: 'joelho_esq_b', name: 'Joelho Esquerdo', view: 'back', x: 35, y: 75, w: 15, h: 10 },

  { id: 'pe_dir_f', name: 'Pé Direito', view: 'front', x: 32, y: 95, w: 16, h: 8 },
  { id: 'pe_esq_f', name: 'Pé Esquerdo', view: 'front', x: 68, y: 95, w: 16, h: 8 },
  { id: 'pe_dir_b', name: 'Pé Direito', view: 'back', x: 68, y: 95, w: 16, h: 8 },
  { id: 'pe_esq_b', name: 'Pé Esquerdo', view: 'back', x: 32, y: 95, w: 16, h: 8 },
]

export function BodyMap({ patientId }: { patientId: string }) {
  const [view, setView] = useState<MapView>('front')
  const [points, setPoints] = useState<any[]>([])
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<string[]>([])
  const [openComboboxId, setOpenComboboxId] = useState<string | null>(null)

  const loadPoints = async () => {
    try {
      const data = await pb
        .collection('pain_points')
        .getFullList({ filter: `patient_id="${patientId}"` })
      setPoints(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPoints()
    pb.collection('pathologies_catalog')
      .getFullList({ sort: 'name' })
      .then((res) => setCatalog(res.map((c) => c.name)))
      .catch(console.error)
  }, [patientId])

  useRealtime('pain_points', loadPoints)
  useRealtime('pathologies_catalog', () => {
    pb.collection('pathologies_catalog')
      .getFullList({ sort: 'name' })
      .then((res) => setCatalog(res.map((c) => c.name)))
  })

  const handleRegionClick = async (region: any, existingPoint: any) => {
    if (existingPoint) {
      if (
        existingPoint.notes ||
        (existingPoint.pathologies && existingPoint.pathologies.length > 0)
      ) {
        setHoveredPointId(existingPoint.id)
        toast.info('Ponto selecionado', {
          description: 'Este ponto possui dados. Edite ou remova pelo painel lateral.',
        })
      } else {
        handleDeletePoint(existingPoint.id)
      }
    } else {
      try {
        await pb.collection('pain_points').create({
          patient_id: patientId,
          x: region.x,
          y: region.y,
          view: region.view,
          name: region.name,
          pathologies: [],
          notes: '',
          intensity: 5,
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const updatePoint = (id: string, updates: any) => {
    setPoints(points.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const saveUpdatedPoint = async (id: string) => {
    const pt = points.find((p) => p.id === id)
    if (pt)
      try {
        await pb.collection('pain_points').update(id, { notes: pt.notes, intensity: pt.intensity })
      } catch (e) {
        console.error(e)
      }
  }

  const handleDeletePoint = async (id: string) => {
    try {
      await pb.collection('pain_points').delete(id)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddPathology = async (pointId: string, pathology: string) => {
    const pt = points.find((p) => p.id === pointId)
    if (!pt) return
    let currentList = Array.isArray(pt.pathologies) ? [...pt.pathologies] : []
    if (currentList.length === 0 && pt.name) currentList = [pt.name]
    if (!currentList.includes(pathology)) {
      currentList.push(pathology)
      updatePoint(pointId, { pathologies: currentList })
      try {
        await pb.collection('pain_points').update(pointId, { pathologies: currentList })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleRemovePathology = async (pointId: string, pathToRemove: string) => {
    const pt = points.find((p) => p.id === pointId)
    if (!pt) return
    let currentList = Array.isArray(pt.pathologies) ? [...pt.pathologies] : []
    if (currentList.length === 0 && pt.name) currentList = [pt.name]
    const updates: any = { pathologies: currentList.filter((p) => p !== pathToRemove) }
    if (pt.name === pathToRemove) updates.name = ''
    updatePoint(pointId, updates)
    try {
      await pb.collection('pain_points').update(pointId, updates)
    } catch (e) {
      console.error(e)
    }
  }

  const visiblePoints = points.filter(
    (p) => p.view === view || ANATOMY_REGIONS.some((r) => r.name === p.name && r.view === view),
  )
  const displayedPointsPanel = points.filter((p) => p.view === view) // For the right panel, we use the original view

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-[600px] border rounded-xl bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Carregando mapa anatômico...</p>
      </div>
    )

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-[600px]">
      <div className="relative border rounded-xl bg-slate-950 flex flex-col overflow-hidden shadow-inner">
        <div className="flex justify-center p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-30">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as MapView)}
            className="w-full max-w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-800 text-slate-400">
              <TabsTrigger
                value="front"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                Frente
              </TabsTrigger>
              <TabsTrigger
                value="back"
                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white"
              >
                Costas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
          <div className="relative w-full max-w-[220px] aspect-[1/2]">
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
            <img
              src={`https://img.usecurling.com/p/600/1200?q=medical%20x-ray%20anatomy%203d%20model%20${view}&color=cyan`}
              alt={`Body ${view}`}
              className="w-full h-full object-cover mix-blend-screen pointer-events-none opacity-80"
            />

            {ANATOMY_REGIONS.filter((h) => h.view === view).map((region) => {
              const pt = points.find((p) => p.name === region.name)
              const isActive = !!pt
              const isHovered = pt ? hoveredPointId === pt.id : false

              return (
                <div
                  key={region.id}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-[40%] cursor-pointer transition-all duration-500',
                    isActive
                      ? 'bg-red-500/40 shadow-[0_0_25px_10px_rgba(239,68,68,0.8)] z-20 border border-red-500/50 mix-blend-screen animate-pulse'
                      : 'hover:bg-cyan-400/20 hover:shadow-[0_0_15px_5px_rgba(34,211,238,0.3)] z-10 border border-transparent hover:border-cyan-400/30',
                    isHovered && isActive && 'ring-2 ring-white/50 scale-110',
                  )}
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    width: `${region.w}%`,
                    height: `${region.h}%`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRegionClick(region, pt)
                  }}
                  onMouseEnter={() => {
                    if (isActive && pt) setHoveredPointId(pt.id)
                  }}
                  onMouseLeave={() => {
                    if (isActive && pt) setHoveredPointId(null)
                  }}
                  title={region.name}
                />
              )
            })}

            {visiblePoints
              .filter((p) => !ANATOMY_REGIONS.some((r) => r.name === p.name))
              .map((p) => {
                const isHovered = hoveredPointId === p.id
                const intensityColor =
                  (p.intensity || 5) >= 8
                    ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                    : (p.intensity || 5) >= 5
                      ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]'
                      : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                return (
                  <div
                    key={p.id}
                    className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 group z-30"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePoint(p.id)
                    }}
                    onMouseEnter={() => setHoveredPointId(p.id)}
                    onMouseLeave={() => setHoveredPointId(null)}
                  >
                    <div
                      className={cn(
                        'absolute inset-1 rounded-full animate-pulse blur-[3px] opacity-80',
                        intensityColor.replace('bg-', 'bg-').replace('500', '600'),
                      )}
                    />
                    <div
                      className={cn(
                        'relative w-2.5 h-2.5 rounded-full transition-transform',
                        isHovered ? 'scale-150 ring-2 ring-white/50' : '',
                        intensityColor,
                      )}
                    />
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      <div className="flex flex-col border rounded-xl overflow-hidden bg-card">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Pontos Mapeados
          </h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md border">
            {displayedPointsPanel.length} {displayedPointsPanel.length === 1 ? 'ponto' : 'pontos'}
          </span>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {displayedPointsPanel.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>Nenhum ponto registrado para esta visão.</p>
                <p className="text-sm mt-1">
                  Interaja com a imagem ao lado para adicionar marcadores e iniciar a documentação.
                </p>
              </div>
            ) : (
              displayedPointsPanel.map((p, i) => (
                <Card
                  key={p.id}
                  className={cn(
                    'transition-all duration-200',
                    hoveredPointId === p.id
                      ? 'border-primary ring-1 ring-primary/20 bg-muted/10'
                      : 'shadow-none border-border',
                  )}
                  onMouseEnter={() => {
                    setHoveredPointId(p.id)
                  }}
                  onMouseLeave={() => setHoveredPointId(null)}
                >
                  <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors',
                          hoveredPointId === p.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        {i + 1}
                      </div>
                      <span className="capitalize text-muted-foreground text-xs font-normal">
                        ({p.name || (p.view === 'front' ? 'Frente' : 'Costas')})
                      </span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeletePoint(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-3 pt-2 space-y-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 min-h-[24px] items-center">
                        {(() => {
                          const paths = Array.isArray(p.pathologies) ? p.pathologies : []
                          const displayPaths = paths.length > 0 ? paths : p.name ? [p.name] : []
                          if (displayPaths.length === 0)
                            return (
                              <span className="text-xs text-muted-foreground italic">
                                Nenhuma patologia
                              </span>
                            )
                          return displayPaths.map((path, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1 text-xs"
                            >
                              {path}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemovePathology(p.id, path)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))
                        })()}
                      </div>
                      <Popover
                        open={openComboboxId === p.id}
                        onOpenChange={(open) => setOpenComboboxId(open ? p.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            role="combobox"
                            aria-expanded={openComboboxId === p.id}
                            className="h-8 text-xs justify-between w-full font-normal"
                          >
                            Adicionar do catálogo...
                            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Buscar patologia..."
                              className="h-8 text-xs"
                            />
                            <CommandList>
                              <CommandEmpty className="py-2 text-xs text-center text-muted-foreground">
                                Nenhuma patologia.
                              </CommandEmpty>
                              <CommandGroup>
                                {catalog.map((c) => {
                                  const isSelected =
                                    Array.isArray(p.pathologies) && p.pathologies.includes(c)
                                  return (
                                    <CommandItem
                                      key={c}
                                      value={c}
                                      onSelect={() => {
                                        if (!isSelected) handleAddPathology(p.id, c)
                                        setOpenComboboxId(null)
                                      }}
                                      className="text-xs"
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-3 w-3',
                                          isSelected ? 'opacity-100' : 'opacity-0',
                                        )}
                                      />
                                      {c}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Intensidade: {p.intensity || 5}
                        </span>
                      </div>
                      <Slider
                        value={[p.intensity || 5]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={([val]) => updatePoint(p.id, { intensity: val })}
                        onValueCommit={() => saveUpdatedPoint(p.id)}
                        className="py-2"
                      />
                    </div>
                    <Textarea
                      placeholder="Descrição e notas clínicas..."
                      value={p.notes || ''}
                      onChange={(e) => updatePoint(p.id, { notes: e.target.value })}
                      onBlur={() => saveUpdatedPoint(p.id)}
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
