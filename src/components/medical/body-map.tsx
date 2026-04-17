import { useState } from 'react'
import { mockBodyPoints, mockPathologies } from '@/lib/data'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

type RecordedPoint = {
  bodyPointId: string
  pathologyId: string
}

export function BodyMap({ patientId }: { patientId: string }) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)
  const [pathology, setPathology] = useState<string>('')
  const [records, setRecords] = useState<RecordedPoint[]>([])

  const handlePointClick = (id: string) => {
    setSelectedPoint(id)
    setPathology('')
  }

  const handleSave = () => {
    if (selectedPoint && pathology) {
      setRecords([...records, { bodyPointId: selectedPoint, pathologyId: pathology }])
      setSelectedPoint(null)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 relative aspect-[3/4] max-w-md mx-auto bg-muted/20 rounded-xl border p-4 overflow-hidden flex items-center justify-center">
        {/* Simplified abstract body representation */}
        <div className="relative w-[200px] h-[500px]">
          {/* Head */}
          <div className="absolute top-[5%] left-[50%] -translate-x-1/2 w-16 h-20 rounded-full border-4 border-primary/20 bg-background" />
          {/* Torso */}
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-24 h-48 rounded-[2rem] border-4 border-primary/20 bg-background" />
          {/* Arms */}
          <div className="absolute top-[22%] left-[10%] w-8 h-40 rounded-full border-4 border-primary/20 bg-background origin-top rotate-12" />
          <div className="absolute top-[22%] right-[10%] w-8 h-40 rounded-full border-4 border-primary/20 bg-background origin-top -rotate-12" />
          {/* Legs */}
          <div className="absolute top-[65%] left-[30%] w-10 h-48 rounded-full border-4 border-primary/20 bg-background" />
          <div className="absolute top-[65%] right-[30%] w-10 h-48 rounded-full border-4 border-primary/20 bg-background" />

          {mockBodyPoints.map((bp) => {
            const hasRecord = records.some((r) => r.bodyPointId === bp.id)
            return (
              <button
                key={bp.id}
                onClick={() => handlePointClick(bp.id)}
                className={cn(
                  'absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200 z-10 flex items-center justify-center',
                  hasRecord
                    ? 'bg-destructive border-destructive text-destructive-foreground shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                    : 'bg-background border-primary text-primary hover:scale-125 hover:bg-primary hover:text-primary-foreground',
                )}
                style={{ top: `${bp.y}%`, left: `${bp.x}%` }}
                title={bp.label}
              >
                <div
                  className={cn('w-1.5 h-1.5 rounded-full', hasRecord ? 'bg-white' : 'bg-primary')}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recorded Pathologies
        </h3>
        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No points recorded yet. Click on the body map to add a record.
            </p>
          ) : (
            records.map((r, i) => {
              const bp = mockBodyPoints.find((b) => b.id === r.bodyPointId)
              const path = mockPathologies.find((p) => p.id === r.pathologyId)
              return (
                <div key={i} className="p-3 rounded-lg border bg-card text-sm">
                  <div className="font-medium text-primary">{bp?.label}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-muted-foreground">{path?.name}</span>
                    <Badge variant="outline">{path?.icd}</Badge>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Dialog open={!!selectedPoint} onOpenChange={(open) => !open && setSelectedPoint(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Pathology</DialogTitle>
            <DialogDescription>
              Select the condition affecting the{' '}
              {mockBodyPoints.find((b) => b.id === selectedPoint)?.label}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={pathology} onValueChange={setPathology}>
              <SelectTrigger>
                <SelectValue placeholder="Select pathology..." />
              </SelectTrigger>
              <SelectContent>
                {mockPathologies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} <span className="text-muted-foreground text-xs ml-2">({p.icd})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPoint(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!pathology}>
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
