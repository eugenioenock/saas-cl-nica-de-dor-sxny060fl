import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trophy, Target, DollarSign, Award, Star, Loader2, Activity } from 'lucide-react'
import { BonusSimulator } from '@/components/dashboard/BonusSimulator'
import { cn } from '@/lib/utils'

export default function ProfessionalFinance() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('current_month')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [bonusConfig, setBonusConfig] = useState<any>(null)
  const [maxValues, setMaxValues] = useState({ rev: 1, vol: 1 })

  const loadData = async () => {
    if (!user?.clinic_id) return
    try {
      setLoading(true)
      const today = new Date()
      let start = ''
      let end = ''

      if (period === 'current_month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().replace('T', ' ')
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
          .toISOString()
          .replace('T', ' ')
      } else {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          .toISOString()
          .replace('T', ' ')
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
          .toISOString()
          .replace('T', ' ')
      }

      const d = new Date(start)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      const [appointments, finance, notes, clinic, profGoalsResponse] = await Promise.all([
        pb.collection('appointments').getFullList({
          filter: `start_time >= "${start}" && start_time <= "${end}" && clinic_id = "${user.clinic_id}"`,
        }),
        pb.collection('consultations_finance').getFullList({
          filter: `created >= "${start}" && created <= "${end}" && clinic_id = "${user.clinic_id}" && status != 'cancelled'`,
        }),
        pb.collection('medical_notes').getFullList({
          filter: `created >= "${start}" && created <= "${end}" && clinic_id = "${user.clinic_id}"`,
        }),
        pb.collection('clinic_settings').getOne(user.clinic_id),
        pb
          .collection('professional_goals')
          .getList(1, 1, {
            filter: `professional_id = "${user.id}" && month = "${monthStr}"`,
          })
          .catch(() => null),
      ])

      const config = clinic.bonus_config || { revenue_percentage: 0, performance_thresholds: [] }
      setBonusConfig(config)
      const profGoal = profGoalsResponse?.items?.[0]

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

      const profIds = Array.from(new Set(appointments.map((a) => a.professional_id)))

      let maxRev = 1,
        maxVol = 1
      const allStats = profIds.map((id) => {
        const profAppts = appointments.filter((a) => a.professional_id === id)
        const completed = profAppts.filter((a) => a.status === 'completed').length
        const rev = financeByProf.get(id) || 0
        return { id, rev, vol: completed }
      })

      if (allStats.length > 0) {
        maxRev = Math.max(...allStats.map((s) => s.rev), 1)
        maxVol = Math.max(...allStats.map((s) => s.vol), 1)
      }
      setMaxValues({ rev: maxRev, vol: maxVol })

      const myAppts = appointments.filter((a) => a.professional_id === user.id)
      const myTotal = myAppts.length
      const myCompleted = myAppts.filter((a) => a.status === 'completed').length
      const myRevenue = financeByProf.get(user.id) || 0
      const myPaidRevenue = paidFinanceByProf.get(user.id) || 0
      const myEfficiency = myTotal > 0 ? (myCompleted / myTotal) * 100 : 0

      const revScore = (myRevenue / maxRev) * 40
      const volScore = (myCompleted / maxVol) * 30
      const effScore = (myEfficiency / 100) * 30
      const score = revScore + volScore + effScore

      let estimatedBonus = 0
      let nextTier = null
      let currentTier = null
      let isTiered = false

      if (profGoal && profGoal.commission_tiers && profGoal.commission_tiers.length > 0) {
        isTiered = true
        let remainingRevenue = myPaidRevenue
        const sortedTiers = [...profGoal.commission_tiers].sort((a, b) => a.min - b.min)

        for (let i = 0; i < sortedTiers.length; i++) {
          const t = sortedTiers[i]
          const max = t.max || Infinity
          if (myPaidRevenue >= t.min) {
            currentTier = t
            const revenueInTier = Math.min(myPaidRevenue, max) - t.min
            if (revenueInTier > 0) {
              estimatedBonus += revenueInTier * (t.rate / 100)
            }
          }
        }
        nextTier = sortedTiers.find((t) => t.min > myPaidRevenue)
      } else {
        const revenueShare = myPaidRevenue * (config.revenue_percentage / 100)
        let multiplier = 1
        const thresholds = [...(config.performance_thresholds || [])].sort(
          (a, b) => b.min_score - a.min_score,
        )
        const matchedThreshold = thresholds.find((t: any) => score >= t.min_score)
        if (matchedThreshold) multiplier = matchedThreshold.multiplier

        estimatedBonus = revenueShare * multiplier
        nextTier = [...thresholds].reverse().find((t) => t.min_score > score)
      }

      setStats({
        revenue: myRevenue,
        paidRevenue: myPaidRevenue,
        volume: myCompleted,
        efficiency: myEfficiency,
        score,
        estimatedBonus,
        nextTier,
        currentTier,
        isTiered,
        profGoal,
        thresholds: config.performance_thresholds || [],
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.clinic_id, period])
  useRealtime('appointments', () => loadData(), !!user?.clinic_id)
  useRealtime('consultations_finance', () => loadData(), !!user?.clinic_id)

  if (loading && !stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const progressToNext =
    stats?.nextTier && !stats.isTiered ? (stats.score / stats.nextTier.min_score) * 100 : 100
  const isTopPerformer =
    !stats?.isTiered &&
    stats?.multiplier > 1 &&
    stats?.multiplier === Math.max(...(stats?.thresholds.map((t: any) => t.multiplier) || [1]))

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background z-10 sticky top-16 md:static py-2 md:py-0 border-b md:border-0 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Meu Financeiro</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Acompanhe sua performance e projeção de bônus.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px] h-10 md:h-9 bg-card">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Mês Atual</SelectItem>
            <SelectItem value="last_month">Mês Anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
        <Card
          className={cn(
            'shadow-sm',
            isTopPerformer && 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/10',
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
              Receita (Paga)
            </CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-500">
              R$ {stats?.paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 border-t pt-2 mt-2">
              Gerado:{' '}
              <span className="font-medium">
                R$ {stats?.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-sm font-medium uppercase text-muted-foreground">
              Score de Performance
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-500 flex items-baseline gap-1">
              {stats?.score.toFixed(1)}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 border-t pt-2 mt-2 flex justify-between">
              <span>Vol: {stats?.volume} atends.</span>
              <span>Efic: {stats?.efficiency.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full -z-0 translate-x-4 -translate-y-4"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 md:px-6 pt-4 md:pt-6 relative z-10">
            <CardTitle className="text-sm font-bold uppercase text-primary">
              Comissão / Bônus
            </CardTitle>
            <div className="p-2 bg-primary/20 rounded-full">
              <Award className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4 md:pb-6 relative z-10">
            <div className="text-3xl md:text-4xl font-black text-primary tracking-tight">
              R$ {stats?.estimatedBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            {stats?.isTiered ? (
              <p className="text-xs text-primary/80 font-medium mt-1 pt-2 mt-2">
                Faixa Atual:{' '}
                <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded ml-1">
                  {stats?.currentTier ? `${stats.currentTier.rate}%` : '0%'}
                </span>
              </p>
            ) : (
              <p className="text-xs text-primary/80 font-medium mt-1 pt-2 mt-2">
                Múltiplo Atual:{' '}
                <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded ml-1">
                  {stats?.multiplier}x
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2">
        <Card className="shadow-sm order-2 md:order-1">
          <CardHeader className="px-4 py-4 md:p-6 border-b md:border-0 bg-muted/10 md:bg-transparent">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-amber-500" /> Metas de Crescimento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
            {stats?.isTiered ? (
              <div className="space-y-6">
                <div className="space-y-3 bg-card p-4 rounded-xl border shadow-sm">
                  <div className="flex justify-between text-sm items-end mb-2">
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-primary" /> Meta Base (Mensal)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg">
                        R$ {stats.paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {' '}
                        / R${' '}
                        {stats.profGoal.base_goal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(stats.paidRevenue / (stats.profGoal.base_goal || 1)) * 100}
                    className="h-3"
                  />
                  {stats.nextTier && (
                    <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5 leading-relaxed">
                      <Activity className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                      Faltam R$ {(stats.nextTier.min - stats.paidRevenue).toLocaleString(
                        'pt-BR',
                      )}{' '}
                      para a faixa de {stats.nextTier.rate}%.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    Faixas de Comissão
                  </h4>
                  <div className="space-y-1.5">
                    {stats.profGoal.commission_tiers.map((t: any, i: number) => {
                      const isActive = stats.currentTier?.min === t.min
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex justify-between items-center px-4 py-3 rounded-lg text-sm transition-colors border',
                            isActive
                              ? 'bg-primary/10 border-primary/20 font-bold text-primary shadow-sm ring-1 ring-primary/10'
                              : 'bg-muted/10 border-transparent text-muted-foreground hover:bg-muted/30',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            Acima de R$ {t.min.toLocaleString('pt-BR')}
                          </span>
                          <span
                            className={cn(
                              'text-base',
                              isActive
                                ? 'bg-primary text-primary-foreground px-2 py-0.5 rounded-md'
                                : '',
                            )}
                          >
                            {t.rate}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {isTopPerformer ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/20 dark:to-transparent rounded-xl border border-amber-200/50 dark:border-amber-900/50">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-full mb-2">
                      <Star className="h-10 w-10 text-amber-500 fill-amber-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-amber-700 dark:text-amber-500">
                        Nível Máximo Atingido!
                      </h3>
                      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1 max-w-[250px] mx-auto">
                        Excelente trabalho. Você está maximizando seus retornos operacionais este
                        mês.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="flex justify-between text-sm items-end mb-2">
                      <div>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          <Target className="h-3.5 w-3.5 text-primary" /> Próximo Nível:{' '}
                          {stats?.nextTier?.multiplier}x
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">{stats?.score.toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">
                          {' '}
                          / {stats?.nextTier?.min_score} pts
                        </span>
                      </div>
                    </div>
                    <Progress value={progressToNext} className="h-3" />
                    <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5 leading-relaxed">
                      <Activity className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                      Conclua mais consultas sem cancelamentos para aumentar sua Eficiência e
                      Volume.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    Tabela de Múltiplos
                  </h4>
                  <div className="space-y-1.5">
                    {stats?.thresholds.map((t: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          'flex justify-between items-center px-4 py-3 rounded-lg text-sm transition-colors border',
                          stats?.multiplier === t.multiplier
                            ? 'bg-primary/10 border-primary/20 font-bold text-primary shadow-sm ring-1 ring-primary/10'
                            : 'bg-muted/10 border-transparent text-muted-foreground hover:bg-muted/30',
                        )}
                      >
                        <span className="flex items-center gap-2">Score {t.min_score}+</span>
                        <span
                          className={cn(
                            'text-base',
                            stats?.multiplier === t.multiplier
                              ? 'bg-primary text-primary-foreground px-2 py-0.5 rounded-md'
                              : '',
                          )}
                        >
                          {t.multiplier}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="order-1 md:order-2">
          <BonusSimulator bonusConfig={bonusConfig} maxRev={maxValues.rev} maxVol={maxValues.vol} />
        </div>
      </div>
    </div>
  )
}
