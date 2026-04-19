import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getLevelInfo, BADGE_ICONS } from '@/lib/gamification'
import { Trophy, Award } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export function ClinicGamificationWidget() {
  const { user } = useAuth()
  const [clinic, setClinic] = useState<any>(null)

  const loadClinic = async () => {
    if (!user?.clinic_id) return
    try {
      const data = await pb.collection('clinic_settings').getOne(user.clinic_id)
      setClinic(data)
    } catch (e) {}
  }

  useEffect(() => {
    loadClinic()
  }, [user?.clinic_id])

  useRealtime('clinic_settings', (e) => {
    if (e.record.id === user?.clinic_id) {
      setClinic(e.record)
    }
  })

  if (!clinic) return null

  const xp = clinic.xp || 0
  const levelInfo = getLevelInfo(xp)
  const badges = Array.isArray(clinic.badges) ? clinic.badges : []

  return (
    <Card
      className={`relative overflow-hidden border-2 ${levelInfo.color.split(' ')[2]} transition-all duration-500`}
    >
      <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
        <Trophy className="w-32 h-32" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              Nível {clinic.level || 1}: {clinic.tier || 'Bronze'}
            </CardTitle>
            <CardDescription>Acompanhe a evolução da sua unidade</CardDescription>
          </div>
          <Badge variant="outline" className={levelInfo.color}>
            {xp} XP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso para Nível {levelInfo.level + 1}</span>
            <span>
              {xp} / {levelInfo.nextXp} XP
            </span>
          </div>
          <Progress value={levelInfo.progress} className="h-3" />
        </div>

        {badges.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-medium mb-2 text-muted-foreground">Conquistas Recentes</p>
            <div className="flex flex-wrap gap-2">
              {badges
                .slice(-3)
                .reverse()
                .map((b: any) => {
                  const Icon = BADGE_ICONS[b.icon] || Award
                  return (
                    <Badge
                      key={b.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 py-1 px-2 border bg-background/50"
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-500" />
                      {b.name}
                    </Badge>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
