import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, MapPin, MousePointerClick } from 'lucide-react'

type MapView = 'front' | 'back'

type Point = {
  id: string
  x: number
  y: number
  view: MapView
  name: string
  notes: string
}

export function BodyMap({ patientId }: { patientId: string }) {
  const [view, setView] = useState<MapView>('front')
  const [points, setPoints] = useState<Point[]>([])
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null)

  const mapRef = useRef<HTMLDivElement>(null)

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapRef.current) return
    // Prevent adding point if clicking on an existing marker
    if ((e.target as HTMLElement).closest('.map-marker')) return

    const rect = mapRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const newPoint: Point = {
      id: Math.random().toString(36).substring(7),
      x,
      y,
      view,
      name: '',
      notes: '',
    }

    setPoints([...points, newPoint])
  }

  const updatePoint = (id: string, updates: Partial<Point>) => {
    setPoints(points.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const deletePoint = (id: string) => {
    setPoints(points.filter((p) => p.id !== id))
  }

  const visiblePoints = points.filter((p) => p.view === view)

  return (
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
          {/* Simple Body SVG Silhouette */}
          <svg
            viewBox="0 0 200 500"
            className="w-full h-full max-h-[500px] drop-shadow-sm opacity-80 pointer-events-none text-slate-300 dark:text-slate-700"
          >
            {view === 'front' ? (
              <g fill="currentColor">
                {/* Head */}
                <ellipse cx="100" cy="40" rx="25" ry="32" />
                <rect x="85" y="65" width="30" height="20" rx="5" />
                {/* Torso */}
                <path d="M55,80 Q100,70 145,80 L135,220 Q100,230 65,220 Z" />
                {/* Arms */}
                <path d="M55,85 Q20,100 25,210 Q40,215 45,100 Z" />
                <path d="M145,85 Q180,100 175,210 Q160,215 155,100 Z" />
                {/* Legs */}
                <path d="M65,215 L50,450 Q70,460 85,450 L95,230 Z" />
                <path d="M135,215 L150,450 Q130,460 115,450 L105,230 Z" />
                {/* Details (Front) */}
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
              </g>
            ) : (
              <g fill="currentColor">
                {/* Head */}
                <ellipse cx="100" cy="40" rx="25" ry="32" />
                <rect x="85" y="65" width="30" height="20" rx="5" />
                {/* Torso */}
                <path d="M55,80 Q100,70 145,80 L135,220 Q100,230 65,220 Z" />
                {/* Arms */}
                <path d="M55,85 Q20,100 25,210 Q40,215 45,100 Z" />
                <path d="M145,85 Q180,100 175,210 Q160,215 155,100 Z" />
                {/* Legs */}
                <path d="M65,215 L50,450 Q70,460 85,450 L95,230 Z" />
                <path d="M135,215 L150,450 Q130,460 115,450 L105,230 Z" />
                {/* Details (Back) */}
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
              </g>
            )}
          </svg>

          {visiblePoints.map((p) => {
            const globalIndex = points.findIndex((pt) => pt.id === p.id)
            return (
              <div
                key={p.id}
                className={cn(
                  'map-marker absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer',
                  hoveredPointId === p.id
                    ? 'bg-primary text-primary-foreground scale-110 z-20'
                    : 'bg-background border-2 border-primary text-primary z-10',
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseEnter={() => setHoveredPointId(p.id)}
                onMouseLeave={() => setHoveredPointId(null)}
              >
                <span className="text-[11px] font-bold">{globalIndex + 1}</span>
              </div>
            )
          })}

          {visiblePoints.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
              <MousePointerClick className="h-10 w-10 mb-2" />
              <span className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-foreground border shadow-sm font-medium">
                Clique no corpo para adicionar um ponto
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
                <p className="text-sm mt-1">Interaja com a imagem ao lado para começar.</p>
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
                      onClick={() => deletePoint(p.id)}
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
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Textarea
                        placeholder="Descrição, intensidade da dor, notas clínicas..."
                        value={p.notes}
                        onChange={(e) => updatePoint(p.id, { notes: e.target.value })}
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
  )
}
