import { useState, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useUnread } from '../../lib/hooks/useUnreadNotifications'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

type Notification = {
  id: string
  type: string
  payload: { title: string; body: string; event_id?: string }
  is_read: boolean
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa önce`
  return `${Math.floor(hours / 24)} gün önce`
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    },
    title: { fontSize: 26, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
    badge: {
      backgroundColor: c.accent, borderRadius: 99,
      paddingHorizontal: 8, paddingVertical: 2,
    },
    badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    list: { paddingHorizontal: 16, paddingBottom: 120, gap: 8 },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 14,
    },
    cardUnread: { borderColor: c.accent + '40', backgroundColor: c.accent + '08' },
    iconBox: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    cardBody: { flex: 1, gap: 2 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    cardText: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    cardTime: { fontSize: 11, color: c.textSecondary, marginTop: 4 },
    dot: {
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.accent, flexShrink: 0,
    },
    trashBtn: {
      padding: 4,
      marginLeft: 4,
      flexShrink: 0,
    },
    empty: {
      flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  })
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const { refresh: refreshUnread } = useUnread()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const ICON_CONFIG: Record<string, { icon: any; color: string }> = {
    event_joined:    { icon: 'person-add-outline',          color: colors.accent },
    nearby_event:    { icon: 'location-outline',             color: '#93C5FD' },
    chat_message:    { icon: 'chatbubble-ellipses-outline',  color: '#34D399' },
    event_cancelled: { icon: 'close-circle-outline',         color: colors.error },
    join_request:    { icon: 'time-outline',                 color: '#F59E0B' },
    join_approved:   { icon: 'checkmark-circle-outline',    color: '#34D399' },
    join_rejected:   { icon: 'close-circle-outline',         color: colors.error },
    event_left:      { icon: 'exit-outline',                 color: colors.textSecondary },
    event_kicked:    { icon: 'ban-outline',                  color: colors.error },
  }

  const fetchNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data ?? [])
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    refreshUnread()
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      fetchNotifications().finally(() => setLoading(false))
      markAllRead()
    }, [user])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchNotifications()
    setRefreshing(false)
  }

  const handlePress = async (notif: Notification) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      refreshUnread()
    }
    const eventId = notif.payload?.event_id
    if (!eventId) return
    if (notif.type === 'chat_message') {
      router.push(`/chat/${eventId}`)
    } else {
      router.push(`/event/${eventId}`)
    }
  }

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
    refreshUnread()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bildirimler</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
          <Text style={styles.emptySubtitle}>Eventlerine birisi katıldığında burada görürsün</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          renderItem={({ item }) => {
            const cfg = ICON_CONFIG[item.type] ?? { icon: 'notifications-outline', color: colors.accent }
            return (
              <TouchableOpacity
                style={[styles.card, !item.is_read && styles.cardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: cfg.color + '18' }]}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.payload?.title}</Text>
                  <Text style={styles.cardText} numberOfLines={2}>{item.payload?.body}</Text>
                  <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => handleDelete(item.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
