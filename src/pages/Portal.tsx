import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export default function Portal() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<any[]>([])
  const [finances, setFinances] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [clinicSettings, setClinicSettings] = useState<any>(null)
  const [receiptRecord, setReceiptRecord] = useState<any>(null)

  const loadData = async () => {
    if (!user || user.role !== 'patient' || !user.patient_id) {
      setLoading(false)
      return
    }

    try {
      const [appts, fins, fbs, settings] = await Promise.all([
        pb
          .collection('appointments')
          .getFullList({ expand: 'professional_id', sort: '-start_time' }),
        pb
          .collection('consultations_finance')
          .getFullList({ expand: 'patient_id', filter: `status='paid'`, sort: '-created' }),
        pb.collection('feedbacks').getFullList(),
        pb
          .collection('clinic_settings')
          .getList(1, 1)
          .catch(() => null),
      ])

      setAppointments(appts)
      setFinances(fins)
      setFeedbacks(fbs)
      if (settings?.items.length) setClinicSettings(settings.items[0])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('appointments', loadData)
  useRealtime('consultations_finance', loadData)
  useRealtime('feedbacks', loadData)

  const handlePrintReceipt = (record: any) => {
    setReceiptRecord(record)
    setTimeout(() => {
      window.print()
      setReceiptRecord(null)
    }, 200)
  }

  const openFeedback = (appt: any) => {
    setSelectedAppt(appt)
    setRating(5)
    setComment('')
    setFeedbackOpen(true)
  }

  const submitFeedback = async () => {
    if (!selectedAppt) return
    setSubmitting(true)
    try {
      await pb.collection('feedbacks').create({
        appointment_id: selectedAppt.id,
        rating,
        comment,
      })
      toast({ title: 'Avaliação enviada com sucesso!' })
      setFeedbackOpen(false)
    } catch (e) {
      toast({ title: 'Erro ao enviar avaliação', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user?.role !== 'patient' || !user?.patient_id) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não possui um cadastro de paciente vinculado.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Portal</h1>
          <p className="text-muted-foreground">Acompanhe suas consultas, histórico e pagamentos.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Minhas Consultas</CardTitle>
              <CardDescription>Histórico de atendimentos agendados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma consulta encontrada.</p>
                ) : (
                  appointments.map((appt) => {
                    const hasFeedback = feedbacks.some((f) => f.appointment_id === appt.id)
                    return (
                      <div
                        key={appt.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-semibold">
                            {new Date(appt.start_time).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Profissional:{' '}
                            {appt.expand?.professional_id?.name ||
                              appt.expand?.professional_id?.email}
                          </div>
                          <div className="mt-1">
                            <Badge variant={appt.status === 'completed' ? 'default' : 'secondary'}>
                              {appt.status === 'completed'
                                ? 'Concluída'
                                : appt.status === 'scheduled'
                                  ? 'Agendada'
                                  : appt.status}
                            </Badge>
                          </div>
                        </div>
                        {appt.status === 'completed' && !hasFeedback && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 sm:mt-0"
                            onClick={() => openFeedback(appt)}
                          >
                            <Star className="mr-2 h-4 w-4" /> Avaliar
                          </Button>
                        )}
                        {hasFeedback && (
                          <span className="text-xs text-muted-foreground mt-4 sm:mt-0 flex items-center">
                            <Star className="h-3 w-3 mr-1 text-yellow-500 fill-current" /> Avaliado
                          </span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meus Pagamentos</CardTitle>
              <CardDescription>Recibos de pagamentos confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {finances.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                ) : (
                  finances.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="font-semibold">R$ {f.amount.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(f.updated).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize mt-1">
                          Via {f.payment_method}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handlePrintReceipt(f)}>
                        <Printer className="mr-2 h-4 w-4" /> Recibo
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Avaliar Consulta</DialogTitle>
              <DialogDescription>Como foi sua experiência no atendimento?</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                    <Star
                      className={`h-8 w-8 ${star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                <Label>Comentário (opcional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deixe um comentário..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitFeedback} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar Avaliação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receipt Print Template */}
      {receiptRecord && (
        <div className="hidden print:block w-full bg-white text-black p-8 font-sans max-w-3xl mx-auto">
          <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
            {clinicSettings?.logo ? (
              <img
                src={pb.files.getURL(clinicSettings, clinicSettings.logo)}
                alt="Clinic Logo"
                className="h-20 object-contain mx-auto mb-4"
              />
            ) : (
              <div className="text-4xl font-bold mb-2">
                {clinicSettings?.name || 'Clínica de Dor'}
              </div>
            )}
            <h1 className="text-2xl font-bold uppercase mb-2">Recibo de Pagamento</h1>
            <p className="text-gray-600">Nº {receiptRecord.id.toUpperCase()}</p>
          </div>

          <div className="mb-8 space-y-2 text-lg">
            <p>
              Recebemos de <strong>{receiptRecord.expand?.patient_id?.name}</strong>
              {receiptRecord.expand?.patient_id?.document && (
                <span> (Doc: {receiptRecord.expand?.patient_id?.document})</span>
              )}
              ,
            </p>
            <p>
              a importância de{' '}
              <strong>R$ {receiptRecord.amount.toFixed(2).replace('.', ',')}</strong>, referente a
              serviços prestados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-12 border border-gray-200 p-6 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Data do Pagamento</p>
              <p className="font-medium">{new Date(receiptRecord.updated).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase font-semibold">Método de Pagamento</p>
              <p className="font-medium capitalize">{receiptRecord.payment_method}</p>
            </div>
            {clinicSettings?.address && (
              <div className="col-span-2 mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 uppercase font-semibold">Local</p>
                <p>{clinicSettings.address}</p>
              </div>
            )}
          </div>

          <div className="text-center mt-24">
            <div className="w-64 border-b border-black mx-auto mb-2"></div>
            <p className="font-bold">{clinicSettings?.name || 'Assinatura / Carimbo'}</p>
            {clinicSettings?.phone && <p className="text-sm mt-1">Tel: {clinicSettings.phone}</p>}
            {clinicSettings?.email && <p className="text-sm">{clinicSettings.email}</p>}
          </div>
        </div>
      )}
    </>
  )
}
