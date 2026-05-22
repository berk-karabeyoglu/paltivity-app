import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
  Animated, Easing, Modal, FlatList, Image,
} from 'react-native'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import { consumeEventRefresh } from '../../lib/eventRefreshSignal'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'
import { useConfetti } from '../../lib/hooks/useConfetti'

type EventDetail = {
  id: string
  title: string
  description: string | null
  address: string | null
  starts_at: string
  ends_at: string | null
  max_attendees: number | null
  creator_id: string
  category_id: number | null
  status: string
  profiles: { username: string; display_name: string | null }
  attendee_count: number
  is_attending: boolean
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    content: { padding: 24, paddingBottom: 120 },
    back: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 56, marginBottom: 28 },
    backLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backText: { color: c.accent, fontSize: 16 },
    editBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 26, fontWeight: '800', color: c.textPrimary, marginBottom: 20, letterSpacing: -0.5 },
    metaCard: {
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 16, marginBottom: 24,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    metaText: { color: c.textSecondary, fontSize: 14, flex: 1 },
    metaLink: { color: c.accent },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary, marginBottom: 10 },
    description: { fontSize: 15, color: c.textSecondary, lineHeight: 24 },
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: 24, paddingBottom: 40,
      backgroundColor: c.background,
      borderTopWidth: 1, borderTopColor: c.border,
    },
    joinButton: {
      backgroundColor: c.accent, borderRadius: 14,
      padding: 16, alignItems: 'center', width: '100%',
    },
    leaveButton: { backgroundColor: c.error },
    joinWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', width: '100%' },
    joinedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
    fullButton: { backgroundColor: c.surface2 },
    joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', zIndex: 1 },
    creatorBadge: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: c.surface, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: c.accentSecondary + '40',
    },
    creatorText: { color: c.accentSecondary, fontWeight: '600', fontSize: 15 },
    chatBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.accent + '12',
      borderWidth: 1, borderColor: c.accent + '35',
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
      marginBottom: 10,
    },
    chatBtnText: { flex: 1, color: c.accent, fontWeight: '600', fontSize: 15 },
    notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
    notFoundEmoji: { fontSize: 52, marginBottom: 8 },
    notFoundTitle: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
    notFoundSub: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
    notFoundBtn: {
      marginTop: 16, backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
    },
    notFoundBtnText: { color: c.accent, fontWeight: '600', fontSize: 15 },
    endedBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 14, padding: 16,
    },
    endedText: { flex: 1, color: c.textSecondary, fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalSheet: {
      backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 48, maxHeight: '70%',
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2, backgroundColor: c.border,
      alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    attendeeList: { paddingHorizontal: 16, paddingTop: 8 },
    attendeeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border + '60',
    },
    attendeeAvatar: { width: 40, height: 40, borderRadius: 12 },
    attendeeAvatarFallback: {
      backgroundColor: c.accent + '20', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: c.accent + '40',
    },
    attendeeInitials: { fontSize: 14, fontWeight: '700', color: c.accent },
    attendeeInfo: { flex: 1 },
    attendeeName: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    attendeeUsername: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    ownerBadge: {
      backgroundColor: c.accentSecondary + '20', borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: c.accentSecondary + '40',
    },
    ownerBadgeText: { fontSize: 11, fontWeight: '600', color: c.accentSecondary },
  })
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinPhase, setJoinPhase] = useState<'idle' | 'filling' | 'success' | 'done'>('idle')
  const progressAnim = useRef(new Animated.Value(0)).current
  const successOpacity = useRef(new Animated.Value(0)).current
  const buttonWidthRef = useRef(0)
  const [showAttendees, setShowAttendees] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const { particles, fire } = useConfetti()

  const fetchEvent = useCallback(async (mounted: { current: boolean }) => {
      if (!user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`*, profiles:creator_id (username, display_name)`)
          .eq('id', id)
          .single()
        if (error) throw error

        const { count: attendeeCount } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id)
          .eq('status', 'joined')

        const { data: myAttendance } = await supabase
          .from('event_attendees')
          .select('status')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!mounted.current) return
        setEvent({
          ...data,
          attendee_count: attendeeCount ?? 0,
          is_attending: myAttendance?.status === 'joined',
        })
      } catch (err: any) {
        if (!mounted.current) return
        if (!err.message?.includes('JSON') && !err.code?.includes('PGRST116')) {
          Alert.alert('Hata', err.message)
        }
      } finally {
        if (mounted.current) setLoading(false)
      }
  }, [id, user])

  // İlk yükleme
  useEffect(() => {
      const mounted = { current: true }
      fetchEvent(mounted)
      return () => { mounted.current = false }
  }, [fetchEvent])

  // Edit'ten dönünce refresh sinyali varsa yenile
  useFocusEffect(useCallback(() => {
      if (!consumeEventRefresh()) return
      const mounted = { current: true }
      fetchEvent(mounted)
      return () => { mounted.current = false }
  }, [fetchEvent]))


  const handleJoin = async () => {
    if (!event || joinPhase !== 'idle' || !user) return

    if (event.is_attending) {
      Alert.alert('Ayrıl', '"' + event.title + '" eventinden ayrılmak istiyor musun?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ayrıl', style: 'destructive', onPress: doLeave },
      ])
      return
    }

    setJoinPhase('filling')
    progressAnim.setValue(0)
    successOpacity.setValue(0)

    const animPromise = new Promise<void>(resolve => {
      Animated.timing(progressAnim, {
        toValue: buttonWidthRef.current, duration: 900,
        easing: Easing.inOut(Easing.quad), useNativeDriver: false,
      }).start(() => resolve())
    })

    try {
      const { error } = await supabase.rpc('join_event', {
        p_event_id: id,
        p_user_id: user.id,
      })
      if (error) throw error

      setEvent(prev => prev ? { ...prev, is_attending: true, attendee_count: prev.attendee_count + 1 } : prev)

      await animPromise

      setJoinPhase('success')
      fire()
      Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start()
      setTimeout(() => {
        progressAnim.setValue(0)
        setJoinPhase('idle')
      }, 2000)
    } catch (err: any) {
      progressAnim.setValue(0)
      setJoinPhase('idle')
      Alert.alert('Hata', err.message)
    }
  }

  // K3: Unmount guard — modal kapatılıp ekrandan çıkılırsa setState çağrılmaz
  const openAttendees = async () => {
    let mounted = true
    setAttendees([])
    setShowAttendees(true)
    setAttendeesLoading(true)
    const { data } = await supabase
      .from('event_attendees')
      .select('user_id, profiles:user_id(full_name, username, avatar_url)')
      .eq('event_id', id)
      .eq('status', 'joined')
    if (!mounted) return
    setAttendees(data ?? [])
    setAttendeesLoading(false)
    return () => { mounted = false }
  }

  const doLeave = async () => {
    if (!user) return
    setJoining(true)
    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'left' })
        .eq('event_id', id)
        .eq('user_id', user.id)
      if (error) throw error
      setEvent(prev => prev ? { ...prev, is_attending: false, attendee_count: Math.max(0, prev.attendee_count - 1) } : prev)
    } catch (err: any) {
      Alert.alert('Hata', err.message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundEmoji}>🗑️</Text>
          <Text style={styles.notFoundTitle}>Bu etkinlik silindi</Text>
          <Text style={styles.notFoundSub}>Oluşturan kişi tarafından kaldırılmış olabilir.</Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.back()}>
            <Text style={styles.notFoundBtnText}>Geri dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const isCreator = event.creator_id === user?.id
  const isFull = event.max_attendees !== null && event.attendee_count >= event.max_attendees
  const isEnded = event.status !== 'active' ||
    new Date(event.starts_at).getTime() < Date.now() - 3 * 60 * 60 * 1000
  const formattedDate = new Date(event.starts_at).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const sortedAttendees = [...attendees].sort((a, b) => {
    if (a.user_id === event.creator_id) return -1
    if (b.user_id === event.creator_id) return 1
    return 0
  })

  return (
    <View style={styles.container}>
      <Modal visible={showAttendees} transparent animationType="slide" onRequestClose={() => setShowAttendees(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttendees(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{event.attendee_count} Katılımcı</Text>
              <TouchableOpacity onPress={() => setShowAttendees(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {attendeesLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
            ) : sortedAttendees.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>Henüz katılımcı yok</Text>
                {!isCreator && <Text style={{ color: colors.textSecondary, fontSize: 13 }}>İlk katılan sen ol!</Text>}
              </View>
            ) : (
              <FlatList
                data={sortedAttendees}
                keyExtractor={a => a.user_id}
                contentContainerStyle={styles.attendeeList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const profile = item.profiles
                  const isOwner = item.user_id === event.creator_id
                  const name = profile?.full_name ?? profile?.username ?? 'Kullanıcı'
                  const initials = name.slice(0, 2).toUpperCase()
                  return (
                    <TouchableOpacity
                      style={styles.attendeeRow}
                      onPress={() => { setShowAttendees(false); router.push(`/user/${item.user_id}`) }}
                      activeOpacity={0.7}
                    >
                      {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.attendeeAvatar} />
                      ) : (
                        <View style={[styles.attendeeAvatar, styles.attendeeAvatarFallback]}>
                          <Text style={styles.attendeeInitials}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.attendeeInfo}>
                        <Text style={styles.attendeeName}>{name}</Text>
                        {profile?.username && (
                          <Text style={styles.attendeeUsername}>@{profile.username}</Text>
                        )}
                      </View>
                      {isOwner && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>Oluşturan</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={14} color={colors.border} />
                    </TouchableOpacity>
                  )
                }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.back}>
          <TouchableOpacity style={styles.backLeft} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
            <Text style={styles.backText}>Geri</Text>
          </TouchableOpacity>
          {isCreator && !isEnded && (
            <TouchableOpacity style={styles.editBtn} onPress={() => router.push(`/event/edit/${id}`)}>
              <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.metaCard}>
          <TouchableOpacity
            style={styles.metaRow}
            onPress={() => router.push(`/user/${event.creator_id}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.metaText, styles.metaLink]}>
              {event.profiles?.display_name ?? event.profiles?.username}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.border} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>
          {event.address && (
            <>
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{event.address}</Text>
              </View>
            </>
          )}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.metaRow} onPress={openAttendees}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {event.attendee_count} katılımcı
              {event.max_attendees ? ` · ${event.max_attendees} max` : ''}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.border} />
          </TouchableOpacity>
        </View>

        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hakkında</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isEnded ? (
          <View style={styles.endedBanner}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.endedText}>Bu etkinlik sona erdi</Text>
          </View>
        ) : (
          <>
            {(isCreator || event.is_attending) && event.attendee_count > 0 && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => router.push(`/chat/${id}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.accent} />
                <Text style={styles.chatBtnText}>Etkinlik Sohbeti</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </TouchableOpacity>
            )}
            {isCreator ? (
              <View style={styles.creatorBadge}>
                <Ionicons name="checkmark-circle" size={18} color={colors.accentSecondary} />
                <Text style={styles.creatorText}>Bu eventi sen oluşturdun</Text>
              </View>
            ) : (
              <View style={styles.joinWrapper}>
                {particles.map((p, i) => (
                  <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      width: p.size, height: p.size,
                      borderRadius: p.size / 4,
                      backgroundColor: p.color,
                      alignSelf: 'center',
                      top: '50%', left: '50%',
                      opacity: p.opacity,
                      transform: [
                        { translateX: p.x }, { translateY: p.y }, { scale: p.scale },
                        { rotate: p.rotate.interpolate({ inputRange: [-6, 6], outputRange: ['-360deg', '360deg'] }) },
                      ],
                    }}
                  />
                ))}
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    event.is_attending && joinPhase === 'idle' && styles.leaveButton,
                    isFull && !event.is_attending && styles.fullButton,
                    { overflow: 'hidden' },
                  ]}
                  onPress={handleJoin}
                  onLayout={e => { buttonWidthRef.current = e.nativeEvent.layout.width }}
                  disabled={joining || joinPhase !== 'idle' || (isFull && !event.is_attending)}
                  activeOpacity={0.9}
                >
                  {(joinPhase === 'filling' || joinPhase === 'success') && (
                    <Animated.View
                      style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        backgroundColor: colors.accentSecondary,
                        width: progressAnim,
                      }}
                    />
                  )}
                  {joining ? (
                    <ActivityIndicator color="#fff" />
                  ) : joinPhase === 'success' ? (
                    <Animated.View style={[styles.joinedRow, { opacity: successOpacity }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.joinButtonText}>Katıldın!</Text>
                    </Animated.View>
                  ) : joinPhase === 'filling' ? (
                    <Text style={styles.joinButtonText}>Katıl</Text>
                  ) : (
                    <Text style={styles.joinButtonText}>
                      {isFull && !event.is_attending ? 'Kapasite Dolu' : event.is_attending ? 'Ayrıl' : 'Katıl'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  )
}
