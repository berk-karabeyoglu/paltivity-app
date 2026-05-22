import { createContext, useContext } from 'react'
import { Session, User } from '@supabase/supabase-js'

export type AuthState = {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName: string,
    gender: string | null,
  ) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
