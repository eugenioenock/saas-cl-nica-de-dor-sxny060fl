import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

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

  const loadContext = async () => {
    if (!user?.id) return
    try {
      let accessibleClinics: any[] = []
      if (user.role === 'admin') {
        accessibleClinics = await pb.collection('clinic_settings').getFullList({ sort: 'name' })
      } else {
        const accessRecords = await pb.collection('user_clinic_access').getFullList({
          filter: `user_id = "${user.id}"`,
          expand: 'clinic_id',
        })
        accessibleClinics = accessRecords.map((r: any) => r.expand?.clinic_id).filter(Boolean)
      }

      setClinics(accessibleClinics)

      let currentClinic = accessibleClinics.find((c) => c.id === user.clinic_id)
      if (!currentClinic && accessibleClinics.length > 0) {
        currentClinic = accessibleClinics[0]
        await pb.collection('users').update(user.id, { clinic_id: currentClinic.id })
      }

      if (currentClinic) {
        setActiveClinic(currentClinic)
      }
    } catch (e) {
      console.error('Failed to load clinic context', e)
    }
  }

  useEffect(() => {
    loadContext()
  }, [user?.id, user?.role, user?.clinic_id])

  useRealtime('clinic_settings', () => {
    loadContext()
  })

  useRealtime('user_clinic_access', () => {
    loadContext()
  })

  const handleSetActiveClinic = async (clinicId: string) => {
    if (user?.id && clinicId !== user.clinic_id) {
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
