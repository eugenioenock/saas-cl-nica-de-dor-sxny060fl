import pb from '@/lib/pocketbase/client'

export interface Patient {
  id: string
  name: string
  email?: string
  phone?: string
  created: string
  updated: string
}

export const getPatients = () =>
  pb.collection('patients').getFullList<Patient>({
    sort: 'name',
  })
