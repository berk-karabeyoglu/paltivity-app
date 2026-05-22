import { useEffect, useMemo, useRef } from 'react'
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

type Toast = {
  title: string
  body: string
  type?: string
}

type Props = {
  toast: Toast | null
  onDismiss: () => void
  onPress?: () => void
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      top: TOP,
      left: 16,
      right: 16,
      zIndex: 9999,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 16,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    textArea: { flex: 1, gap: 2 },
    title: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
    body: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  })
}

const TOP = Platform.OS === 'ios' ? 54 : 16

export default function ToastNotification({ toast, onDismiss, onPress }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const translateY = useRef(new Animated.Value(-120)).current
  const opacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(onDismiss)
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy < -8,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy)
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -30) {
          dismiss()
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }).start()
        }
      },
    })
  ).current

  useEffect(() => {
    if (!toast) return
    translateY.setValue(-120)
    opacity.setValue(0)

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 70, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()

    timerRef.current = setTimeout(dismiss, 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [toast])

  if (!toast) return null

  const iconName =
    toast.type === 'event_joined'    ? 'person-add-outline' :
    toast.type === 'nearby_event'    ? 'location-outline' :
    toast.type === 'chat_message'    ? 'chatbubble-ellipses-outline' :
    toast.type === 'event_cancelled' ? 'close-circle-outline' :
    'notifications-outline'

  const iconColor =
    toast.type === 'event_joined'    ? colors.accent :
    toast.type === 'nearby_event'    ? '#93C5FD' :
    toast.type === 'chat_message'    ? '#34D399' :
    toast.type === 'event_cancelled' ? colors.error :
    colors.accent

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.card} onPress={() => { dismiss(); onPress?.() }} activeOpacity={0.95}>
        <View style={[styles.iconBox, { backgroundColor: iconColor + '22' }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{toast.body}</Text>
        </View>
        <Ionicons name="close" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  )
}
