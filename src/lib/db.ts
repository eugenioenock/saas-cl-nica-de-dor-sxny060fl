import { mockPatients, mockAppointments, Appointment, Patient } from './data'

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

const initDB = () => {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem('saas_patients')) {
    localStorage.setItem('saas_patients', JSON.stringify(mockPatients))
  }
  if (!localStorage.getItem('saas_appointments')) {
    localStorage.setItem('saas_appointments', JSON.stringify(mockAppointments))
  }
  if (!localStorage.getItem('saas_pain_points')) {
    localStorage.setItem('saas_pain_points', JSON.stringify([]))
  }
}

initDB()

export const getPatient = async (id: string): Promise<Patient | undefined> => {
  await new Promise((r) => setTimeout(r, 600))
  const patients = JSON.parse(localStorage.getItem('saas_patients') || '[]')
  return patients.find((p: any) => p.id === id)
}

export const getPainPoints = async (patientId: string): Promise<PainPoint[]> => {
  await new Promise((r) => setTimeout(r, 400))
  const points = JSON.parse(localStorage.getItem('saas_pain_points') || '[]')
  return points.filter((p: any) => p.patientId === patientId)
}

export const savePainPoint = async (point: PainPoint): Promise<void> => {
  await new Promise((r) => setTimeout(r, 200))
  const points = JSON.parse(localStorage.getItem('saas_pain_points') || '[]')
  const existing = points.findIndex((p: any) => p.id === point.id)
  if (existing >= 0) {
    points[existing] = point
  } else {
    points.push(point)
  }
  localStorage.setItem('saas_pain_points', JSON.stringify(points))
}

export const deletePainPoint = async (id: string): Promise<void> => {
  await new Promise((r) => setTimeout(r, 200))
  let points = JSON.parse(localStorage.getItem('saas_pain_points') || '[]')
  points = points.filter((p: any) => p.id !== id)
  localStorage.setItem('saas_pain_points', JSON.stringify(points))
}

export const getProcedures = async (patientId: string): Promise<Appointment[]> => {
  await new Promise((r) => setTimeout(r, 300))
  const appointments = JSON.parse(localStorage.getItem('saas_appointments') || '[]')
  return appointments.filter((a: any) => a.patientId === patientId)
}

export const saveProcedure = async (procedure: Appointment): Promise<void> => {
  await new Promise((r) => setTimeout(r, 200))
  const appointments = JSON.parse(localStorage.getItem('saas_appointments') || '[]')
  appointments.push(procedure)
  localStorage.setItem('saas_appointments', JSON.stringify(appointments))
}
