import { Trophy, Star, TrendingUp, ShieldCheck, Medal, Target, Award, Zap } from 'lucide-react'
import React from 'react'

export const LEVEL_THRESHOLDS = [
  {
    level: 1,
    tier: 'Bronze',
    minXp: 0,
    nextXp: 1000,
    color: 'bg-orange-700/10 text-orange-700 border-orange-200',
  },
  {
    level: 2,
    tier: 'Silver',
    minXp: 1000,
    nextXp: 2500,
    color: 'bg-slate-300/30 text-slate-700 border-slate-300',
  },
  {
    level: 3,
    tier: 'Gold',
    minXp: 2500,
    nextXp: 5000,
    color: 'bg-yellow-400/20 text-yellow-700 border-yellow-300',
  },
  {
    level: 4,
    tier: 'Platinum',
    minXp: 5000,
    nextXp: 10000,
    color: 'bg-cyan-400/20 text-cyan-700 border-cyan-300',
  },
]

export function getLevelInfo(xp: number) {
  const current =
    LEVEL_THRESHOLDS.slice()
      .reverse()
      .find((t) => xp >= t.minXp) || LEVEL_THRESHOLDS[0]
  const nextLevel = LEVEL_THRESHOLDS.find((t) => t.level === current.level + 1)
  const nextXp = nextLevel ? nextLevel.minXp : current.nextXp
  const progress = Math.min(
    100,
    Math.max(0, ((xp - current.minXp) / (nextXp - current.minXp)) * 100),
  )
  return { ...current, nextXp, progress }
}

export const BADGE_ICONS: Record<string, React.ElementType> = {
  Star: Star,
  TrendingUp: TrendingUp,
  ShieldCheck: ShieldCheck,
  Trophy: Trophy,
  Medal: Medal,
  Target: Target,
  Award: Award,
  Zap: Zap,
}
