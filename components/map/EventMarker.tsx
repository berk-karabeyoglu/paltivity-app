import { useRef, memo, useMemo } from 'react'
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native'
import { Marker } from 'react-native-maps'
import { Event } from '../../lib/hooks/useEvents'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

type Props = {
  event: Event
  onSelect: (event: Event) => void
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    wrapper: { alignItems: 'center', width: 60, height: 68 },
    // iOS: tek view + borderWidth
    pin: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: c.surface,
      borderWidth: 2, borderColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35, shadowRadius: 8,
    },
    // Android: nested circle — borderWidth cliplanıyor
    pinOuter: {
      width: 52, height: 52, borderRadius: 26,
      backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    pinInner: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    emoji: { fontSize: 24 },
    tip: {
      width: 0, height: 0,
      borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderTopColor: c.accent,
      marginTop: -1,
    },
  })
}

function EventMarker({ event, onSelect }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const emoji = event.emoji ?? '📍'
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePress = () => {
    onSelect(event)
    scaleAnim.setValue(1)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.8,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start()
  }

  return (
    <Marker
      identifier={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={handlePress}
      tracksViewChanges
    >
      <View style={styles.wrapper}>
        {Platform.OS === 'ios' ? (
          <View style={styles.pin}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.pinOuter}>
            <View style={styles.pinInner}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Animated.View>
            </View>
          </View>
        )}
        <View style={styles.tip} />
      </View>
    </Marker>
  )
}

export default memo(EventMarker)
