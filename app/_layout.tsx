import { useEffect, useState, useCallback } from 'react'
import { Stack, router } from 'expo-router'
import * as Linking from 'expo-linking'
import { useAuth } from '../lib/hooks/useAuth'
import { AuthProvider } from '../lib/providers/AuthProvider'
import { ThemeProvider } from '../lib/providers/ThemeProvider'
import { useColors } from '../lib/hooks/useColors'
import { useTheme } from '../lib/providers/ThemeProvider'
import { supabase } from '../lib/supabase'
import { ActivityIndicator, View, Platform } from 'react-native'
import { UnreadContext } from '../lib/hooks/useUnreadNotifications'
import ToastNotification from '../components/ui/ToastNotification'
import * as NavigationBar from 'expo-navigation-bar'

type Toast = { title: string; body: string; type?: string; eventId?: string } | null

// İç bileşen: AuthContext + ThemeContext'e erişebilir (K1 fix)
function RootLayoutInner() {
  const { session, loading } = useAuth()
  const colors = useColors()
  const { theme } = useTheme()
  const [unreadCount, setUnreadCount] = useState(0)
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    if (Platform.OS !== 'android') return
    NavigationBar.setVisibilityAsync('hidden')
  }, [])

  const refresh = useCallback(async () => {
    if (!session?.user) return
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }, [session?.user?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // O8: Channel adı user ID içeriyor — logout/login arası çakışma önlenir
  useEffect(() => {
    if (!session?.user) return
    const channel = supabase
      .channel(`notifications:${session.user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, async (payload) => {
        refresh()
        const row = payload.new as { payload?: { title?: string; body?: string; event_id?: string }; type?: string }
        if (row?.payload?.title) {
          setToast({
            title: row.payload.title,
            body: row.payload.body ?? '',
            type: row.type,
            eventId: row.payload.event_id,
          })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session?.user?.id])

  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (url.includes('code=')) {
        await supabase.auth.exchangeCodeForSession(url)
      }
    }

    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url)
    })

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (loading) return
    if (session) {
      router.replace('/(tabs)/map')
    } else {
      router.replace('/(auth)/login')
    }
  }, [session, loading])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <UnreadContext.Provider value={{ unreadCount, refresh }}>
      <ToastNotification
        toast={toast}
        onDismiss={() => setToast(null)}
        onPress={
          toast?.eventId
            ? () => {
                setToast(null)
                if (toast.type === 'chat_message') {
                  router.push(`/chat/${toast.eventId}`)
                } else {
                  router.push(`/event/${toast.eventId}`)
                }
              }
            : undefined
        }
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="event/edit/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="index" />
      </Stack>
    </UnreadContext.Provider>
  )
}

// Dış bileşen: ThemeProvider + AuthProvider sağlar
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </ThemeProvider>
  )
}
