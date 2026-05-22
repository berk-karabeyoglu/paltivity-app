import { useState, useCallback, useMemo } from 'react'
import { useFocusEffect, router } from 'expo-router'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/hooks/useAuth'
import { useColors } from '../../../lib/hooks/useColors'
import { ColorTheme } from '../../../constants/colors'
import AvatarViewer from '../../../components/ui/AvatarViewer'

type Profile = {
  username: string
  full_name: string | null
  display_name: string | null
  bio: string | null
  gender: string | null
  avatar_url: string | null
  created_at: string
}

type EventItem = {
  id: string
  title: string
  starts_at: string
  status: string
  emoji: string | null
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 24, paddingBottom: 120 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 56,
      marginBottom: 32,
    },
    screenTitle: { fontSize: 28, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
    headerActions: { flexDirection: 'row', gap: 8 },
    iconButton: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: c.border,
    },
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarImage: {
      width: 80, height: 80, borderRadius: 28,
      borderWidth: 2, borderColor: c.accent + '60',
      marginBottom: 14,
    },
    avatar: {
      width: 80, height: 80, borderRadius: 28,
      backgroundColor: c.accent + '20',
      borderWidth: 2, borderColor: c.accent + '60',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 14,
    },
    avatarText: { fontSize: 28, fontWeight: '700', color: c.accent },
    displayName: { fontSize: 20, fontWeight: '700', color: c.textPrimary, marginBottom: 4 },
    bio: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 20, marginBottom: 32,
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    statNumber: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
    statNumberActive: { color: c.accent },
    statLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    statLabelActive: { color: c.accent, fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: c.border },
    section: { gap: 10 },
    emojiBox: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    emojiText: { fontSize: 20 },
    emptyState: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: c.textSecondary, fontSize: 14 },
    eventCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, padding: 14,
    },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary, marginBottom: 4 },
    eventDate: { fontSize: 12, color: c.textSecondary },
    statusBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8, backgroundColor: c.surface2,
    },
    statusActive: { backgroundColor: c.accent + '20' },
    statusCancelled: { backgroundColor: c.error + '20' },
    statusText: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
    statusTextActive: { color: c.accent },
    cardActions: { flexDirection: 'row', gap: 6, marginLeft: 6 },
    editButton: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    deleteButton: {
      width: 32, height: 32, borderRadius: 10,
      backgroundColor: c.error + '12', borderWidth: 1, borderColor: c.error + '30',
      alignItems: 'center', justifyContent: 'center',
    },
  })
}

function sortEvents(events: EventItem[]) {
  const now = Date.now()
  const isActive = (e: EventItem) =>
    e.status !== 'cancelled' &&
    new Date(e.starts_at).getTime() >= now - 3 * 60 * 60 * 1000
  return [...events].sort((a, b) => {
    const aA = isActive(a), bA = isActive(b)
    if (aA && !bA) return -1
    if (!aA && bA) return 1
    if (aA && bA) return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  })
}

export default function ProfileScreen() {
  const { user } = useAuth()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([])
  const [joinedEvents, setJoinedEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created')
  const [avatarVisible, setAvatarVisible] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!user) return
      let active = true

      ;(async () => {
        try {
          const [{ data: profileData }, { data: createdData }, { data: joinedData }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase
              .from('events')
              .select('id, title, starts_at, status, emoji')
              .eq('creator_id', user.id)
              .order('starts_at', { ascending: false })
              .limit(20),
            supabase
              .from('event_attendees')
              .select('event:events(id, title, starts_at, status, emoji)')
              .eq('user_id', user.id)
              .order('joined_at', { ascending: false })
              .limit(20),
          ])
          if (active) {
            setProfile(profileData)
            setCreatedEvents(sortEvents(createdData ?? []))
            setJoinedEvents(
              sortEvents((joinedData ?? []).map((a: any) => a.event).filter(Boolean))
            )
          }
        } catch (err: any) {
          Alert.alert('Hata', err.message)
        } finally {
          if (active) setLoading(false)
        }
      })()

      return () => { active = false }
    }, [user])
  )

  const handleDelete = (event: EventItem) => {
    Alert.alert(
      'Etkinliği Sil',
      `"${event.title}" etkinliğini silmek istiyor musun? Katılımcılara bildirim gönderilecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil', style: 'destructive', onPress: async () => {
            try {
              if (!user) return
              const { error } = await supabase.rpc('delete_event', {
                p_event_id: event.id,
                p_user_id: user.id,
              })
              if (error) throw error
              setCreatedEvents(prev => prev.filter(e => e.id !== event.id))
            } catch (err: any) {
              Alert.alert('Hata', err.message)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  const initials = (profile?.full_name ?? profile?.display_name ?? profile?.username ?? '?')
    .slice(0, 2)
    .toUpperCase()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Profil</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile/edit')} style={styles.iconButton}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconButton}>
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <AvatarViewer
        uri={profile?.avatar_url ?? null}
        initials={initials}
        visible={avatarVisible}
        onClose={() => setAvatarVisible(false)}
      />

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={() => setAvatarVisible(true)} activeOpacity={0.85}>
          {profile?.avatar_url ? (
            <Image key={profile.avatar_url} source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.displayName}>
          {profile?.full_name ?? profile?.display_name ?? profile?.username}
        </Text>
        {profile?.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('created')}>
          <Text style={[styles.statNumber, activeTab === 'created' && styles.statNumberActive]}>{createdEvents.length}</Text>
          <Text style={[styles.statLabel, activeTab === 'created' && styles.statLabelActive]}>Oluşturduğun</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('joined')}>
          <Text style={[styles.statNumber, activeTab === 'joined' && styles.statNumberActive]}>{joinedEvents.length}</Text>
          <Text style={[styles.statLabel, activeTab === 'joined' && styles.statLabelActive]}>Katıldığın</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        {(activeTab === 'created' ? createdEvents : joinedEvents).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {activeTab === 'created' ? 'Henüz event oluşturmadın' : 'Henüz bir evente katılmadın'}
            </Text>
          </View>
        ) : (
          (activeTab === 'created' ? createdEvents : joinedEvents).map(event => (
            <TouchableOpacity key={event.id} style={styles.eventCard} onPress={() => router.push(`/event/${event.id}`)}>
              <View style={styles.emojiBox}>
                <Text style={styles.emojiText}>{event.emoji ?? '📍'}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={styles.eventDate}>
                  {new Date(event.starts_at).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                event.status === 'active' && new Date(event.starts_at).getTime() >= Date.now() - 3 * 60 * 60 * 1000 && styles.statusActive,
                event.status === 'cancelled' && styles.statusCancelled,
              ]}>
                <Text style={[styles.statusText, event.status === 'active' && new Date(event.starts_at).getTime() >= Date.now() - 3 * 60 * 60 * 1000 && styles.statusTextActive]}>
                  {event.status === 'cancelled' ? 'İptal' : new Date(event.starts_at).getTime() < Date.now() - 3 * 60 * 60 * 1000 ? 'Bitti' : 'Aktif'}
                </Text>
              </View>
              {activeTab === 'created' && (
                <View style={styles.cardActions}>
                  {new Date(event.starts_at).getTime() >= Date.now() - 3 * 60 * 60 * 1000 && event.status === 'active' && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={(e) => { e.stopPropagation(); router.push(`/event/edit/${event.id}`) }}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => { e.stopPropagation(); handleDelete(event) }}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}
