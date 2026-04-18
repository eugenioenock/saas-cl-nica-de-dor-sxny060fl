import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Wallet,
  ArrowUpDown,
  MoreVertical,
  Printer,
  Loader2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { FinanceFormDialog } from '@/components/finance/finance-form-dialog'
import { ReceiptDocument } from '@/components/finance/receipt-document'

export default function Financeiro() {
  const { toast } = useToast()
  const [finances, setFinances] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [printRecord, setPrintRecord] = useState<any>(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [billingFilter, setBillingFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortCol, setSortCol] = useState('due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const loadData = async () => {
    try {
      const records = await pb
        .collection('consultations_finance')
        .getFullList({ expand: 'patient_id,insurance_plan_id,medical_note_id' })
      setFinances(records)
      const [pts, pls, s] = await Promise.all([
        pb.collection('patients').getFullList({ sort: 'name' }),
        pb.collection('insurance_plans').getFullList({ sort: 'name', filter: 'active=true' }),
        pb
          .collection('clinic_settings')
          .getList(1, 1)
          .catch(() => null),
      ])
      setPatients(pts)
      setPlans(pls)
      if (s?.items.length) setSettings(s.items[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('consultations_finance', loadData)
  useRealtime('patients', loadData)

  const filteredFinances = useMemo(() => {
    return finances
      .filter((f) => {
        const matchSearch = f.expand?.patient_id?.name?.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || f.status === statusFilter
        const matchBilling = billingFilter === 'all' || f.billing_type === billingFilter
        const recordTime = new Date(f.due_date || f.created).getTime()
        const start = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : 0
        const end = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : Infinity
        return (
          matchSearch && matchStatus && matchBilling && recordTime >= start && recordTime <= end
        )
      })
      .sort((a, b) => {
        let valA = sortCol === 'amount' ? a.amount : new Date(a.due_date || a.created).getTime()
        let valB = sortCol === 'amount' ? b.amount : new Date(b.due_date || b.created).getTime()
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [finances, search, statusFilter, billingFilter, dateFrom, dateTo, sortCol, sortDir])

  const stats = useMemo(() => {
    let paid = 0,
      pending = 0,
      glosa = 0
    filteredFinances.forEach((f) => {
      if (f.status === 'paid') paid += f.amount
      if (f.status === 'pending' || f.status === 'transfer_pending') pending += f.amount
      if (f.status === 'glosa') glosa += f.amount
    })
    return { paid, pending, glosa, expected: paid + pending }
  }, [filteredFinances])

  const updateStatus = async (id: string, status: string) => {
    try {
      await pb.collection('consultations_finance').update(id, { status })
      toast({ title: 'Status atualizado com sucesso.' })
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const handlePrint = (record: any) => {
    setPrintRecord(record)
    setTimeout(() => {
      window.print()
      setPrintRecord(null)
    }, 200)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>
      case 'glosa':
        return <Badge variant="destructive">Glosa</Badge>
      case 'transfer_pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Repasse Pend.
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            Pendente
          </Badge>
        )
    }
  }

  return (
    <>
      <div className={cn('space-y-6', printRecord && 'print:hidden')}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">Visão geral e gestão de pagamentos da clínica.</p>
          </div>
          <FinanceFormDialog patients={patients} plans={plans} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ {stats.paid.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                R$ {stats.pending.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Glosas</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">R$ {stats.glosa.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Previsto</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats.expected.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-[250px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="transfer_pending">Repasse Pendente</SelectItem>
              <SelectItem value="glosa">Glosa</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={billingFilter} onValueChange={setBillingFilter}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder="Faturamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="private">Particular</SelectItem>
              <SelectItem value="insurance">Convênio</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px]"
            />
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('due_date')}>
                  <div className="flex items-center gap-1">
                    Data <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredFinances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFinances.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{new Date(f.due_date || f.created).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{f.expand?.patient_id?.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {f.billing_type === 'insurance' ? (
                          <div className="text-sm">
                            <span className="font-semibold text-blue-600">Convênio</span>
                            <div className="text-xs text-muted-foreground">
                              {f.expand?.insurance_plan_id?.name}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm capitalize">
                            {f.payment_method === 'pix'
                              ? 'PIX'
                              : f.payment_method === 'cash'
                                ? 'Dinheiro'
                                : f.payment_method === 'card'
                                  ? 'Cartão'
                                  : 'Transferência'}
                          </div>
                        )}
                        {f.expand?.medical_note_id && (
                          <div
                            className="text-xs text-muted-foreground truncate max-w-[200px]"
                            title={f.expand.medical_note_id.content}
                          >
                            Proc: {f.expand.medical_note_id.content}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(f.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {f.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Ações</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          {f.status !== 'paid' && (
                            <DropdownMenuItem onClick={() => updateStatus(f.id, 'paid')}>
                              Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          {f.status !== 'pending' && (
                            <DropdownMenuItem onClick={() => updateStatus(f.id, 'pending')}>
                              Marcar como Pendente
                            </DropdownMenuItem>
                          )}
                          {f.status !== 'glosa' && (
                            <DropdownMenuItem onClick={() => updateStatus(f.id, 'glosa')}>
                              Registrar Glosa
                            </DropdownMenuItem>
                          )}
                          {f.status !== 'cancelled' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => updateStatus(f.id, 'cancelled')}
                            >
                              Cancelar Cobrança
                            </DropdownMenuItem>
                          )}
                          {f.status === 'paid' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handlePrint(f)}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir Recibo
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <ReceiptDocument record={printRecord} settings={settings} />
    </>
  )
}
