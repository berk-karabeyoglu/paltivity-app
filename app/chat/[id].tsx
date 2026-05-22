import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Alert, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useUnread } from '../../lib/hooks/useUnreadNotifications'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

type Message = {
  id: string
  user_id: string
  content: string
  created_at: string
  profile: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
  } | null
}

const AVATAR_SIZE = 34

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },

    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.background, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    headerSub: { fontSize: 12, color: c.textSecondary, marginTop: 1, maxWidth: 200 },
    headerRight: { width: 36 },

    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingVertical: 16, paddingHorizontal: 16, gap: 2 },

    ownRow: { alignItems: 'flex-end', marginTop: 10 },
    ownBubble: {
      backgroundColor: c.accent, borderRadius: 18, borderBottomRightRadius: 4,
      paddingHorizontal: 14, paddingVertical: 10, maxWidth: '75%',
    },
    ownText: { color: '#fff', fontSize: 15, lineHeight: 21 },

    otherRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
    otherContent: { flex: 1, maxWidth: '75%' },
    otherBubble: {
      backgroundColor: c.surface, borderRadius: 18, borderBottomLeftRadius: 4,
      borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start',
    },
    otherText: { color: c.textPrimary, fontSize: 15, lineHeight: 21 },
    senderName: {
      fontSize: 11, fontWeight: '600', color: c.accent,
      marginBottom: 4, marginLeft: 2,
    },

    sameUserRow: { marginTop: 3 },
    avatarSlot: { width: AVATAR_SIZE, alignItems: 'center' },
    avatarSlotEmpty: { width: AVATAR_SIZE },
    avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 3 },
    avatarFallback: {
      backgroundColor: c.accent + '20',
      borderWidth: 1, borderColor: c.accent + '40',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 12, fontWeight: '700', color: c.accent },

    timeText: { fontSize: 10, color: c.textSecondary, marginTop: 3, marginHorizontal: 4 },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
    emptyEmoji: { fontSize: 48, marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    emptySub: { fontSize: 13, color: c.textSecondary },

    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      borderTopWidth: 1, borderTopColor: c.border,
      backgroundColor: c.background,
    },
    input: {
      flex: 1, backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 20, paddingHorizontal: 16,
      paddingTop: 10, paddingBottom: 10,
      fontSize: 15, color: c.textPrimary, maxHeight: 120,
    },
    sendBtn: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    },
    sendBtnOff: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  })
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { refresh: refreshUnread } = useUnread()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const listRef = useRef<FlatList>(null)
  // K5: Kullanıcı yukarı scroll yaptıysa yeni mesajda aşağı sürükleme
  const isAtBottom = useRef(true)

  // K3: Unmount sonrası setState çağrısını önle
  useEffect(() => {
    let mounted = true

    const fetchEventTitle = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('title')
        .eq('id', id)
        .single()
      if (mounted && data && !error) setEventTitle(data.title)
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profile:profiles!messages_user_id_fkey(username, full_name, avatar_url)')
        .eq('event_id', id)
        .order('created_at', { ascending: true })

      if (!mounted) return

      if (error) {
        Alert.alert('Hata', 'Mesajlar yüklenemedi.')
        setLoading(false)
        return
      }

      setMessages((data as Message[]) ?? [])
      setLoading(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50)
    }

    fetchEventTitle()
    fetchMessages()

    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `event_id=eq.${id}` },
        async (payload) => {
          if (!mounted) return
          const { data } = await supabase
            .from('messages')
            .select('*, profile:profiles!messages_user_id_fkey(username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data && mounted) {
            setMessages(prev => [...prev, data as Message])
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    const clearChatNotifications = async () => {
      if (!user) return
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('type', 'chat_message')
        .eq('payload->>event_id', id)
      refreshUnread()
    }
    clearChatNotifications()
  }, [user, id])

  const sendMessage = async () => {
    const content = text.trim()
    if (!content || sending || !user) return
    setSending(true)
    setText('')
    const { error } = await supabase
      .from('messages')
      .insert({ event_id: id, user_id: user.id, content })
    if (error) {
      setText(content)
      Alert.alert('Hata', 'Mesaj gönderilemedi.')
    }
    setSending(false)
  }

  // K5: Scroll pozisyonunu takip et
  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent
      isAtBottom.current =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 50
    },
    []
  )

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.user_id === user?.id
    const profile = item.profile
    const name = profile?.full_name ?? profile?.username ?? '?'
    const initials = name.slice(0, 2).toUpperCase()
    const time = new Date(item.created_at).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit',
    })
    const prev = messages[index - 1]
    const isFirst = !prev || prev.user_id !== item.user_id

    if (isOwn) {
      return (
        <View style={[styles.ownRow, !isFirst && styles.sameUserRow]}>
          <View style={styles.ownBubble}>
            <Text style={styles.ownText}>{item.content}</Text>
          </View>
          <Text style={styles.timeText}>{time}</Text>
        </View>
      )
    }

    return (
      <View style={[styles.otherRow, !isFirst && styles.sameUserRow]}>
        <View style={styles.avatarSlot}>
          {isFirst ? (
            profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )
          ) : (
            <View style={styles.avatarSlotEmpty} />
          )}
        </View>
        <View style={styles.otherContent}>
          {isFirst && <Text style={styles.senderName}>{name}</Text>}
          <View style={styles.otherBubble}>
            <Text style={styles.otherText}>{item.content}</Text>
          </View>
          <Text style={styles.timeText}>{time}</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Sohbet</Text>
          {eventTitle ? (
            <Text style={styles.headerSub} numberOfLines={1}>{eventTitle}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          // K5: Sadece kullanıcı alttaysa otomatik scroll
          onContentSizeChange={() => {
            if (isAtBottom.current) {
              listRef.current?.scrollToEnd({ animated: true })
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
              <Text style={styles.emptySub}>İlk mesajı sen gönder!</Text>
            </View>
          }
          renderItem={renderMessage}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Mesajını yaz..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnOff]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
