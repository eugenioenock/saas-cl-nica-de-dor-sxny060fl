import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2, Activity, Zap, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function DeveloperHub() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [reportLogs, setReportLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [logsRes, annRes, reportsRes] = await Promise.all([
          pb.collection('action_logs').getList(1, 50, { sort: '-created', expand: 'user_id' }),
          pb.collection('announcements').getList(1, 50, { sort: '-created' }),
          pb.collection('report_logs').getList(1, 50, { sort: '-created', expand: 'schedule_id' }),
        ])
        setLogs(logsRes.items)
        setAnnouncements(annRes.items)
        setReportLogs(reportsRes.items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Developer Hub</h1>
          <p className="text-muted-foreground">Monitoramento do sistema e gestão de melhorias</p>
        </div>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">
            <Activity className="w-4 h-4 mr-2" /> Action Logs
          </TabsTrigger>
          <TabsTrigger value="updates">
            <Zap className="w-4 h-4 mr-2" /> System Updates
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" /> Report Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Action Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Collection</TableHead>
                      <TableHead>Record ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {log.expand?.user_id?.name || log.user_id || 'System'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.collection_name}</TableCell>
                        <TableCell className="font-mono text-xs">{log.record_id}</TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum log de ação encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>System Improvements & Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Content</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((ann) => (
                      <TableRow key={ann.id}>
                        <TableCell className="text-xs">
                          {new Date(ann.created).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{ann.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ann.priority === 'high' || ann.priority === 'urgent'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {ann.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-xs">{ann.content}</TableCell>
                      </TableRow>
                    ))}
                    {announcements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum registro de atualização encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Report Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Schedule Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportLogs.map((rl) => (
                      <TableRow key={rl.id}>
                        <TableCell className="text-xs">
                          {new Date(rl.created).toLocaleString()}
                        </TableCell>
                        <TableCell>{rl.expand?.schedule_id?.name || rl.schedule_id}</TableCell>
                        <TableCell>
                          <Badge variant={rl.status === 'success' ? 'default' : 'destructive'}>
                            {rl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{rl.details}</TableCell>
                      </TableRow>
                    ))}
                    {reportLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          Nenhum job de relatório registrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
