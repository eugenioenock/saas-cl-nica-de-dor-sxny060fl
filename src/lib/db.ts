// Deprecated: Logic moved directly to PocketBase components.
export type PainPoint = {
  id: string
  patientId: string
  x: number
  y: number
  view: 'front' | 'back'
  name: string
  notes: string
  intensity: number
}
