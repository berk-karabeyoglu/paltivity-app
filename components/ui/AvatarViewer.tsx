import { useEffect, useMemo, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet, Animated, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

const { width } = Dimensions.get('window')
const SIZE = width - 64

type Props = {
  uri: string | null
  initials: string
  visible: boolean
  onClose: () => void
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: { ...StyleSheet.absoluteFillObject },
    content: {
      width: SIZE, height: SIZE, borderRadius: 28,
      overflow: 'hidden', borderWidth: 2,
      borderColor: c.accent + '40',
    },
    image: { width: '100%', height: '100%' },
    fallback: {
      flex: 1, backgroundColor: c.accent + '20',
      alignItems: 'center', justifyContent: 'center',
    },
    initials: { fontSize: SIZE * 0.3, fontWeight: '700', color: c.accent },
    closeBtn: {
      position: 'absolute', top: 56, right: 20,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center', justifyContent: 'center',
    },
  })
}

export default function AvatarViewer({ uri, initials, visible, onClose }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const scaleAnim = useRef(new Animated.Value(0.85)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    } else {
      scaleAnim.setValue(0.85)
      opacityAnim.setValue(0)
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          {uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.fallback}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </Animated.View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  )
}
