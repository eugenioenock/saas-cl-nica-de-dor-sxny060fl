import { useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { mockUsers } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Loader2, Plus, ShieldAlert, Database, BarChart3 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProfessionalGoalDialog } from '@/components/settings/ProfessionalGoalDialog'

export default function Settings() {
  const { activeClinic } = useAppContext()
  const { user } = useAuth()
  const users = mockUsers.filter((u) => u.clinicId === activeClinic?.id)

  const [pathologies, setPathologies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPathology, setNewPathology] = useState('')

  const [dbUsers, setDbUsers] = useState<any[]>([])
  const [settingsId, setSettingsId] = useState('')
  const [clinicSettings, setClinicSettings] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    opening_time: '',
    closing_time: '',
    region: '',
    state: '',
    bonus_config: {
      revenue_percentage: 0,
      performance_thresholds: [] as { min_score: number; multiplier: number }[],
    },
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const loadPathologies = async () => {
    try {
      const data = await pb.collection('pathologies_catalog').getFullList({ sort: 'name' })
      setPathologies(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    if (!activeClinic?.id) return
    try {
      const records = await pb
        .collection('users')
        .getFullList({ filter: `clinic_id = "${activeClinic.id}"` })
      setDbUsers(records)
    } catch (e) {}
  }

  const loadClinicSettings = async () => {
    try {
      const records = await pb.collection('clinic_settings').getList(1, 1)
      if (records.items.length > 0) {
        const record = records.items[0]
        setSettingsId(record.id)
        setClinicSettings({
          name: record.name || '',
          phone: record.phone || '',
          email: record.email || '',
          address: record.address || '',
          opening_time: record.opening_time || '08:00',
          closing_time: record.closing_time || '18:00',
          region: record.region || '',
          state: record.state || '',
          bonus_config: record.bonus_config || {
            revenue_percentage: 0,
            performance_thresholds: [],
          },
        })
        if (record.logo) {
          setLogoUrl(pb.files.getURL(record, record.logo))
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadPathologies()
    loadClinicSettings()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [activeClinic?.id])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const formData = new FormData()
      formData.append('name', clinicSettings.name)
      formData.append('phone', clinicSettings.phone)
      formData.append('email', clinicSettings.email)
      formData.append('address', clinicSettings.address)
      formData.append('opening_time', clinicSettings.opening_time)
      formData.append('closing_time', clinicSettings.closing_time)
      formData.append('region', clinicSettings.region)
      formData.append('state', clinicSettings.state)
      formData.append('bonus_config', JSON.stringify(clinicSettings.bonus_config))
      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (settingsId) {
        await pb.collection('clinic_settings').update(settingsId, formData)
      } else {
        const record = await pb.collection('clinic_settings').create(formData)
        setSettingsId(record.id)
      }
      toast.success('Configurações da clínica salvas com sucesso')
      loadClinicSettings()
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSavingSettings(false)
    }
  }

  useRealtime('pathologies_catalog', loadPathologies)

  const handleAddPathology = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPathology.trim()) return

    try {
      await pb.collection('pathologies_catalog').create({ name: newPathology.trim() })
      setNewPathology('')
      toast.success('Patologia adicionada com sucesso')
    } catch (error: any) {
      toast.error('Erro ao adicionar patologia', {
        description: error.response?.data?.name?.message || error.message,
      })
    }
  }

  const handleDeletePathology = async (id: string) => {
    try {
      await pb.collection('pathologies_catalog').delete(id)
      toast.success('Patologia removida')
    } catch (error) {
      toast.error('Erro ao remover patologia')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie equipe e configurações do sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {user?.role === 'admin' && (
          <Card className="col-span-full border-primary/50 shadow-sm">
            <CardHeader className="bg-primary/5 border-b">
              <CardTitle className="text-primary flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Administração Global
              </CardTitle>
              <CardDescription>
                Ferramentas exclusivas para administradores da franquia.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link to="/settings/access-control">
                    <ShieldAlert className="h-6 w-6 text-primary" />
                    <span>Controle de Acesso</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link to="/dashboard/matrix">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <span>Dashboard Matriz</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  asChild
                >
                  <Link to="/settings/maintenance">
                    <Database className="h-6 w-6 text-primary" />
                    <span>Manutenção de Dados</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Regras de Bônus e Comissionamento</CardTitle>
            <CardDescription>
              Configure as regras de comissionamento baseadas em receita e desempenho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="revenue-percentage">Percentual de Repasse da Receita (%)</Label>
                  <Input
                    id="revenue-percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={clinicSettings.bonus_config.revenue_percentage}
                    onChange={(e) =>
                      setClinicSettings({
                        ...clinicSettings,
                        bonus_config: {
                          ...clinicSettings.bonus_config,
                          revenue_percentage: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual base calculado sobre a receita paga do profissional.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Multiplicadores de Desempenho (Score)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setClinicSettings({
                          ...clinicSettings,
                          bonus_config: {
                            ...clinicSettings.bonus_config,
                            performance_thresholds: [
                              ...clinicSettings.bonus_config.performance_thresholds,
                              { min_score: 80, multiplier: 1.0 },
                            ],
                          },
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Faixa
                    </Button>
                  </div>

                  {clinicSettings.bonus_config.performance_thresholds.map((threshold, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Score Mínimo</Label>
                        <Input
                          type="number"
                          value={threshold.min_score}
                          onChange={(e) => {
                            const newThresholds = [
                              ...clinicSettings.bonus_config.performance_thresholds,
                            ]
                            newThresholds[index].min_score = parseFloat(e.target.value) || 0
                            setClinicSettings({
                              ...clinicSettings,
                              bonus_config: {
                                ...clinicSettings.bonus_config,
                                performance_thresholds: newThresholds,
                              },
                            })
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Multiplicador do Bônus</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={threshold.multiplier}
                          onChange={(e) => {
                            const newThresholds = [
                              ...clinicSettings.bonus_config.performance_thresholds,
                            ]
                            newThresholds[index].multiplier = parseFloat(e.target.value) || 0
                            setClinicSettings({
                              ...clinicSettings,
                              bonus_config: {
                                ...clinicSettings.bonus_config,
                                performance_thresholds: newThresholds,
                              },
                            })
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          const newThresholds =
                            clinicSettings.bonus_config.performance_thresholds.filter(
                              (_, i) => i !== index,
                            )
                          setClinicSettings({
                            ...clinicSettings,
                            bonus_config: {
                              ...clinicSettings.bonus_config,
                              performance_thresholds: newThresholds,
                            },
                          })
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {clinicSettings.bonus_config.performance_thresholds.length === 0 && (
                    <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                      Nenhuma faixa de desempenho configurada. O multiplicador padrão será 1x.
                    </p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={savingSettings}>
                {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Regras de Bônus
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Perfil da Clínica</CardTitle>
            <CardDescription>Gerencie as informações e a marca da sua clínica.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Nome da Clínica *</Label>
                  <Input
                    id="clinic-name"
                    value={clinicSettings.name}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-email">E-mail de Contato</Label>
                  <Input
                    id="clinic-email"
                    type="email"
                    value={clinicSettings.email}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-phone">Telefone</Label>
                  <Input
                    id="clinic-phone"
                    value={clinicSettings.phone}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-address">Endereço</Label>
                  <Input
                    id="clinic-address"
                    value={clinicSettings.address}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening-time">Abertura</Label>
                  <Input
                    id="opening-time"
                    type="time"
                    value={clinicSettings.opening_time}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, opening_time: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing-time">Fechamento</Label>
                  <Input
                    id="closing-time"
                    type="time"
                    value={clinicSettings.closing_time}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, closing_time: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-region">Região</Label>
                  <Input
                    id="clinic-region"
                    placeholder="Ex: Sul, Nordeste"
                    value={clinicSettings.region}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, region: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinic-state">Estado</Label>
                  <Input
                    id="clinic-state"
                    placeholder="Ex: SP, RJ, MG"
                    value={clinicSettings.state}
                    onChange={(e) =>
                      setClinicSettings({ ...clinicSettings, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="clinic-logo">Logo da Clínica (Máx 5MB)</Label>
                  <div className="flex items-center gap-4">
                    {logoUrl && (
                      <Avatar className="h-16 w-16 rounded-md">
                        <AvatarImage src={logoUrl} className="object-cover" />
                        <AvatarFallback className="rounded-md">LG</AvatarFallback>
                      </Avatar>
                    )}
                    <Input
                      id="clinic-logo"
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={savingSettings || !clinicSettings.name}>
                {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Equipe & Usuários</CardTitle>
                <CardDescription>
                  Gerencie quem tem acesso à {activeClinic?.name || 'clínica'}.
                </CardDescription>
              </div>
              <Button size="sm">Adicionar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dbUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{u.name || 'Sem Nome'}</p>
                      <p className="text-sm text-muted-foreground mt-1">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={u.role === 'professional' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                    {activeClinic && <ProfessionalGoalDialog user={u} clinicId={activeClinic.id} />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controle de Versão (GitHub)</CardTitle>
            <CardDescription>
              Conecte um repositório GitHub para versionamento de código (Recurso Premium).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground flex flex-col gap-4">
              <p>
                Acesse a plataforma Skip Cloud para conectar sua conta do GitHub. Isso permite
                salvar automaticamente o histórico de alterações do seu sistema.
              </p>
              <div>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://skip.cloud', '_blank')}
                >
                  Configurar no Skip Cloud
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Patologias</CardTitle>
            <CardDescription>
              Gerencie a lista de patologias disponíveis para o mapeamento de dor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddPathology} className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="pathology-name">Nova Patologia</Label>
                <Input
                  id="pathology-name"
                  placeholder="Ex: Hérnia de Disco L5-S1"
                  value={newPathology}
                  onChange={(e) => setNewPathology(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!newPathology.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </form>

            <div className="border rounded-md">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pathologies.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground text-sm">
                    Nenhuma patologia cadastrada.
                  </div>
                ) : (
                  <div className="divide-y">
                    {pathologies.map((path) => (
                      <div
                        key={path.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium">{path.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePathology(path.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
