import { useState, useRef, useEffect } from 'react'
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

const HOTSPOTS = [
  { id: 'cervical', name: 'Coluna Cervical', view: 'back', x: 50, y: 14 },
  { id: 'toracica', name: 'Coluna Torácica', view: 'back', x: 50, y: 25 },
  { id: 'lombar', name: 'Coluna Lombar', view: 'back', x: 50, y: 42 },
  { id: 'ombro_dir', name: 'Ombro Direito', view: 'front', x: 30, y: 17.5 },
  { id: 'ombro_esq', name: 'Ombro Esquerdo', view: 'front', x: 70, y: 17.5 },
  { id: 'ombro_dir_b', name: 'Ombro Direito', view: 'back', x: 70, y: 17.5 },
  { id: 'ombro_esq_b', name: 'Ombro Esquerdo', view: 'back', x: 30, y: 17.5 },
  { id: 'cotovelo_dir', name: 'Cotovelo Direito', view: 'front', x: 18, y: 37.5 },
  { id: 'cotovelo_esq', name: 'Cotovelo Esquerdo', view: 'front', x: 82, y: 37.5 },
  { id: 'cotovelo_dir_b', name: 'Cotovelo Direito', view: 'back', x: 82, y: 37.5 },
  { id: 'cotovelo_esq_b', name: 'Cotovelo Esquerdo', view: 'back', x: 18, y: 37.5 },
  { id: 'punho_dir', name: 'Punho Direito', view: 'front', x: 10, y: 52.5 },
  { id: 'punho_esq', name: 'Punho Esquerdo', view: 'front', x: 90, y: 52.5 },
  { id: 'punho_dir_b', name: 'Punho Direito', view: 'back', x: 90, y: 52.5 },
  { id: 'punho_esq_b', name: 'Punho Esquerdo', view: 'back', x: 10, y: 52.5 },
  { id: 'quadril_dir', name: 'Quadril Direito', view: 'front', x: 40, y: 50 },
  { id: 'quadril_esq', name: 'Quadril Esquerdo', view: 'front', x: 60, y: 50 },
  { id: 'quadril_dir_b', name: 'Quadril Direito', view: 'back', x: 60, y: 50 },
  { id: 'quadril_esq_b', name: 'Quadril Esquerdo', view: 'back', x: 40, y: 50 },
  { id: 'joelho_dir', name: 'Joelho Direito', view: 'front', x: 35, y: 72.5 },
  { id: 'joelho_esq', name: 'Joelho Esquerdo', view: 'front', x: 65, y: 72.5 },
  { id: 'joelho_dir_b', name: 'Joelho Direito', view: 'back', x: 65, y: 72.5 },
  { id: 'joelho_esq_b', name: 'Joelho Esquerdo', view: 'back', x: 35, y: 72.5 },
  { id: 'pe_dir', name: 'Pé Direito', view: 'front', x: 30, y: 95 },
  { id: 'pe_esq', name: 'Pé Esquerdo', view: 'front', x: 70, y: 95 },
  { id: 'pe_dir_b', name: 'Pé Direito', view: 'back', x: 70, y: 95 },
  { id: 'pe_esq_b', name: 'Pé Esquerdo', view: 'back', x: 30, y: 95 },
]

export function BodyMap({ patientId }: { patientId: string }) {
  const [view, setView] = useState<MapView>('front')
  const [points, setPoints] = useState<any[]>([])
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [catalog, setCatalog] = useState<string[]>([])
  const [openComboboxId, setOpenComboboxId] = useState<string | null>(null)

  const mapRef = useRef<HTMLDivElement>(null)

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

  const handleHotspotClick = async (hotspot: (typeof HOTSPOTS)[0]) => {
    const existingPoint = points.find((p) => p.name === hotspot.name && p.view === hotspot.view)
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
        try {
          await pb.collection('pain_points').delete(existingPoint.id)
        } catch (e) {
          console.error(e)
        }
      }
    } else {
      try {
        await pb.collection('pain_points').create({
          patient_id: patientId,
          x: hotspot.x,
          y: hotspot.y,
          view: hotspot.view,
          name: hotspot.name,
          pathologies: [],
          notes: '',
          intensity: 5,
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current || (e.target as HTMLElement).closest('.hotspot-marker')) return
    const rect = mapRef.current.getBoundingClientRect()
    try {
      await pb.collection('pain_points').create({
        patient_id: patientId,
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
        view,
        name: '',
        pathologies: [],
        notes: '',
        intensity: 5,
      })
    } catch (e) {
      console.error(e)
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

  const visiblePoints = points.filter((p) => p.view === view)

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
        <div className="flex justify-center p-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10">
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

        <div className="flex-1 relative flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 overflow-hidden">
          <div
            ref={mapRef}
            className="relative w-full max-w-[220px] aspect-[1/2] cursor-crosshair"
            onClick={handleMapClick}
          >
            <svg
              viewBox="0 0 100 200"
              className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.4" />
                </linearGradient>
                <filter id="glowEffect">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M 50 5 C 40 5 40 20 45 25 C 45 28 40 32 30 35 C 25 38 20 55 15 75 C 12 90 10 105 8 110 L 12 112 C 15 100 18 80 22 75 C 25 60 30 45 35 45 C 35 60 38 80 40 100 L 35 145 C 30 160 28 180 25 195 L 35 195 C 38 180 40 160 45 145 C 48 120 50 110 50 105 C 50 110 52 120 55 145 C 60 160 62 180 65 195 L 75 195 C 72 180 70 160 65 145 L 60 100 C 62 80 65 60 65 45 C 70 45 75 60 78 75 C 82 80 85 100 88 112 L 92 110 C 90 105 88 90 85 75 C 80 55 75 38 70 35 C 60 32 55 28 55 25 C 60 20 60 5 50 5 Z"
                fill="url(#bodyGrad)"
                stroke="#3b82f6"
                strokeWidth="0.5"
                filter="url(#glowEffect)"
              />
              {view === 'back' && (
                <path
                  d="M 50 15 L 50 90"
                  stroke="#60a5fa"
                  strokeWidth="0.5"
                  strokeDasharray="1 2"
                  opacity="0.6"
                  filter="url(#glowEffect)"
                />
              )}
            </svg>

            {HOTSPOTS.filter((h) => h.view === view).map((hotspot) => {
              const point = points.find((p) => p.name === hotspot.name && p.view === view)
              const isActive = !!point
              const isHovered = point ? hoveredPointId === point.id : false
              const colorClass =
                point?.intensity >= 8
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                  : point?.intensity >= 5
                    ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]'
                    : 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
              return (
                <div
                  key={hotspot.id}
                  className={cn(
                    'hotspot-marker absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 group',
                    isActive ? 'z-30' : 'z-20 hover:bg-blue-400/20',
                  )}
                  style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleHotspotClick(hotspot)
                  }}
                  onMouseEnter={() => {
                    if (isActive && point) setHoveredPointId(point.id)
                  }}
                  onMouseLeave={() => {
                    if (isActive && point) setHoveredPointId(null)
                  }}
                  title={hotspot.name}
                >
                  {isActive ? (
                    <>
                      <div
                        className={cn(
                          'absolute inset-0 rounded-full animate-pulse blur-[4px]',
                          colorClass.replace('bg-', 'bg-').replace('500', '600'),
                        )}
                      />
                      <div
                        className={cn(
                          'relative w-3.5 h-3.5 rounded-full transition-transform',
                          isHovered ? 'scale-125' : '',
                          colorClass,
                        )}
                      />
                    </>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-300/40 shadow-[0_0_5px_rgba(147,197,253,0.5)] group-hover:bg-blue-300 transition-colors" />
                  )}
                </div>
              )
            })}

            {visiblePoints
              .filter((p) => !HOTSPOTS.some((h) => h.name === p.name && h.view === p.view))
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
                    className="hotspot-marker absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer flex items-center justify-center transition-all duration-300 group z-20"
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
                        'absolute inset-1.5 rounded-full animate-pulse blur-[3px] opacity-70',
                        intensityColor.replace('bg-', 'bg-').replace('500', '600'),
                      )}
                    />
                    <div
                      className={cn(
                        'relative w-3 h-3 rounded-full transition-transform',
                        isHovered ? 'scale-125' : '',
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
            {points.length} {points.length === 1 ? 'ponto' : 'pontos'}
          </span>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {points.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>Nenhum ponto registrado.</p>
                <p className="text-sm mt-1">
                  Interaja com a imagem ao lado para adicionar marcadores e iniciar a documentação.
                </p>
              </div>
            ) : (
              points.map((p, i) => (
                <Card
                  key={p.id}
                  className={cn(
                    'transition-all duration-200',
                    hoveredPointId === p.id
                      ? 'border-primary ring-1 ring-primary/20 bg-muted/10'
                      : 'shadow-none border-border',
                  )}
                  onMouseEnter={() => {
                    if (view !== p.view) setView(p.view)
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
                        ({p.view === 'front' ? 'Frente' : 'Costas'})
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
