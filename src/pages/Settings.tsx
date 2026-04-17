import { useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { mockUsers } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Loader2, Plus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function Settings() {
  const { activeClinic } = useAppContext()
  const users = mockUsers.filter((u) => u.clinicId === activeClinic?.id)

  const [pathologies, setPathologies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newPathology, setNewPathology] = useState('')

  const [settingsId, setSettingsId] = useState('')
  const [clinicSettings, setClinicSettings] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const formData = new FormData()
      formData.append('name', clinicSettings.name)
      formData.append('phone', clinicSettings.phone)
      formData.append('email', clinicSettings.email)
      formData.append('address', clinicSettings.address)
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
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium leading-none">{user.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={user.role === 'Doctor' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
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
