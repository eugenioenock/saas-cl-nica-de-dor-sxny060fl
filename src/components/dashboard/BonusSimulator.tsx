import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

export function BonusSimulator({
  bonusConfig,
  maxRev = 20000,
  maxVol = 100,
}: {
  bonusConfig: any
  maxRev?: number
  maxVol?: number
}) {
  const [volume, setVolume] = useState([50])
  const [avgPrice, setAveragePrice] = useState([200])
  const [efficiency, setEfficiency] = useState([85])

  const revenue = volume[0] * avgPrice[0]

  const revScore = Math.min((revenue / Math.max(maxRev, 1)) * 40, 40)
  const volScore = Math.min((volume[0] / Math.max(maxVol, 1)) * 30, 30)
  const effScore = (efficiency[0] / 100) * 30
  const score = revScore + volScore + effScore

  const revenueShare = revenue * ((bonusConfig?.revenue_percentage || 0) / 100)

  let multiplier = 1
  const thresholds = [...(bonusConfig?.performance_thresholds || [])].sort(
    (a, b) => b.min_score - a.min_score,
  )
  const matched = thresholds.find((t: any) => score >= t.min_score)
  if (matched) multiplier = matched.multiplier

  const totalBonus = revenueShare * multiplier

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle>Simulador de Bônus</CardTitle>
        <CardDescription>Projete ganhos ajustando as variáveis abaixo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Volume de Atendimentos</Label>
            <span className="font-bold text-primary">{volume[0]}</span>
          </div>
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={Math.max(maxVol * 2, 200)}
            step={1}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Valor Médio (R$)</Label>
            <span className="font-bold text-primary">R$ {avgPrice[0]}</span>
          </div>
          <Slider value={avgPrice} onValueChange={setAveragePrice} max={1500} step={10} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Eficiência (%)</Label>
            <span className="font-bold text-primary">{efficiency[0]}%</span>
          </div>
          <Slider value={efficiency} onValueChange={setEfficiency} max={100} step={1} />
        </div>

        <div className="pt-4 border-t space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Score Projetado:</span>
            <span className="font-semibold">{score.toFixed(1)} / 100</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Bônus Base:</span>
            <span>R$ {revenueShare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Multiplicador:</span>
            <span>{multiplier}x</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-primary">
            <span>Bônus Estimado:</span>
            <span>R$ {totalBonus.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
