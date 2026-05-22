import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'
import { CATEGORIES } from '../../constants/categories'
import AvatarViewer from '../../components/ui/AvatarViewer'

type Profile = {
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  is_private: boolean
}

type EventItem = {
  id: string
  title: string
  starts_at: string
  status: string
  emoji: string | null
  category_id: number | null
}

type Tab = 'created' | 'joined'

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.background, gap: 12,
    },
    backRow: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
    },
    backText: { color: c.accent, fontSize: 16 },
    content: { paddingHorizontal: 24, paddingBottom: 120 },
    avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 6 },
    avatarImage: {
      width: 88, height: 88, borderRadius: 28,
      borderWidth: 2, borderColor: c.accent + '60', marginBottom: 8,
    },
    avatar: {
      width: 88, height: 88, borderRadius: 28,
      backgroundColor: c.accent + '20',
      borderWidth: 2, borderColor: c.accent + '60',
      alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    avatarText: { fontSize: 30, fontWeight: '700', color: c.accent },
    displayName: { fontSize: 22, fontWeight: '700', color: c.textPrimary },
    username: { fontSize: 14, color: c.textSecondary },
    bio: {
      fontSize: 14, color: c.textSecondary,
      textAlign: 'center', lineHeight: 20, marginTop: 4,
      paddingHorizontal: 24,
    },
    joined: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 20, marginBottom: 24,
    },
    statItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    statNumber: { fontSize: 22, fontWeight: '800', color: c.textPrimary },
    statNumberActive: { color: c.accent },
    statLabel: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    statLabelActive: { color: c.accent, fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: c.border },
    section: { gap: 10 },
    eventCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, padding: 14, gap: 12,
    },
    emojiBox: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    emojiText: { fontSize: 20 },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary, marginBottom: 3 },
    eventDate: { fontSize: 12, color: c.textSecondary },
    statusBadge: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 8, backgroundColor: c.surface2,
    },
    statusActive: { backgroundColor: c.accent + '20' },
    statusCancelled: { backgroundColor: c.error + '20' },
    statusText: { fontSize: 11, fontWeight: '600', color: c.textSecondary },
    statusTextActive: { color: c.accent },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { color: c.textSecondary, fontSize: 14 },
    categoriesRow: {
      flexDirection: 'row', gap: 8, justifyContent: 'center',
      marginBottom: 20, flexWrap: 'wrap',
    },
    categoryChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    },
    categoryChipIcon: { fontSize: 14 },
    categoryChipName: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    privateBox: {
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 48, gap: 10,
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
    },
    privateTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    privateSub: { fontSize: 13, color: c.textSecondary },
    notFoundEmoji: { fontSize: 48 },
    notFoundTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
    backBtn: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    backBtnText: { color: c.accent, fontWeight: '600', fontSize: 15 },
  })
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([])
  const [joinedEvents, setJoinedEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('created')
  const [avatarVisible, setAvatarVisible] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const [
          { data: profileData, error },
          { data: createdData },
          { data: joinedData },
        ] = await Promise.all([
          supabase
            .from('profiles')
            .select('username, full_name, bio, avatar_url, created_at, is_private')
            .eq('id', id)
            .single(),
          supabase
            .from('events')
            .select('id, title, starts_at, status, emoji, category_id')
            .eq('creator_id', id)
            .order('starts_at', { ascending: false })
            .limit(20),
          supabase
            .from('event_attendees')
            .select('event:events(id, title, starts_at, status, emoji, category_id)')
            .eq('user_id', id)
            .eq('status', 'joined')
            .order('joined_at', { ascending: false })
            .limit(20),
        ])
        if (error) { setNotFound(true); return }
        setProfile(profileData)
        setCreatedEvents(createdData ?? [])
        setJoinedEvents((joinedData ?? []).map((a: any) => a.event).filter(Boolean))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (notFound || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundEmoji}>👤</Text>
        <Text style={styles.notFoundTitle}>Kullanıcı bulunamadı</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const initials = (profile.full_name ?? profile.username ?? '?').slice(0, 2).toUpperCase()

  const topCategories = (() => {
    const counts: Record<number, number> = {}
    ;[...createdEvents, ...joinedEvents].forEach(e => {
      if (e.category_id) counts[e.category_id] = (counts[e.category_id] ?? 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([catId]) => CATEGORIES.find(c => c.id === Number(catId)))
      .filter(Boolean)
  })()
  const joinedYear = new Date(profile.created_at).getFullYear()
  const tabEvents = activeTab === 'created' ? createdEvents : joinedEvents

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color={colors.accent} />
        <Text style={styles.backText}>Geri</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AvatarViewer
          uri={profile.avatar_url}
          initials={initials}
          visible={avatarVisible}
          onClose={() => setAvatarVisible(false)}
        />

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setAvatarVisible(true)} activeOpacity={0.85}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.displayName}>{profile.full_name ?? profile.username}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <Text style={styles.joined}>{joinedYear}'den beri üye</Text>
        </View>

        {!profile.is_private && topCategories.length > 0 && (
          <View style={styles.categoriesRow}>
            {topCategories.map(cat => (
              <View key={cat!.id} style={styles.categoryChip}>
                <Text style={styles.categoryChipIcon}>{cat!.icon}</Text>
                <Text style={styles.categoryChipName}>{cat!.name}</Text>
              </View>
            ))}
          </View>
        )}

        {profile.is_private ? (
          <View style={styles.privateBox}>
            <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
            <Text style={styles.privateTitle}>Bu profil gizli</Text>
            <Text style={styles.privateSub}>Bu kullanıcı profilini gizlemiş.</Text>
          </View>
        ) : (<>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('created')}>
            <Text style={[styles.statNumber, activeTab === 'created' && styles.statNumberActive]}>
              {createdEvents.length}
            </Text>
            <Text style={[styles.statLabel, activeTab === 'created' && styles.statLabelActive]}>
              Oluşturduğu
            </Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => setActiveTab('joined')}>
            <Text style={[styles.statNumber, activeTab === 'joined' && styles.statNumberActive]}>
              {joinedEvents.length}
            </Text>
            <Text style={[styles.statLabel, activeTab === 'joined' && styles.statLabelActive]}>
              Katıldığı
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          {tabEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeTab === 'created' ? 'Henüz event oluşturmamış' : 'Henüz bir evente katılmamış'}
              </Text>
            </View>
          ) : (
            tabEvents.map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
              >
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
                  event.status === 'active' && styles.statusActive,
                  event.status === 'cancelled' && styles.statusCancelled,
                ]}>
                  <Text style={[styles.statusText, event.status === 'active' && styles.statusTextActive]}>
                    {event.status === 'active' ? 'Aktif' : event.status === 'cancelled' ? 'İptal' : 'Bitti'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        </>)}
      </ScrollView>
    </View>
  )
}
