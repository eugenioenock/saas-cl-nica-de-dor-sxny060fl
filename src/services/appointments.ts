import pb from '@/lib/pocketbase/client'

export interface Appointment {
  id: string
  patient_id: string
  professional_id: string
  start_time: string
  end_time: string
  title: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  specialty?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    patient_id: { name: string; id: string }
    professional_id: { name: string; id: string; email: string }
  }
}

export const getAppointments = (start: string, end: string) =>
  pb.collection('appointments').getFullList<Appointment>({
    filter: `start_time >= "${start}" && start_time <= "${end}"`,
    expand: 'patient_id,professional_id',
    sort: 'start_time',
  })

export const createAppointment = (data: Partial<Appointment>) =>
  pb.collection('appointments').create<Appointment>(data)

export const updateAppointment = (id: string, data: Partial<Appointment>) =>
  pb.collection('appointments').update<Appointment>(id, data)

export const deleteAppointment = (id: string) => pb.collection('appointments').delete(id)
