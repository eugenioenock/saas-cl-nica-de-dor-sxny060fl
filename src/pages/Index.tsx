import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Settings2,
  DollarSign,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DashboardPrefs {
  visibleWidgets: string[]
}

export default function Index() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState<DashboardPrefs>({
    visibleWidgets: ['finance', 'inventory', 'appointments', 'feedbacks'],
  })
  const [stats, setStats] = useState({
    revenue: 0,
    lowStock: 0,
    appointmentsCount: 0,
    feedbacksCount: 0,
  })

  useEffect(() => {
    if (user?.settings?.visibleWidgets) {
      setPrefs({ visibleWidgets: user.settings.visibleWidgets })
    }

    const loadStats = async () => {
      try {
        const [finance, inventory, appointments, feedbacks] = await Promise.all([
          pb
            .collection('consultations_finance')
            .getFullList({ filter: `status='paid'`, requestKey: null }),
          pb
            .collection('clinical_inventory')
            .getList(1, 1, { filter: `current_quantity <= min_quantity`, requestKey: null }),
          pb
            .collection('appointments')
            .getList(1, 1, { filter: `status='scheduled'`, requestKey: null }),
          pb.collection('feedbacks').getList(1, 1, { requestKey: null }),
        ])

        const revenue = finance.reduce((acc, curr) => acc + curr.amount, 0)

        setStats({
          revenue,
          lowStock: inventory.totalItems,
          appointmentsCount: appointments.totalItems,
          feedbacksCount: feedbacks.totalItems,
        })
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [user])

  const toggleWidget = async (widgetId: string) => {
    const isVisible = prefs.visibleWidgets.includes(widgetId)
    const newWidgets = isVisible
      ? prefs.visibleWidgets.filter((w) => w !== widgetId)
      : [...prefs.visibleWidgets, widgetId]

    setPrefs({ visibleWidgets: newWidgets })

    try {
      await pb.collection('users').update(user.id, {
        settings: { ...(user.settings || {}), visibleWidgets: newWidgets },
      })
    } catch (e) {
      toast.error('Erro ao salvar preferências')
    }
  }

  const isVisible = (id: string) => prefs.visibleWidgets.includes(id)

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-primary h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Consolidado</h1>
          <p className="text-muted-foreground">
            Visão geral das suas operações baseada nas suas preferências.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Settings2 className="mr-2 h-4 w-4" />
              Configurar Dashboard
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-4">
            <h4 className="font-medium leading-none">Widgets Visíveis</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Faturamento</span>
                <Switch
                  checked={isVisible('finance')}
                  onCheckedChange={() => toggleWidget('finance')}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas de Estoque</span>
                <Switch
                  checked={isVisible('inventory')}
                  onCheckedChange={() => toggleWidget('inventory')}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Volume de Consultas</span>
                <Switch
                  checked={isVisible('appointments')}
                  onCheckedChange={() => toggleWidget('appointments')}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Feedbacks</span>
                <Switch
                  checked={isVisible('feedbacks')}
                  onCheckedChange={() => toggleWidget('feedbacks')}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {prefs.visibleWidgets.length === 0 ? (
        <div className="flex flex-col h-40 items-center justify-center border rounded-lg bg-muted/10 border-dashed">
          <Settings2 className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
          <p className="text-muted-foreground text-sm">Nenhum widget selecionado.</p>
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-4',
            prefs.visibleWidgets.length === 1
              ? 'md:grid-cols-1'
              : prefs.visibleWidgets.length === 2
                ? 'md:grid-cols-2'
                : prefs.visibleWidgets.length === 3
                  ? 'md:grid-cols-3'
                  : 'md:grid-cols-4',
          )}
        >
          {isVisible('finance') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total Paga</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Faturamento consolidado</p>
              </CardContent>
            </Card>
          )}

          {isVisible('inventory') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas de Estoque</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.lowStock}</div>
                <p className="text-xs text-muted-foreground">Itens abaixo do mínimo</p>
              </CardContent>
            </Card>
          )}

          {isVisible('appointments') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agendamentos Ativos</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.appointmentsCount}</div>
                <p className="text-xs text-muted-foreground">Consultas marcadas</p>
              </CardContent>
            </Card>
          )}

          {isVisible('feedbacks') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
                <MessageSquare className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.feedbacksCount}</div>
                <p className="text-xs text-muted-foreground">Feedbacks recebidos</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
