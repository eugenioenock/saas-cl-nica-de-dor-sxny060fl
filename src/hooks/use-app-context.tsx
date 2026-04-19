import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

type AppContextType = {
  currentUser: any
  activeClinic: any
  activeFranchise: any
  setActiveClinic: (clinicId: string) => void
  clinics: any[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [activeClinic, setActiveClinic] = useState<any>({ name: 'Carregando...' })
  const [clinics, setClinics] = useState<any[]>([])

  useEffect(() => {
    if (user?.clinic_id) {
      pb.collection('clinic_settings')
        .getOne(user.clinic_id)
        .then(setActiveClinic)
        .catch(console.error)

      pb.collection('clinic_settings').getFullList().then(setClinics).catch(console.error)
    }
  }, [user?.clinic_id])

  const handleSetActiveClinic = async (clinicId: string) => {
    if (user?.id) {
      try {
        await pb.collection('users').update(user.id, { clinic_id: clinicId })
        window.location.reload()
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <AppContext.Provider
      value={{
        currentUser: user || { name: 'Usuário' },
        activeClinic,
        activeFranchise: { name: 'SpineCare OS' },
        setActiveClinic: handleSetActiveClinic,
        clinics,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
