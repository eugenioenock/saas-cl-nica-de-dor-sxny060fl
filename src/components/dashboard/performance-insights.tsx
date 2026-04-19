import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useAppContext } from '@/hooks/use-app-context'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertTriangle, Lightbulb, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PerformanceInsights() {
  const { user } = useAuth()
  const { activeClinic } = useAppContext()
  const [insights, setInsights] = useState<any[]>([])

  const role = user?.role || 'professional'
  const isManager = role === 'manager' || role === 'admin'

  const fetchInsights = async () => {
    if (!activeClinic?.id) return
    try {
      let filter = `type = 'performance_insight' && clinic_id = "${activeClinic.id}"`
      if (!isManager) {
        filter += ` && user_id = "${user.id}"`
      }

      const res = await pb.collection('notifications').getList(1, 10, {
        filter,
        sort: '-created',
        expand: 'user_id',
      })
      setInsights(res.items)
    } catch (error) {
      console.error('Failed to fetch insights', error)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [activeClinic?.id, isManager, user?.id])

  useRealtime('notifications', () => {
    fetchInsights()
  })

  if (insights.length === 0) return null

  return (
    <Card className="col-span-full mt-0 shadow-sm border-blue-100 dark:border-blue-950">
      <CardHeader className="pb-3 bg-blue-50/30 dark:bg-blue-950/10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {isManager ? 'Resumo de Insights da Clínica' : 'Insights de Performance'}
        </CardTitle>
        <CardDescription>
          {isManager
            ? 'Oportunidades e alertas gerados automaticamente para orientar o desempenho de sua equipe.'
            : 'Sugestões automatizadas baseadas em seus resultados recentes e metas financeiras.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight) => {
          const isPositive = insight.title.includes('Meta')
          const isWarning = insight.title.includes('Cancelamento')
          const isInfo = !isPositive && !isWarning

          const Icon = isPositive ? TrendingUp : isWarning ? AlertTriangle : Lightbulb

          return (
            <Alert
              key={insight.id}
              className={cn('relative overflow-hidden transition-all border shadow-sm', {
                'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-200':
                  isPositive,
                'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200':
                  isWarning,
                'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-200':
                  isInfo,
              })}
            >
              <Icon
                className={cn('h-5 w-5 absolute top-4 left-4', {
                  'text-emerald-600 dark:text-emerald-400': isPositive,
                  'text-amber-600 dark:text-amber-400': isWarning,
                  'text-blue-600 dark:text-blue-400': isInfo,
                })}
              />
              <div className="pl-7">
                <AlertTitle className="font-semibold flex items-center justify-between mb-1.5">
                  <span className="leading-none">{insight.title}</span>
                  {isManager && insight.expand?.user_id && (
                    <span className="text-[10px] font-medium bg-background/50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-border/50">
                      <User className="h-3 w-3" />
                      {insight.expand.user_id.name.split(' ')[0]}
                    </span>
                  )}
                </AlertTitle>
                <AlertDescription className="text-sm opacity-90 leading-snug">
                  {insight.message}
                </AlertDescription>
              </div>
            </Alert>
          )
        })}
      </CardContent>
    </Card>
  )
}
