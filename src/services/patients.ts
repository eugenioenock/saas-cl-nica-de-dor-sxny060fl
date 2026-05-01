import pb from '@/lib/pocketbase/client'

export interface Patient {
  id: string
  name: string
  document?: string
  email?: string
  phone?: string
  dob?: string
  clinic_id?: string
  created: string
  updated: string
}

export const getPatients = (clinicId?: string) => {
  const filter = clinicId ? pb.filter('clinic_id = {:c}', { c: clinicId }) : ''
  return pb.collection('patients').getFullList<Patient>({
    sort: 'name',
    filter,
  })
}

export const createPatient = (data: Partial<Patient>) => {
  return pb.collection('patients').create<Patient>(data)
}

export const searchPatients = (query: string, clinicId?: string) => {
  const baseFilter = pb.filter('name ~ {:q} || document ~ {:q}', { q: query })
  const filter = clinicId ? `${baseFilter} && clinic_id = "${clinicId}"` : baseFilter
  return pb.collection('patients').getList<Patient>(1, 10, {
    filter,
    sort: 'name',
  })
}
