import pb from '@/lib/pocketbase/client'

export interface Patient {
  id: string
  name: string
  document?: string
  email?: string
  phone?: string
  created: string
  updated: string
}

export const getPatients = () =>
  pb.collection('patients').getFullList<Patient>({
    sort: 'name',
  })

export const searchPatients = (query: string) => {
  return pb.collection('patients').getList<Patient>(1, 10, {
    filter: pb.filter('name ~ {:q} || document ~ {:q}', { q: query }),
    sort: 'name',
  })
}
