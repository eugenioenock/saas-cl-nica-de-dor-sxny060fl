import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Clinic {
  id: string
  name: string
}

interface AccessRecord {
  id: string
  user_id: string
  clinic_id: string
}

export default function SettingsAccessControl() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [accessMap, setAccessMap] = useState<Record<string, string[]>>({})
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [usersData, clinicsData, accessData] = await Promise.all([
        pb.collection('users').getFullList<User>({ sort: 'name' }),
        pb.collection('clinic_settings').getFullList<Clinic>({ sort: 'name' }),
        pb.collection('user_clinic_access').getFullList<AccessRecord>(),
      ])

      setUsers(usersData)
      setClinics(clinicsData)
      setAccessRecords(accessData)

      const map: Record<string, string[]> = {}
      usersData.forEach((u) => {
        map[u.id] = accessData.filter((a) => a.user_id === u.id).map((a) => a.clinic_id)
      })
      setAccessMap(map)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleToggleAccess = async (userId: string, clinicId: string, hasAccess: boolean) => {
    setSaving(userId)
    try {
      if (hasAccess) {
        const record = accessRecords.find((a) => a.user_id === userId && a.clinic_id === clinicId)
        if (record) {
          await pb.collection('user_clinic_access').delete(record.id)
        }
      } else {
        await pb.collection('user_clinic_access').create({
          user_id: userId,
          clinic_id: clinicId,
        })
      }
      await loadData()
      toast.success('Acesso atualizado')
    } catch (error) {
      toast.error('Erro ao atualizar acesso')
    } finally {
      setSaving(null)
    }
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-8 w-8 text-primary" />
          Controle de Acesso Global
        </h1>
        <p className="text-muted-foreground">
          Gerencie quais clínicas cada profissional pode acessar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Administradores têm acesso a todas as clínicas independentemente desta configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3 md:w-1/3 shrink-0">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {u.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium leading-none">{u.name || 'Sem nome'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{u.email}</p>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="mt-2">
                      {u.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 bg-muted/30 rounded-md p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                    Clínicas Permitidas
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clinics.map((clinic) => {
                      const hasAccess = accessMap[u.id]?.includes(clinic.id) || false
                      return (
                        <div key={clinic.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${u.id}-${clinic.id}`}
                            checked={hasAccess}
                            disabled={saving === u.id || u.role === 'admin'}
                            onCheckedChange={() => handleToggleAccess(u.id, clinic.id, hasAccess)}
                          />
                          <label
                            htmlFor={`${u.id}-${clinic.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {clinic.name}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
