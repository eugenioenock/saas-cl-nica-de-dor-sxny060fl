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
  Target,
  ArrowUpRight,
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
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

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
      } else {
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
          if (f.status === 'paid')
            paidFinanceByProf.set(profId, (paidFinanceByProf.get(profId) || 0) + f.amount)
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

      const thresholds = [...(config.performance_thresholds || [])].sort(
        (a, b) => b.min_score - a.min_score,
      )

      const processedData = stats
        .map((s) => {
          const revScore = (s.revenue / maxRev) * 40
          const volScore = (s.volume / maxVol) * 30
          const effScore = (s.efficiency / 100) * 30
          const score = revScore + volScore + effScore
          const revenueShare = s.paidRevenue * (config.revenue_percentage / 100)

          let multiplier = 1
          const matchedThreshold = thresholds.find((t: any) => score >= t.min_score)
          if (matchedThreshold) multiplier = matchedThreshold.multiplier

          const nextThreshold = [...thresholds].reverse().find((t) => t.min_score > score)
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
            nextThreshold,
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
    if (period !== 'custom' || (period === 'custom' && customStart && customEnd)) loadData()
  }, [user?.clinic_id, period, customStart, customEnd])

  useRealtime('appointments', () => loadData(), !!user?.clinic_id)
  useRealtime('consultations_finance', () => loadData(), !!user?.clinic_id)
  useRealtime('clinic_settings', () => loadData(), !!user?.clinic_id)

  const handleExportCSV = () => {
    const headers = [
      'Profissional',
      'Período',
      'Receita Total',
      'Receita Paga',
      'Score',
      'Bônus Base',
      'Mult.',
      'Bônus Total',
    ]
    const rows = data.map((item) => [
      `"${item.name}"`,
      `"${period}"`,
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

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 md:h-6 md:w-6 text-[#FFD700]" />
    if (index === 1) return <Medal className="h-5 w-5 md:h-6 md:w-6 text-[#C0C0C0]" />
    if (index === 2) return <Medal className="h-5 w-5 md:h-6 md:w-6 text-[#CD7F32]" />
    return (
      <span className="text-muted-foreground font-medium w-5 md:w-6 text-center inline-block">
        {index + 1}º
      </span>
    )
  }

  const canViewBonus = (profId: string) =>
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    (user?.role === 'professional' && user?.id === profId)

  const isConfigured = bonusConfig && bonusConfig.revenue_percentage > 0
  const myStats = data.find((d) => d.id === user?.id)
  const myRank = myStats ? data.indexOf(myStats) : -1

  return (
    <Card className="shadow-sm border-muted">
      <CardHeader className="px-4 py-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl">Ranking da Unidade</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Competição saudável baseada em Performance e Resultados.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="hidden lg:flex h-9">
                      <Calculator className="h-4 w-4 mr-2" />
                      Simular Bônus
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] w-[95vw] rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Simulador Interativo</DialogTitle>
                      <DialogDescription>Ajuste variáveis para simular ganhos.</DialogDescription>
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
                    <Button variant="outline" size="sm" className="h-9">
                      <Download className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Exportar</span>
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
              <div className="flex items-center gap-1 w-full md:w-auto mt-2 md:mt-0">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full md:w-[130px] h-9 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full md:w-[130px] h-9 text-xs"
                />
              </div>
            )}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full md:w-[160px] h-9 mt-2 md:mt-0">
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
          <Alert className="mt-4 border-primary/50 bg-primary/5 rounded-lg">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Regras não configuradas</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
              <span className="text-sm">Configure o repasse para cálculo automático.</span>
              <Button size="sm" variant="outline" asChild className="w-full sm:w-auto h-8">
                <Link to="/settings">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configurar
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="p-0 md:p-6 md:pt-0">
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {/* MOBILE QUICK VIEW FOR CURRENT PROFESSIONAL */}
            {user?.role === 'professional' && myStats && (
              <div className="md:hidden mx-4 mb-2 p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Target className="h-16 w-16" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-2">
                  Minha Posição Atual
                </span>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="bg-background rounded-full p-2 shadow-sm border">
                    {getRankIcon(myRank)}
                  </div>
                  <span className="text-3xl font-black text-foreground">
                    {myRank + 1}º{' '}
                    <span className="text-lg font-normal text-muted-foreground">Lugar</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full">
                  <div className="bg-background/80 rounded-lg p-2 border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Meu Score</p>
                    <p className="font-bold text-base">{myStats.score.toFixed(1)}</p>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase mb-0.5">
                      Estimativa Base
                    </p>
                    <p className="font-bold text-base text-emerald-600">
                      R${' '}
                      {myStats.estimatedBonus.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                {myStats.nextThreshold && (
                  <div className="w-full mt-4 pt-4 border-t border-primary/10">
                    <div className="flex justify-between text-xs mb-1.5 font-medium">
                      <span className="text-muted-foreground">
                        Meta para {myStats.nextThreshold.multiplier}x
                      </span>
                      <span className="text-primary">
                        {myStats.score.toFixed(1)} / {myStats.nextThreshold.min_score}
                      </span>
                    </div>
                    <Progress
                      value={(myStats.score / myStats.nextThreshold.min_score) * 100}
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            )}

            {/* MOBILE LIST VIEW */}
            <div className="md:hidden px-4 space-y-3 pb-6">
              {data.map((item, index) => {
                const isMe = item.id === user?.id
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 border rounded-xl flex flex-col gap-3 shadow-sm transition-all',
                      isMe ? 'border-primary/50 bg-primary/5' : 'bg-card',
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 shrink-0">
                          {getRankIcon(index)}
                        </div>
                        <Avatar className="h-10 w-10 border shadow-sm">
                          {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
                          <AvatarFallback className="bg-muted">
                            {item.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              'font-semibold text-sm line-clamp-1',
                              isMe && 'text-primary',
                            )}
                          >
                            {item.name} {isMe && '(Você)'}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Score:{' '}
                            <span className="font-medium text-foreground">
                              {item.score.toFixed(1)}
                            </span>
                          </span>
                        </div>
                      </div>
                      {(canViewBonus(item.id) || isMe) && (
                        <div className="text-right shrink-0 bg-muted/30 px-2 py-1.5 rounded-md border">
                          <div className="text-[10px] text-muted-foreground uppercase leading-none mb-0.5">
                            Bônus Total
                          </div>
                          <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 leading-none">
                            R${' '}
                            {item.estimatedBonus.toLocaleString('pt-BR', {
                              minimumFractionDigits: 0,
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
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
                    <TableRow key={item.id} className={cn(item.id === user?.id && 'bg-primary/5')}>
                      <TableCell className="text-center flex justify-center items-center h-14">
                        {getRankIcon(index)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shadow-sm border">
                            {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.name} />}
                            <AvatarFallback className="bg-muted">
                              {item.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'font-medium whitespace-nowrap',
                              item.id === user?.id && 'text-primary font-bold',
                            )}
                          >
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-medium">{item.volume}</TableCell>
                      <TableCell className="text-center">{item.efficiency.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help flex items-center justify-end gap-1.5 font-bold w-full text-primary">
                            {item.score.toFixed(1)}{' '}
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="w-[200px]">
                            <div className="space-y-1.5 text-sm p-1">
                              <p className="flex justify-between border-b pb-1 font-medium text-muted-foreground uppercase text-[10px]">
                                Composição do Score
                              </p>
                              <p className="flex justify-between">
                                <span>Receita (40%):</span>{' '}
                                <span className="font-bold">{item.revScore.toFixed(1)}</span>
                              </p>
                              <p className="flex justify-between">
                                <span>Volume (30%):</span>{' '}
                                <span className="font-bold">{item.volScore.toFixed(1)}</span>
                              </p>
                              <p className="flex justify-between">
                                <span>Eficiência (30%):</span>{' '}
                                <span className="font-bold">{item.effScore.toFixed(1)}</span>
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
                              <TooltipTrigger className="cursor-help flex items-center justify-end gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 w-full hover:underline decoration-dashed decoration-emerald-500/50">
                                R${' '}
                                {item.estimatedBonus.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                                <Info className="h-3 w-3 text-emerald-500/50" />
                              </TooltipTrigger>
                              <TooltipContent align="end" className="w-[280px]">
                                <div className="space-y-2 text-sm p-1">
                                  <p className="font-semibold border-b pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Composição do Bônus
                                  </p>
                                  <p className="flex justify-between">
                                    <span>Receita Paga:</span>{' '}
                                    <span className="font-medium">
                                      R${' '}
                                      {item.paidRevenue.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span>
                                      Repasse Base ({bonusConfig?.revenue_percentage || 0}%):
                                    </span>{' '}
                                    <span className="font-medium">
                                      R${' '}
                                      {item.revenueShare.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}
                                    </span>
                                  </p>
                                  <p className="flex justify-between">
                                    <span>Multiplicador (Tiers):</span>{' '}
                                    <span className="font-bold text-primary bg-primary/10 px-1.5 rounded">
                                      {item.multiplier}x
                                    </span>
                                  </p>
                                  <p className="flex justify-between font-bold pt-2 mt-1 border-t text-base text-emerald-600 dark:text-emerald-400">
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
