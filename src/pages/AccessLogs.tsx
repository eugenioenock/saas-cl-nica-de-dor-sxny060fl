import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function AccessLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      try {
        if (!user?.clinic_id) return
        const res = await pb.collection('action_logs').getList(1, 100, {
          filter: `clinic_id = "${user.clinic_id}" && action = "user_login"`,
          sort: '-created',
          expand: 'user_id',
        })
        setLogs(res.items)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    loadLogs()
  }, [user?.clinic_id])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Acesso</h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento de autenticações e atividades de segurança.
          </p>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Endereço IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Carregando auditoria...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Nenhum log de acesso registrado recentemente.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                    {format(new Date(log.created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {log.expand?.user_id?.name ||
                        log.expand?.user_id?.email ||
                        'Usuário Removido'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 gap-1.5 font-normal"
                    >
                      <Activity className="h-3 w-3" />
                      Login Efetuado
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {log.details?.ip || 'IP não capturado'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
