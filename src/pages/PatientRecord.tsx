import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPin, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProcedureModal } from '@/components/medical/procedure-modal'
import { toast } from 'sonner'

export default function PatientRecord() {
  const { id } = useParams()
  const [data, setData] = useState<any>({ patient: null, points: [], notes: [], catalog: [] })
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<'front' | 'back'>('front')
  const [form, setForm] = useState<any>({
    x: 0,
    y: 0,
    view: 'front',
    name: '',
    notes: '',
    intensity: 5,
    pathologies: [],
  })
  const [newPath, setNewPath] = useState('')

  const load = async () => {
    if (!id) return
    try {
      const [patient, points, notes, catalog] = await Promise.all([
        pb.collection('patients').getOne(id!),
        pb
          .collection('pain_points')
          .getFullList({ filter: `patient_id="${id}"`, sort: '-created' }),
        pb
          .collection('medical_notes')
          .getFullList({ filter: `patient_id="${id}"`, sort: '-created' }),
        pb.collection('pathologies_catalog').getFullList({ sort: 'name' }),
      ])
      setData({ patient, points, notes, catalog: catalog.map((c) => c.name) })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])
  useRealtime('pain_points', load)
  useRealtime('medical_notes', load)
  useRealtime('pathologies_catalog', load)

  const save = async () => {
    try {
      const payload = { ...form, patient_id: id }
      form.id
        ? await pb.collection('pain_points').update(form.id, payload)
        : await pb.collection('pain_points').create(payload)
      setIsOpen(false)
      toast.success('Salvo com sucesso!')
    } catch (e) {
      toast.error('Erro ao salvar')
    }
  }

  const remove = async (pid: string) => {
    await pb.collection('pain_points').delete(pid)
    toast.success('Removido.')
  }

  const addPath = () => {
    if (newPath.trim() && !form.pathologies.includes(newPath.trim())) {
      setForm({ ...form, pathologies: [...form.pathologies, newPath.trim()] })
      setNewPath('')
    }
  }

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    )
  if (!data.patient) return <div>Não encontrado.</div>

  const visiblePoints = data.points.filter((p: any) => p.view === view)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/pacientes">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{data.patient.name}</h1>
          <p className="text-muted-foreground">{data.patient.document}</p>
        </div>
      </div>
      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Mapa de Dor</TabsTrigger>
          <TabsTrigger value="notes">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row justify-between pb-2">
              <CardTitle>Mapeamento Corporal</CardTitle>
              <div className="flex bg-muted p-1 rounded-md">
                <Button
                  variant={view === 'front' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('front')}
                >
                  Frente
                </Button>
                <Button
                  variant={view === 'back' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('back')}
                >
                  Costas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="relative aspect-[1/2] max-w-sm mx-auto bg-slate-50 border rounded-lg overflow-hidden cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setForm({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                    view,
                    name: '',
                    notes: '',
                    intensity: 5,
                    pathologies: [],
                  })
                  setIsOpen(true)
                }}
              >
                <img
                  src={`https://img.usecurling.com/p/400/800?q=human%20anatomy%20${view}&color=gray`}
                  alt="Body"
                  className="w-full h-full object-cover opacity-50 pointer-events-none"
                />
                {visiblePoints.map((pt: any) => (
                  <div
                    key={pt.id}
                    className="absolute w-4 h-4 bg-red-500 rounded-full -ml-2 -mt-2 border-2 border-white cursor-pointer hover:scale-125"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setForm({ ...pt, pathologies: pt.pathologies || [] })
                      setIsOpen(true)
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pontos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {data.points.map((pt: any) => (
                    <div key={pt.id} className="p-3 border rounded-lg text-sm relative group">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={() => remove(pt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="font-bold flex gap-2 items-center">
                        <MapPin className="h-4 w-4 text-red-500" /> {pt.name || 'Ponto'}{' '}
                        <Badge>{pt.intensity || 5}</Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 mt-1">{pt.notes}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pt.pathologies?.map((p: string) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>Registros</CardTitle>
              <ProcedureModal patientId={id!} onAdd={load} />
            </CardHeader>
            <CardContent className="space-y-4">
              {data.notes.map((n: any) => (
                <div key={n.id} className="p-4 border rounded-lg">
                  <div className="font-semibold">
                    {n.status === 'completed' ? 'Procedimento' : 'Nota'} •{' '}
                    {new Date(n.created).toLocaleDateString()}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar Ponto' : 'Novo Ponto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Nome/Região</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label>Intensidade ({form.intensity})</Label>
              </div>
              <Slider
                value={[form.intensity]}
                onValueChange={(v) => setForm({ ...form, intensity: v[0] })}
                max={10}
                min={1}
                step={1}
                className="py-2"
              />
            </div>
            <div>
              <Label>Patologias</Label>
              <div className="flex gap-2 mb-2 mt-1">
                <Select
                  onValueChange={(v) => {
                    if (!form.pathologies.includes(v))
                      setForm({ ...form, pathologies: [...form.pathologies, v] })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {data.catalog.map((c: string) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova patologia"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPath()}
                />
                <Button onClick={addPath} type="button">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.pathologies.map((p: string) => (
                  <Badge
                    key={p}
                    className="cursor-pointer"
                    onClick={() =>
                      setForm({
                        ...form,
                        pathologies: form.pathologies.filter((x: string) => x !== p),
                      })
                    }
                  >
                    {p} &times;
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
