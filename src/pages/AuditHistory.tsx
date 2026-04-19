import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Activity, RefreshCcw } from 'lucide-react'

export default function AuditHistory() {
  const { user } = useAuth()

  const [logs, setLogs] = useState<any[]>([])
  const [clinics, setClinics] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [clinicFilter, setClinicFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      loadFilters()
      loadLogs()
    }
  }, [user])

  useEffect(() => {
    loadLogs()
  }, [clinicFilter, actionFilter, userFilter, dateFilter])

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/dashboard" replace />
  }

  const loadFilters = async () => {
    try {
      const [c, u] = await Promise.all([
        pb.collection('clinic_settings').getFullList(),
        pb.collection('users').getFullList(),
      ])
      setClinics(c)
      setUsers(u)
    } catch (e) {
      console.error(e)
    }
  }

  const loadLogs = async () => {
    let filter = []
    if (clinicFilter !== 'all') filter.push(`clinic_id = "${clinicFilter}"`)
    if (actionFilter !== 'all') filter.push(`action = "${actionFilter}"`)
    if (userFilter !== 'all') filter.push(`user_id = "${userFilter}"`)
    if (dateFilter) {
      const start = new Date(dateFilter)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateFilter)
      end.setHours(23, 59, 59, 999)
      filter.push(
        `created >= "${start.toISOString().replace('T', ' ')}" && created <= "${end.toISOString().replace('T', ' ')}"`,
      )
    }

    try {
      const records = await pb.collection('action_logs').getList(1, 100, {
        sort: '-created',
        filter: filter.join(' && '),
        expand: 'user_id,clinic_id',
      })
      setLogs(records.items)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Auditoria</h1>
          <p className="text-muted-foreground">Log centralizado de ações críticas no sistema.</p>
        </div>
        <Button variant="outline" onClick={loadLogs}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={clinicFilter} onValueChange={setClinicFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Clínica" />
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

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="CREATE">Criação (CREATE)</SelectItem>
                <SelectItem value="UPDATE">Atualização (UPDATE)</SelectItem>
                <SelectItem value="DELETE">Exclusão (DELETE)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Data"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Clínica</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {log.expand?.user_id?.name || log.expand?.user_id?.email || 'Sistema'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'DELETE' ? 'destructive' : 'secondary'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.collection_name}</TableCell>
                    <TableCell>{log.expand?.clinic_id?.name || '-'}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-xs text-muted-foreground"
                      title={JSON.stringify(log.details)}
                    >
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
