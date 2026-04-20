import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: any
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        if (pb.authStore.isValid) {
          // Verify session validity with backend
          await pb.collection('users').authRefresh()
        } else {
          pb.authStore.clear()
        }
      } catch (error) {
        // If the token is invalid or expired, clear the auth store
        pb.authStore.clear()
      } finally {
        if (isMounted) {
          setUser(pb.authStore.isValid ? pb.authStore.record : null)
          setLoading(false)
        }
      }
    }

    initAuth()

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      await pb
        .collection('users')
        .create({ email, password, passwordConfirm: password, status: 'pending' })
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      try {
        await pb.send('/backend/v1/auth/failed', {
          method: 'POST',
          body: JSON.stringify({ email }),
        })
      } catch (_) {
        // ignore error
      }
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
