import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

const ANATOMY_REGIONS = [
  { id: 'cervical', name: 'Coluna Cervical', view: 'front', x: 50, y: 15, w: 12, h: 8 },
  { id: 'toracica', name: 'Coluna Torácica', view: 'front', x: 50, y: 30, w: 14, h: 12 },
  { id: 'lombar', name: 'Coluna Lombar', view: 'front', x: 50, y: 48, w: 16, h: 10 },
  { id: 'ombro_dir', name: 'Ombro Direito', view: 'front', x: 30, y: 22, w: 14, h: 10 },
  { id: 'ombro_esq', name: 'Ombro Esquerdo', view: 'front', x: 70, y: 22, w: 14, h: 10 },
  { id: 'cotovelo_dir', name: 'Cotovelo Direito', view: 'front', x: 20, y: 40, w: 10, h: 8 },
  { id: 'cotovelo_esq', name: 'Cotovelo Esquerdo', view: 'front', x: 80, y: 40, w: 10, h: 8 },
  { id: 'punho_dir', name: 'Punho Direito', view: 'front', x: 12, y: 55, w: 8, h: 8 },
  { id: 'punho_esq', name: 'Punho Esquerdo', view: 'front', x: 88, y: 55, w: 8, h: 8 },
  { id: 'quadril_dir', name: 'Quadril Direito', view: 'front', x: 40, y: 55, w: 14, h: 12 },
  { id: 'quadril_esq', name: 'Quadril Esquerdo', view: 'front', x: 60, y: 55, w: 14, h: 12 },
  { id: 'joelho_dir', name: 'Joelho Direito', view: 'front', x: 35, y: 75, w: 12, h: 10 },
  { id: 'joelho_esq', name: 'Joelho Esquerdo', view: 'front', x: 65, y: 75, w: 12, h: 10 },
  { id: 'pe_dir', name: 'Pé Direito', view: 'front', x: 32, y: 95, w: 14, h: 8 },
  { id: 'pe_esq', name: 'Pé Esquerdo', view: 'front', x: 68, y: 95, w: 14, h: 8 },
]

export function BodyMap({ patientId }: { patientId: string }) {
  const view = 'front'
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

  const displayedPointsPanel = points

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
        <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-slate-950">
          <div className="relative w-full max-w-[260px] aspect-[1/2] rounded-lg overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
            <img
              src="https://img.usecurling.com/p/600/1200?q=skeleton%20x-ray%20anatomy%20medical&color=cyan"
              alt="Skeleton X-Ray"
              className="w-full h-full object-cover pointer-events-none opacity-80 mix-blend-screen"
              style={{ filter: 'hue-rotate(30deg) brightness(1.2)' }}
            />

            {ANATOMY_REGIONS.map((region) => {
              const pt = points.find((p) => p.name === region.name)
              const isActive = !!pt
              const isHovered = pt ? hoveredPointId === pt.id : false

              return (
                <div
                  key={region.id}
                  className={cn(
                    'absolute -translate-x-1/2 -translate-y-1/2 rounded-[40%] cursor-pointer transition-all duration-500',
                    isActive
                      ? 'bg-red-600/50 shadow-[0_0_30px_15px_rgba(220,38,38,0.7)] z-20 border border-red-500/30 mix-blend-screen animate-pulse backdrop-blur-[1px]'
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
              <div className="text-center text-muted-foreground py-16 flex flex-col items-center">
                <div className="bg-muted/30 p-4 rounded-full mb-4">
                  <MapPin className="h-8 w-8 text-primary/40" strokeWidth={1.5} />
                </div>
                <p className="text-base font-semibold text-foreground">Nenhum ponto registrado.</p>
                <p className="text-sm opacity-80 mt-2 max-w-[280px]">
                  Clique na imagem anatômica para adicionar um novo ponto de dor e iniciar o
                  mapeamento.
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
