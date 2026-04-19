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
import { Trophy, Medal, Info, Loader2 } from 'lucide-react'

export function ProfessionalRanking() {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user?.clinic_id) return
    try {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .replace('T', ' ')
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)
        .toISOString()
        .replace('T', ' ')

      const [professionals, appointments, finance, notes] = await Promise.all([
        pb
          .collection('users')
          .getFullList({ filter: `role = 'professional' && clinic_id = "${user.clinic_id}"` }),
        pb
          .collection('appointments')
          .getFullList({
            filter: `start_time >= "${startOfMonth}" && start_time <= "${endOfMonth}" && clinic_id = "${user.clinic_id}"`,
          }),
        pb
          .collection('consultations_finance')
          .getFullList({
            filter: `created >= "${startOfMonth}" && created <= "${endOfMonth}" && clinic_id = "${user.clinic_id}" && status != 'cancelled'`,
          }),
        pb
          .collection('medical_notes')
          .getFullList({
            filter: `created >= "${startOfMonth}" && created <= "${endOfMonth}" && clinic_id = "${user.clinic_id}"`,
          }),
      ])

      const financeByProf = new Map<string, number>()
      finance.forEach((f) => {
        let profId = f.medical_note_id
          ? notes.find((n) => n.id === f.medical_note_id)?.professionalId
          : null
        if (!profId) {
          const appts = appointments.filter((a) => a.patient_id === f.patient_id)
          if (appts.length > 0) profId = appts[appts.length - 1].professional_id
        }
        if (profId) financeByProf.set(profId, (financeByProf.get(profId) || 0) + f.amount)
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
          volume: completed,
          efficiency: total > 0 ? (completed / total) * 100 : 0,
          totalAppts: total,
        }
      })

      const maxRev = Math.max(...stats.map((s) => s.revenue), 1)
      const maxVol = Math.max(...stats.map((s) => s.volume), 1)

      setData(
        stats
          .map((s) => {
            const revScore = (s.revenue / maxRev) * 40
            const volScore = (s.volume / maxVol) * 30
            const effScore = (s.efficiency / 100) * 30
            return { ...s, revScore, volScore, effScore, score: revScore + volScore + effScore }
          })
          .sort((a, b) => b.score - a.score),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.clinic_id])
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

  if (loading) {
    return (
      <Card className="flex h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    )
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Profissionais</CardTitle>
        <CardDescription>
          Desempenho baseado em Receita (40%), Volume (30%) e Eficiência (30%) no mês atual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Nenhum profissional encontrado.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                  <TableHead className="text-center">Eficiência</TableHead>
                  <TableHead className="text-right">Pontuação</TableHead>
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
                        <span className="font-medium">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
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
