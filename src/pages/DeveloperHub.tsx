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
import { Loader2, Activity, Zap, FileText, Download, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        const logsFilter = user?.role === 'manager' ? `clinic_id="${user.clinic_id}"` : ''
        const annFilter =
          user?.role === 'manager' ? `clinic_id="" || clinic_id="${user.clinic_id}"` : ''
        const reportsFilter =
          user?.role === 'manager' ? `schedule_id.clinic_id="${user.clinic_id}"` : ''

        const [logsRes, annRes, reportsRes] = await Promise.all([
          pb
            .collection('action_logs')
            .getList(1, 50, { sort: '-created', expand: 'user_id', filter: logsFilter }),
          pb.collection('announcements').getList(1, 50, { sort: '-created', filter: annFilter }),
          pb
            .collection('report_logs')
            .getList(1, 50, { sort: '-created', expand: 'schedule_id', filter: reportsFilter }),
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

  const [isExporting, setIsExporting] = useState(false)

  const handleExportCSV = () => {
    const headers = ['Time', 'User', 'Action', 'Collection', 'Record ID', 'Details']
    const csvContent = [
      headers.join(','),
      ...logs.map((log) => {
        const time = new Date(log.created).toLocaleString()
        const userName = log.expand?.user_id?.name || log.user_id || 'System'
        const details = JSON.stringify(log.details || {}).replace(/"/g, '""')
        return `"${time}","${userName}","${log.action}","${log.collection_name}","${log.record_id}","${details}"`
      }),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `action_logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    setIsExporting(true)
    setTimeout(() => {
      window.print()
      setIsExporting(false)
    }, 500)
  }

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <p className="text-xl font-semibold">Permission Denied</p>
        <p className="text-muted-foreground">
          Você não tem permissão para acessar os logs do sistema.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Developer Hub</h1>
            <p className="text-muted-foreground">Monitoramento do sistema e gestão de melhorias</p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                Exportar PDF
              </Button>
            </div>
          )}
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

      <div className="hidden print:block w-full bg-white text-black text-sm">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold">System Action Logs (Audit Report)</h1>
          <p className="text-gray-600">Generated on: {new Date().toLocaleString()}</p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left">
              <th className="p-2 font-bold">Time</th>
              <th className="p-2 font-bold">User</th>
              <th className="p-2 font-bold">Action</th>
              <th className="p-2 font-bold">Collection</th>
              <th className="p-2 font-bold">Record ID</th>
              <th className="p-2 font-bold">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-200">
                <td className="p-2 whitespace-nowrap text-xs">
                  {new Date(log.created).toLocaleString()}
                </td>
                <td className="p-2">{log.expand?.user_id?.name || log.user_id || 'System'}</td>
                <td className="p-2 uppercase font-semibold text-xs">{log.action}</td>
                <td className="p-2">{log.collection_name}</td>
                <td className="p-2 font-mono text-[10px]">{log.record_id}</td>
                <td className="p-2 text-[10px] break-all max-w-[200px]">
                  {JSON.stringify(log.details || {}).substring(0, 100)}
                  {JSON.stringify(log.details || {}).length > 100 ? '...' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
