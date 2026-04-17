import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Clinic, Franchise, User, mockClinics, mockFranchises, mockUsers } from '@/lib/data'

type AppContextType = {
  currentUser: User
  activeClinic: Clinic
  activeFranchise: Franchise
  setActiveClinic: (clinicId: string) => void
  clinics: Clinic[]
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser] = useState<User>(mockUsers[0])
  const [activeClinicId, setActiveClinicId] = useState<string>(currentUser.clinicId)

  const activeClinic = mockClinics.find((c) => c.id === activeClinicId) || mockClinics[0]
  const activeFranchise =
    mockFranchises.find((f) => f.id === activeClinic.franchiseId) || mockFranchises[0]
  const availableClinics = mockClinics.filter((c) => c.franchiseId === activeFranchise.id)

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeClinic,
        activeFranchise,
        setActiveClinic: setActiveClinicId,
        clinics: availableClinics,
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
