import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Trash2,
  Printer,
  Activity,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export default function PatientRecord() {
  const { id } = useParams()
  const [data, setData] = useState<any>({ patient: null, points: [], notes: [], catalog: [] })
  const [clinicSettings, setClinicSettings] = useState<any>(null)
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
  const [openPath, setOpenPath] = useState(false)

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 8) return 'bg-red-500 hover:bg-red-600 text-white'
    if (intensity >= 5) return 'bg-orange-500 hover:bg-orange-600 text-white'
    return 'bg-green-500 hover:bg-green-600 text-white'
  }

  const load = async () => {
    if (!id) return
    try {
      const [patient, points, notes, catalog, settingsRes] = await Promise.all([
        pb.collection('patients').getOne(id!),
        pb
          .collection('pain_points')
          .getFullList({ filter: `patient_id="${id}"`, sort: '-created' }),
        pb
          .collection('medical_notes')
          .getFullList({ filter: `patient_id="${id}"`, sort: '-created' }),
        pb.collection('pathologies_catalog').getFullList({ sort: 'name' }),
        pb
          .collection('clinic_settings')
          .getList(1, 1)
          .catch(() => null),
      ])
      setData({ patient, points, notes, catalog: catalog.map((c) => c.name) })
      if (settingsRes && settingsRes.items.length > 0) {
        setClinicSettings(settingsRes.items[0])
      }
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
      if (form.id) {
        await pb.collection('pain_points').update(form.id, payload)
      } else {
        await pb.collection('pain_points').create(payload)
      }
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

  const chartData = [...data.points]
    .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
    .map((p) => ({
      date: new Date(p.created).toLocaleDateString(),
      intensity: p.intensity,
      name: p.name || 'Ponto',
    }))

  const chartConfig = {
    intensity: {
      label: 'Intensidade',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
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
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Exportar Resumo Clínico
          </Button>
        </div>
        <Tabs defaultValue="map">
          <TabsList className="w-full sm:w-auto overflow-x-auto justify-start">
            <TabsTrigger value="map">Mapa de Dor</TabsTrigger>
            <TabsTrigger value="notes">Histórico Clínico</TabsTrigger>
            <TabsTrigger value="evolution">Evolução</TabsTrigger>
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
                <CardTitle>Pontos Ativos</CardTitle>
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
                          <Badge className={getIntensityColor(pt.intensity || 5)}>
                            Nível {pt.intensity || 5}
                          </Badge>
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
                    {data.points.length === 0 && (
                      <div className="text-center text-muted-foreground mt-10">
                        Nenhum ponto registrado.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Registros Clínicos</CardTitle>
                <ProcedureModal patientId={id!} onAdd={load} />
              </CardHeader>
              <CardContent className="space-y-4">
                {data.notes.map((n: any) => (
                  <div key={n.id} className="p-4 border rounded-lg">
                    <div className="font-semibold text-primary">
                      {n.status === 'completed' ? 'Procedimento' : 'Nota Clínica'} •{' '}
                      {new Date(n.created).toLocaleDateString()}
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-foreground/90">
                      {n.content}
                    </p>
                  </div>
                ))}
                {data.notes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum registro clínico encontrado.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evolution" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Dor</CardTitle>
                <CardDescription>
                  Histórico de intensidade reportada ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={10} domain={[0, 10]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="intensity"
                        stroke="var(--color-intensity)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--color-intensity)' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-20" />
                    <p>Nenhum dado de dor registrado para gerar o gráfico.</p>
                  </div>
                )}
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
                <div className="mt-1">
                  <Popover open={openPath} onOpenChange={setOpenPath}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openPath}
                        className="w-full justify-between font-normal"
                      >
                        {form.pathologies.length > 0
                          ? `${form.pathologies.length} patologia(s) selecionada(s)`
                          : 'Selecione do catálogo...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar patologia..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma patologia encontrada.</CommandEmpty>
                          <CommandGroup>
                            {data.catalog.map((c: string) => (
                              <CommandItem
                                key={c}
                                value={c}
                                onSelect={() => {
                                  if (!form.pathologies.includes(c)) {
                                    setForm({ ...form, pathologies: [...form.pathologies, c] })
                                  } else {
                                    setForm({
                                      ...form,
                                      pathologies: form.pathologies.filter((x: string) => x !== c),
                                    })
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    form.pathologies.includes(c) ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {c}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {form.pathologies.map((p: string) => (
                    <Badge
                      key={p}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
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

      {/* Print Only Section */}
      <div className="hidden print:block w-full bg-white text-black text-sm">
        <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {clinicSettings?.logo ? (
              <img
                src={pb.files.getURL(clinicSettings, clinicSettings.logo)}
                alt="Clinic Logo"
                className="h-16 w-16 object-contain"
              />
            ) : (
              <Activity className="h-12 w-12 text-black" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {clinicSettings?.name || 'SpineCare Solutions'}
              </h1>
              {(clinicSettings?.address || clinicSettings?.phone || clinicSettings?.email) && (
                <div className="text-sm text-gray-600 mt-1">
                  {clinicSettings.address && <div>{clinicSettings.address}</div>}
                  <div className="flex gap-4">
                    {clinicSettings.phone && <span>📞 {clinicSettings.phone}</span>}
                    {clinicSettings.email && <span>✉️ {clinicSettings.email}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right text-gray-600 flex flex-col justify-end">
            <span className="font-semibold text-black uppercase mb-1">Resumo Clínico</span>
            <span>Gerado em: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 uppercase bg-gray-100 p-2 rounded">
            Identificação do Paciente
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 p-2">
            <div>
              <strong>Nome:</strong> {data.patient.name}
            </div>
            <div>
              <strong>Documento:</strong> {data.patient.document || '-'}
            </div>
            <div>
              <strong>Data de Nasc.:</strong>{' '}
              {data.patient.dob ? new Date(data.patient.dob).toLocaleDateString() : '-'}
            </div>
            <div>
              <strong>Gênero:</strong> {data.patient.gender || '-'}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 uppercase bg-gray-100 p-2 rounded">
            Mapeamento de Dor (Ativos)
          </h2>
          <table className="w-full border-collapse mt-2">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left p-2 font-bold w-1/4">Região</th>
                <th className="text-left p-2 font-bold w-16">Nível</th>
                <th className="text-left p-2 font-bold w-1/3">Patologias</th>
                <th className="text-left p-2 font-bold">Notas</th>
              </tr>
            </thead>
            <tbody>
              {data.points.map((pt: any) => (
                <tr key={pt.id} className="border-b border-gray-200">
                  <td className="p-2 font-medium">{pt.name || pt.view}</td>
                  <td className="p-2 text-center">{pt.intensity}/10</td>
                  <td className="p-2">{pt.pathologies?.join(', ') || '-'}</td>
                  <td className="p-2 italic text-gray-700">{pt.notes || '-'}</td>
                </tr>
              ))}
              {data.points.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    Nenhum ponto de dor registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2 uppercase bg-gray-100 p-2 rounded">
            Evolução Clínica e Notas
          </h2>
          <div className="space-y-4 mt-2 p-2">
            {data.notes.map((n: any) => (
              <div key={n.id} className="pb-3 border-b border-dashed border-gray-300 last:border-0">
                <div className="font-bold">
                  {new Date(n.created).toLocaleDateString()} -{' '}
                  {n.status === 'completed' ? 'Procedimento' : 'Nota Clínica'}
                </div>
                <p className="mt-1 text-gray-800 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
            {data.notes.length === 0 && (
              <div className="text-gray-500 text-center py-4">
                Nenhum registro clínico encontrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
