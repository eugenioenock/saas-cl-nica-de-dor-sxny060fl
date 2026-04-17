import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Trash2, MapPin, MousePointerClick, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

type MapView = 'front' | 'back'

export function BodyMap({ patientId, gender }: { patientId: string; gender?: string }) {
  const [view, setView] = useState<MapView>('front')
  const [points, setPoints] = useState<any[]>([])
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
  }, [patientId])

  useRealtime('pain_points', () => {
    loadPoints()
  })

  const genderStr = gender?.toLowerCase() || ''
  const isFemale = genderStr === 'female' || genderStr === 'feminino'
  const isMale = genderStr === 'male' || genderStr === 'masculino'

  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    // Prevent adding point if clicking on an existing marker
    if ((e.target as HTMLElement).closest('.map-marker')) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const newPoint = {
      patient_id: patientId,
      x,
      y,
      view,
      name: '',
      notes: '',
      intensity: 5,
    }

    try {
      await pb.collection('pain_points').create(newPoint)
    } catch (e) {
      console.error(e)
    }
  }

  const updatePoint = (id: string, updates: any) => {
    setPoints(points.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const saveUpdatedPoint = async (id: string) => {
    const pt = points.find((p) => p.id === id)
    if (pt) {
      try {
        await pb.collection('pain_points').update(id, {
          name: pt.name,
          notes: pt.notes,
          intensity: pt.intensity,
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleDeletePoint = async (id: string) => {
    try {
      await pb.collection('pain_points').delete(id)
    } catch (e) {
      console.error(e)
    }
  }

  const visiblePoints = points.filter((p) => p.view === view)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] border rounded-xl bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Carregando mapa anatômico...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-6 h-[600px]">
        <div className="relative border rounded-xl bg-muted/10 flex flex-col overflow-hidden">
          <div className="flex justify-center p-3 border-b bg-background/50 backdrop-blur-sm z-10">
            <Tabs
              value={view}
              onValueChange={(v) => setView(v as MapView)}
              className="w-full max-w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="front">Frente</TabsTrigger>
                <TabsTrigger value="back">Costas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div
            ref={mapRef}
            className="flex-1 relative cursor-crosshair flex items-center justify-center p-4"
            onClick={handleMapClick}
          >
            <svg
              viewBox="0 0 200 500"
              className="w-full h-full max-h-[500px] drop-shadow-sm opacity-80 pointer-events-none text-slate-300 dark:text-slate-700"
            >
              {isFemale ? (
                <g fill="currentColor">
                  <ellipse cx="100" cy="40" rx="23" ry="30" />
                  <rect x="88" y="65" width="24" height="20" rx="5" />
                  <path d="M60,80 Q100,70 140,80 Q120,150 145,220 Q100,230 55,220 Q80,150 60,80 Z" />
                  <path d="M60,85 Q25,100 30,210 Q45,215 50,110 Z" />
                  <path d="M140,85 Q175,100 170,210 Q155,215 150,110 Z" />
                  <path d="M55,215 L50,450 Q70,460 85,450 L95,230 Z" />
                  <path d="M145,215 L150,450 Q130,460 115,450 L105,230 Z" />
                  {view === 'front' ? (
                    <>
                      <path
                        d="M70,120 Q85,140 100,120 M100,120 Q115,140 130,120"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M100,135 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M100,80 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M70,100 Q85,120 100,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M130,100 Q115,120 100,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  )}
                </g>
              ) : isMale ? (
                <g fill="currentColor">
                  <ellipse cx="100" cy="40" rx="25" ry="32" />
                  <rect x="85" y="65" width="30" height="20" rx="5" />
                  <path d="M50,80 Q100,70 150,80 L130,220 Q100,230 70,220 Z" />
                  <path d="M50,85 Q15,100 20,210 Q35,215 45,100 Z" />
                  <path d="M150,85 Q185,100 180,210 Q165,215 155,100 Z" />
                  <path d="M70,215 L50,450 Q70,460 85,450 L95,230 Z" />
                  <path d="M130,215 L150,450 Q130,460 115,450 L105,230 Z" />
                  {view === 'front' ? (
                    <>
                      <path
                        d="M65,125 Q100,140 135,125"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M100,135 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M100,80 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M70,100 Q85,120 100,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M130,100 Q115,120 100,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  )}
                </g>
              ) : (
                <g fill="currentColor">
                  <ellipse cx="100" cy="40" rx="25" ry="32" />
                  <rect x="85" y="65" width="30" height="20" rx="5" />
                  <path d="M55,80 Q100,70 145,80 L135,220 Q100,230 65,220 Z" />
                  <path d="M55,85 Q20,100 25,210 Q40,215 45,100 Z" />
                  <path d="M145,85 Q180,100 175,210 Q160,215 155,100 Z" />
                  <path d="M65,215 L50,450 Q70,460 85,450 L95,230 Z" />
                  <path d="M135,215 L150,450 Q130,460 115,450 L105,230 Z" />
                  {view === 'front' ? (
                    <>
                      <path
                        d="M70,130 Q100,145 130,130"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M100,140 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  ) : (
                    <>
                      <path
                        d="M100,80 L100,210"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M75,100 Q85,120 95,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                      <path
                        d="M125,100 Q115,120 105,110"
                        stroke="var(--background)"
                        strokeWidth="2"
                        fill="none"
                        className="opacity-50"
                      />
                    </>
                  )}
                </g>
              )}
            </svg>

            {visiblePoints.map((p) => {
              const globalIndex = points.findIndex((pt) => pt.id === p.id)
              const intensityColor =
                (p.intensity || 5) >= 8
                  ? 'bg-red-500 border-red-600 text-white'
                  : (p.intensity || 5) >= 5
                    ? 'bg-orange-500 border-orange-600 text-white'
                    : 'bg-green-500 border-green-600 text-white'
              return (
                <div
                  key={p.id}
                  className={cn(
                    'map-marker absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer group z-10 border-2',
                    hoveredPointId === p.id ? 'scale-110 z-20 ring-4 ring-primary/30' : '',
                    intensityColor,
                    'hover:!bg-destructive hover:!text-destructive-foreground hover:!border-destructive hover:!scale-125 hover:!z-30',
                  )}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  onMouseEnter={() => setHoveredPointId(p.id)}
                  onMouseLeave={() => setHoveredPointId(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeletePoint(p.id)
                  }}
                  title="Clique para remover este ponto"
                >
                  <span className="text-[11px] font-bold group-hover:hidden">
                    {globalIndex + 1}
                  </span>
                  <Trash2 className="h-3.5 w-3.5 hidden group-hover:block" />
                </div>
              )
            })}

            {visiblePoints.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
                <MousePointerClick className="h-10 w-10 mb-2" />
                <span className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-foreground border shadow-sm font-medium">
                  Clique no corpo para adicionar pontos de dor
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col border rounded-xl overflow-hidden bg-card">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Pontos Mapeados
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
                    Interaja com a imagem ao lado para adicionar marcadores e iniciar a
                    documentação.
                  </p>
                </div>
              ) : (
                points.map((p, i) => (
                  <Card
                    key={p.id}
                    className={cn(
                      'transition-all duration-200',
                      hoveredPointId === p.id
                        ? 'border-primary shadow-sm ring-1 ring-primary/20 bg-muted/10'
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
                        title="Remover ponto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 pt-2 space-y-3">
                      <div className="space-y-1">
                        <Input
                          placeholder="Nome da Localização (ex: Ombro Direito)"
                          value={p.name}
                          onChange={(e) => updatePoint(p.id, { name: e.target.value })}
                          onBlur={() => saveUpdatedPoint(p.id)}
                          className="h-8 text-sm"
                        />
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
                      <div className="space-y-1">
                        <Textarea
                          placeholder="Descrição e notas clínicas..."
                          value={p.notes}
                          onChange={(e) => updatePoint(p.id, { notes: e.target.value })}
                          onBlur={() => saveUpdatedPoint(p.id)}
                          className="min-h-[60px] text-sm resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
