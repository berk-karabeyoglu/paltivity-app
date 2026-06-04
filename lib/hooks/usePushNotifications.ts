import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../supabase'

// Uygulama ön planda iken sistem bildirimi gösterme
// (gerçek zamanlı toast zaten gösteriyor)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
})

export function usePushNotifications(userId: string | undefined) {
  // Token kayıt
  useEffect(() => {
    if (!userId) return

    let active = true

    const register = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync()
        let status = existing

        if (existing !== 'granted') {
          const { status: asked } = await Notifications.requestPermissionsAsync()
          status = asked
        }

        if (status !== 'granted') return

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Paltivity',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#396afc',
          })
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
        const { data: token } = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        )

        if (!active || !token) return

        await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId)
      } catch {
        // Sessizce devam et — push notifications opsiyonel
      }
    }

    register()
    return () => { active = false }
  }, [userId])

  // Bildirime tıklanınca navigasyon
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        type?: string
        event_id?: string | null
        screen?: string | null
      }

      if (!data) return

      if (data.type === 'event_kicked') {
        router.replace('/(tabs)/map')
        return
      }

      if (data.screen) {
        router.push(data.screen as any)
      }
    })

    return () => sub.remove()
  }, [])
}
