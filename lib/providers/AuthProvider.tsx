import { useEffect, useState, useCallback } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import { AuthContext } from '../hooks/useAuth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    fullName: string,
    gender: string | null,
  ) => {
    // Kullanıcı adı benzersizlik kontrolü
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existing) throw new Error('Bu kullanıcı adı zaten kullanılıyor.')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username, full_name: fullName, gender })
        .eq('id', data.user.id)

      if (profileError) {
        // Profil güncellenemedi — session'ı temizle, kullanıcı tekrar denesin
        await supabase.auth.signOut()
        throw new Error('Profil oluşturulamadı. Lütfen tekrar dene.')
      }
    }

    return data
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
