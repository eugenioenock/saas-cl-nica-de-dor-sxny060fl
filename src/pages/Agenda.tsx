import { useState, useEffect, useCallback } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAppointments, type Appointment } from '@/services/appointments'
import { useRealtime } from '@/hooks/use-realtime'
import { useAppContext } from '@/hooks/use-app-context'
import { AppointmentSheet } from '@/components/agenda/appointment-sheet'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  scheduled:
    'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
  confirmed:
    'bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
  completed:
    'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-300',
  cancelled:
    'bg-red-100 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
}

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedAppt, setSelectedAppt] = useState<Appointment | undefined>()
  const { activeClinic } = useAppContext()

  const loadData = useCallback(async () => {
    if (!activeClinic?.id) return
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    try {
      const res = await getAppointments(start.toISOString(), end.toISOString(), activeClinic.id)
      setAppointments(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, activeClinic?.id])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('appointments', loadData)

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setSelectedAppt(undefined)
    setSheetOpen(true)
  }
  const handleApptClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation()
    setSelectedAppt(appt)
    setSheetOpen(true)
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day
        const dayAppts = appointments.filter((a) => {
          const aDate = new Date(a.start_time)
          return (
            aDate.getDate() === cloneDay.getDate() &&
            aDate.getMonth() === cloneDay.getMonth() &&
            aDate.getFullYear() === cloneDay.getFullYear()
          )
        })

        days.push(
          <div
            key={day.toISOString()}
            onClick={() => handleDayClick(cloneDay)}
            className={cn(
              'min-h-[120px] max-h-[160px] border border-t-0 border-l-0 p-1 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col',
              !isSameMonth(day, monthStart) && 'bg-muted/10 text-muted-foreground',
              isToday(day) && 'bg-primary/5',
            )}
          >
            <span
              className={cn(
                'text-xs font-medium p-1 w-6 h-6 flex items-center justify-center rounded-full mb-1',
                isToday(day) && 'bg-primary text-primary-foreground',
              )}
            >
              {format(day, 'd')}
            </span>
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
              {dayAppts.map((appt) => (
                <div
                  key={appt.id}
                  onClick={(e) => handleApptClick(e, appt)}
                  className={cn(
                    'text-[10px] p-1 rounded border truncate hover:brightness-95',
                    statusColors[appt.status],
                  )}
                >
                  <span className="font-semibold">
                    {format(new Date(appt.start_time), 'HH:mm')}
                  </span>{' '}
                  - {appt.title}
                  {appt.expand?.professional_id?.name && (
                    <div className="text-[9px] opacity-80 truncate mt-0.5">
                      {appt.expand.professional_id.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>,
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div className="grid grid-cols-7 border-l" key={day.toISOString()}>
          {days}
        </div>,
      )
      days = []
    }
    return rows
  }

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] p-4 sm:p-6 bg-background">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[150px] text-center capitalize">
              {monthLabel}
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => handleDayClick(new Date())}>
            <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border rounded-lg bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="p-2 text-center text-sm font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-7 border-l">
              <Skeleton className="h-[120px] w-full border-b border-r" />
            </div>
          ) : (
            renderCells()
          )}
        </div>
      </div>

      <AppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selectedDate={selectedDate}
        appointment={selectedAppt}
      />
    </div>
  )
}
