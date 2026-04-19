import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Trophy,
  Medal,
  Info,
  Loader2,
  AlertCircle,
  Settings2,
  Download,
  Calculator,
  FileSpreadsheet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { BonusSimulator } from './BonusSimulator'

export function ProfessionalRanking() {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('current_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [bonusConfig, setBonusConfig] = useState<any>(null)
  const [maxValues, setMaxValues] = useState({ rev: 1, vol: 1 })

  const loadData = async () => {
    if (!user?.clinic_id) return
    try {
      setLoading(true)
      const today = new Date()
      let startOfMonth = ''
      let endOfMonth = ''

      if (period === 'current_month') {
        startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .replace('T', ' ')
        endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
          .toISOString()
          .replace('T', ' ')
      } else if (period === 'last_month') {
        startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          .toISOString()
          .replace('T', ' ')
        endOfMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
          .toISOString()
          .replace('T', ' ')
      } else if (period === 'custom' && customStart && customEnd) {
        startOfMonth = `${customStart} 00:00:00`
        endOfMonth = `${customEnd} 23:59:59`
      } else if (period === 'custom') {
        // Fallback to current month if custom dates not fully selected
        startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .replace('T', ' ')
        endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
          .toISOString()
          .replace('T', ' ')
      }

      const [professionals, appointments, finance, notes, clinic] = await Promise.all([
        pb
          .collection('users')
          .getFullList({ filter: `role = 'professional' && clinic_id = "${user.clinic_id}"` }),
        pb.collection('appointments').getFullList({
          filter: `start_time >= "${startOfMonth}" && start_time <= "${endOfMonth}" && clinic_id = "${user.clinic_id}"`,
        }),
        pb.collection('consultations_finance').getFullList({
          filter: `created >= "${startOfMonth}" && created <= "${endOfMonth}" && clinic_id = "${user.clinic_id}" && status != 'cancelled'`,
        }),
        pb.collection('medical_notes').getFullList({
          filter: `created >= "${startOfMonth}" && created <= "${endOfMonth}" && clinic_id = "${user.clinic_id}"`,
        }),
        pb.collection('clinic_settings').getOne(user.clinic_id),
      ])

      const config = clinic.bonus_config || { revenue_percentage: 0, performance_thresholds: [] }
      setBonusConfig(config)

      const financeByProf = new Map<string, number>()
      const paidFinanceByProf = new Map<string, number>()

      finance.forEach((f) => {
        let profId = f.medical_note_id
          ? notes.find((n) => n.id === f.medical_note_id)?.professionalId
          : null
        if (!profId) {
          const appts = appointments.filter((a) => a.patient_id === f.patient_id)
          if (appts.length > 0) profId = appts[appts.length - 1].professional_id
        }
        if (profId) {
          financeByProf.set(profId, (financeByProf.get(profId) || 0) + f.amount)
          if (f.status === 'paid') {
            paidFinanceByProf.set(profId, (paidFinanceByProf.get(profId) || 0) + f.amount)
          }
        }
      })

      const stats = professionals.map((prof) => {
        const profAppts = appointments.filter((a) => a.professional_id === prof.id)
        const total = profAppts.length
        const completed = profAppts.filter((a) => a.status === 'completed').length
        return {
          id: prof.id,
          name: prof.name || 'Sem Nome',
          avatarUrl: prof.avatar ? pb.files.getUrl(prof, prof.avatar) : undefined,
          revenue: financeByProf.get(prof.id) || 0,
          paidRevenue: paidFinanceByProf.get(prof.id) || 0,
          volume: completed,
          efficiency: total > 0 ? (completed / total) * 100 : 0,
          totalAppts: total,
        }
      })

      const maxRev = Math.max(...stats.map((s) => s.revenue), 1)
      const maxVol = Math.max(...stats.map((s) => s.volume), 1)

      setMaxValues({ rev: maxRev, vol: maxVol })

      const processedData = stats
        .map((s) => {
          const revScore = (s.revenue / maxRev) * 40
          const volScore = (s.volume / maxVol) * 30
          const effScore = (s.efficiency / 100) * 30
          const score = revScore + volScore + effScore

          const revenueShare = s.paidRevenue * (config.revenue_percentage / 100)

          let multiplier = 1
          const thresholds = [...(config.performance_thresholds || [])].sort(
            (a, b) => b.min_score - a.min_score,
          )
          const matchedThreshold = thresholds.find((t: any) => score >= t.min_score)
          if (matchedThreshold) {
            multiplier = matchedThreshold.multiplier
          }

          const estimatedBonus = revenueShare * multiplier

          return {
            ...s,
            revScore,
            volScore,
            effScore,
            score,
            revenueShare,
            multiplier,
            estimatedBonus,
          }
        })
        .sort((a, b) => b.score - a.score)

      setData(processedData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (period !== 'custom' || (period === 'custom' && customStart && customEnd)) {
      loadData()
    }
  }, [user?.clinic_id, period, customStart, customEnd])

  const handleExportCSV = () => {
    const headers = [
      'Profissional',
      'Período',
      'Receita Total',
      'Receita Paga',
      'Score de Performance',
      'Bônus Base',
      'Multiplicador',
      'Bônus Total',
    ]
    const periodLabel =
      period === 'current_month'
        ? 'Mês Atual'
        : period === 'last_month'
          ? 'Mês Anterior'
          : `${customStart} até ${customEnd}`

    const rows = data.map((item) => [
      `"${item.name}"`,
      `"${periodLabel}"`,
      item.revenue.toFixed(2),
      item.paidRevenue.toFixed(2),
      item.score.toFixed(1),
      item.revenueShare.toFixed(2),
      item.multiplier,
      item.estimatedBonus.toFixed(2),
    ])

    const csvContent = [headers, ...rows].map((e) => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `folha_bonus_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useRealtime(
    'appointments',
    () => {
      loadData()
    },
    !!user?.clinic_id,
  )
  useRealtime(
    'consultations_finance',
    () => {
      loadData()
    },
    !!user?.clinic_id,
  )
  useRealtime(
    'clinic_settings',
    () => {
      loadData()
    },
    !!user?.clinic_id,
  )

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-[#FFD700]" />
    if (index === 1) return <Medal className="h-5 w-5 text-[#C0C0C0]" />
    if (index === 2) return <Medal className="h-5 w-5 text-[#CD7F32]" />
    return (
      <span className="text-muted-foreground font-medium w-5 text-center inline-block">
        {index + 1}º
      </span>
    )
  }

  const canViewBonus = (profId: string) => {
    if (user?.role === 'admin' || user?.role === 'manager') return true
    if (user?.role === 'professional' && user?.id === profId) return true
    return false
  }

  const isConfigured = bonusConfig && bonusConfig.revenue_percentage > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Ranking e Comissionamento</CardTitle>
            <CardDescription>
              Desempenho baseado em Receita (40%), Volume (30%) e Eficiência (30%).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden md:flex">
                      <Calculator className="h-4 w-4 mr-2" />
                      Simular Bônus
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Simulador Interativo</DialogTitle>
                      <DialogDescription>
                        Ajuste as variáveis para simular ganhos e bônus da equipe.
                      </DialogDescription>
                    </DialogHeader>
                    <BonusSimulator
                      bonusConfig={bonusConfig}
                      maxRev={maxValues.rev}
                      maxVol={maxValues.vol}
                    />
                  </DialogContent>
                </Dialog>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Folha de Bônus (CSV)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {period === 'custom' && (
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-[130px] h-9 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-[130px] h-9 text-xs"
                />
              </div>
            )}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="last_month">Mês Anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {user?.role === 'admin' && !isConfigured && !loading && (
          <Alert className="mt-4 border-primary/50 bg-primary/5">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Regras de bônus não configuradas</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Configure as regras de repasse para habilitar o cálculo automático de bônus.
              </span>
              <Button size="sm" variant="outline" asChild>
                <Link to="/settings">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configurar
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Receita Total</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                  <TableHead className="text-center">Eficiência</TableHead>
                  <TableHead className="text-right">Pontuação</TableHead>
                  {(user?.role === 'admin' ||
                    user?.role === 'manager' ||
                    user?.role === 'professional') && (
                    <TableHead className="text-right whitespace-nowrap">Bônus Estimado</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center flex justify-center items-center h-14">
                      {getRankIcon(index)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
                          <AvatarFallback>{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium whitespace-nowrap">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">{item.volume}</TableCell>
                    <TableCell className="text-center">{item.efficiency.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger className="cursor-help flex items-center justify-end gap-1 font-bold w-full">
                          {item.score.toFixed(1)} <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-sm">
                            <p>
                              <strong>Receita (40%):</strong> R$ {item.revenue.toFixed(2)} (
                              {item.revScore.toFixed(1)} pts)
                            </p>
                            <p>
                              <strong>Volume (30%):</strong> {item.volume} cons. (
                              {item.volScore.toFixed(1)} pts)
                            </p>
                            <p>
                              <strong>Eficiência (30%):</strong> {item.efficiency.toFixed(1)}% (
                              {item.effScore.toFixed(1)} pts)
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    {(user?.role === 'admin' ||
                      user?.role === 'manager' ||
                      user?.role === 'professional') && (
                      <TableCell className="text-right whitespace-nowrap">
                        {canViewBonus(item.id) ? (
                          <Tooltip>
                            <TooltipTrigger className="cursor-help flex items-center justify-end gap-1 font-bold text-green-600 dark:text-green-400 w-full">
                              R${' '}
                              {item.estimatedBonus.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent align="end" className="w-[260px]">
                              <div className="space-y-2 text-sm">
                                <p className="font-semibold border-b pb-1">Composição do Bônus</p>
                                <p className="flex justify-between">
                                  <span>Receita Paga:</span>
                                  <span>
                                    R${' '}
                                    {item.paidRevenue.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span>Repasse ({bonusConfig?.revenue_percentage || 0}%):</span>
                                  <span>
                                    R${' '}
                                    {item.revenueShare.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </p>
                                <p className="flex justify-between">
                                  <span>Multiplicador (Score {item.score.toFixed(0)}):</span>
                                  <span>{item.multiplier}x</span>
                                </p>
                                <p className="flex justify-between font-bold pt-1 border-t">
                                  <span>Total:</span>
                                  <span>
                                    R${' '}
                                    {item.estimatedBonus.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                  </span>
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Restrito</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
