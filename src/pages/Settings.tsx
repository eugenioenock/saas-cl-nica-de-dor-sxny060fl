import { useState, useEffect } from 'react'
import { useAppContext } from '@/hooks/use-app-context'
import { mockUsers } from '@/lib/data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

  useEffect(() => {
    loadPathologies()
  }, [])

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
