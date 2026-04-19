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
import { Trophy, Target, DollarSign, Award, Star, Loader2 } from 'lucide-react'
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

      const [appointments, finance, notes, clinic] = await Promise.all([
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

      const profIds = Array.from(new Set(appointments.map((a) => a.professional_id)))

      let maxRev = 1
      let maxVol = 1

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

      const revenueShare = myPaidRevenue * (config.revenue_percentage / 100)

      let multiplier = 1
      const thresholds = [...(config.performance_thresholds || [])].sort(
        (a, b) => b.min_score - a.min_score,
      )
      const matchedThreshold = thresholds.find((t: any) => score >= t.min_score)
      if (matchedThreshold) {
        multiplier = matchedThreshold.multiplier
      }

      const estimatedBonus = revenueShare * multiplier
      const nextThreshold = [...thresholds].reverse().find((t) => t.min_score > score)

      setStats({
        revenue: myRevenue,
        paidRevenue: myPaidRevenue,
        volume: myCompleted,
        efficiency: myEfficiency,
        score,
        revenueShare,
        multiplier,
        estimatedBonus,
        nextThreshold,
        thresholds,
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const progressToNext = stats?.nextThreshold
    ? (stats.score / stats.nextThreshold.min_score) * 100
    : 100

  const isTopPerformer =
    stats?.multiplier > 1 &&
    stats?.multiplier === Math.max(...(stats?.thresholds.map((t: any) => t.multiplier) || [1]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Financeiro</h1>
          <p className="text-muted-foreground">Acompanhe sua performance e projeção de bônus.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Mês Atual</SelectItem>
            <SelectItem value="last_month">Mês Anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={cn(isTopPerformer && 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/10')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal (Paga)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              R$ {stats?.paidRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total gerado: R${' '}
              {stats?.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score de Performance</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.score.toFixed(1)}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ 100</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.volume} atendimentos ({stats?.efficiency.toFixed(1)}% efic.)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bônus Estimado</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {stats?.estimatedBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Multiplicador atual: {stats?.multiplier}x
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Gamificação e Metas
            </CardTitle>
            <CardDescription>Veja o quão perto você está do próximo multiplicador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isTopPerformer ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <Star className="h-12 w-12 text-amber-400 fill-amber-400" />
                <div>
                  <h3 className="font-bold text-lg text-amber-700 dark:text-amber-500">
                    Top Performer!
                  </h3>
                  <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                    Você atingiu o multiplicador máximo deste mês.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-muted-foreground">
                    Progresso para {stats?.nextThreshold?.multiplier}x
                  </span>
                  <span className="font-bold">
                    {stats?.score.toFixed(1)} / {stats?.nextThreshold?.min_score} pts
                  </span>
                </div>
                <Progress value={progressToNext} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  Aumente seu volume de consultas ou eficiência para atingir a próxima meta.
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Tabela de Multiplicadores</h4>
              <div className="space-y-2">
                {stats?.thresholds.map((t: any, i: number) => (
                  <div
                    key={i}
                    className={cn(
                      'flex justify-between items-center p-2 rounded text-sm',
                      stats?.multiplier === t.multiplier
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    <span>Score {t.min_score}+</span>
                    <span>{t.multiplier}x</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <BonusSimulator bonusConfig={bonusConfig} maxRev={maxValues.rev} maxVol={maxValues.vol} />
      </div>
    </div>
  )
}
