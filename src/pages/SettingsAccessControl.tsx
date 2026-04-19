import { useState, useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Trash2, Loader2 } from 'lucide-react'
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
  expand?: {
    clinic_id: Clinic
  }
}

export default function SettingsAccessControl() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClinic, setFilterClinic] = useState<string>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [u, c, a] = await Promise.all([
        pb.collection('users').getFullList<User>({ sort: 'name' }),
        pb.collection('clinic_settings').getFullList<Clinic>({ sort: 'name' }),
        pb.collection('user_clinic_access').getFullList<AccessRecord>({ expand: 'clinic_id' }),
      ])
      setUsers(u)
      setClinics(c)
      setAccessRecords(a)
    } catch (e) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredUsers = useMemo(() => {
    if (filterClinic === 'all') return users
    return users.filter(
      (u) =>
        u.role === 'admin' ||
        accessRecords.some((a) => a.user_id === u.id && a.clinic_id === filterClinic),
    )
  }, [users, accessRecords, filterClinic])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessing(userId)
    try {
      await pb.collection('users').update(userId, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
      toast.success('Função atualizada com sucesso')
    } catch (e) {
      toast.error('Erro ao atualizar função')
    } finally {
      setProcessing(null)
    }
  }

  const handleRevokeAccess = async (accessId: string) => {
    setProcessing(accessId)
    try {
      await pb.collection('user_clinic_access').delete(accessId)
      setAccessRecords((prev) => prev.filter((a) => a.id !== accessId))
      toast.success('Acesso revogado')
    } catch (e) {
      toast.error('Erro ao revogar acesso')
    } finally {
      setProcessing(null)
    }
  }

  const handleAddAccess = async (userId: string, clinicId: string) => {
    if (accessRecords.some((a) => a.user_id === userId && a.clinic_id === clinicId)) return

    setProcessing(userId)
    try {
      const record = await pb
        .collection('user_clinic_access')
        .create({ user_id: userId, clinic_id: clinicId })
      const fullRecord = await pb
        .collection('user_clinic_access')
        .getOne(record.id, { expand: 'clinic_id' })
      setAccessRecords((prev) => [...prev, fullRecord as AccessRecord])
      toast.success('Acesso concedido')
    } catch (e) {
      toast.error('Erro ao conceder acesso')
    } finally {
      setProcessing(null)
    }
  }

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between gap-4 md:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-primary" />
            Auditoria de Permissões
          </h1>
          <p className="text-muted-foreground">
            Revise e gerencie o nível de acesso e unidades de cada usuário.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={filterClinic} onValueChange={setFilterClinic}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Clínica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Clínicas</SelectItem>
              {clinics.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Acesso às Unidades</TableHead>
                  <TableHead className="w-[200px]">Adicionar Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      Nenhum usuário encontrado para o filtro atual.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const userAccesses = accessRecords.filter((a) => a.user_id === u.id)
                    const isProcessing = processing === u.id

                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.name || 'Sem nome'}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, val)}
                            disabled={isProcessing}
                          >
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="professional">Profissional</SelectItem>
                              <SelectItem value="patient">Paciente</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {u.role === 'admin' ? (
                            <Badge variant="default">Todas as Unidades (Admin)</Badge>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {userAccesses.length === 0 && (
                                <span className="text-sm text-muted-foreground">Sem acessos</span>
                              )}
                              {userAccesses.map((a) => (
                                <Badge
                                  key={a.id}
                                  variant="secondary"
                                  className="flex items-center gap-1 py-1 px-2"
                                >
                                  {a.expand?.clinic_id?.name || 'Unidade'}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                    onClick={() => handleRevokeAccess(a.id)}
                                    disabled={processing === a.id}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={u.role === 'admin' || isProcessing}
                            onValueChange={(val) => handleAddAccess(u.id, val)}
                            value=""
                          >
                            <SelectTrigger className="w-full h-8">
                              <SelectValue placeholder="Conceder..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clinics
                                .filter((c) => !userAccesses.some((a) => a.clinic_id === c.id))
                                .map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
