import pb from '@/lib/pocketbase/client'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  clinic_id?: string
}

export const getUsers = () => pb.collection('users').getFullList<User>({ sort: 'name' })
