import { useRef, memo, useState, useEffect } from 'react'
import { View, Text, Animated, Platform } from 'react-native'
import { Marker } from 'react-native-maps'
import { Event } from '../../lib/hooks/useEvents'
import { useColors } from '../../lib/hooks/useColors'

type Props = {
  event: Event
  onSelect: (event: Event) => void
}

function EventMarker({ event, onSelect }: Props) {
  const colors = useColors()
  const emoji = event.emoji ?? '📍'
  const [tracksViewChanges, setTracksViewChanges] = useState(true)
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), 500)
    return () => clearTimeout(t)
  }, [])

  const handlePress = () => {
    onSelect(event)
    if (Platform.OS === 'ios') {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start()
    }
  }

  if (Platform.OS === 'android') {
    return (
      <Marker
        identifier={event.id}
        coordinate={{ latitude: event.latitude, longitude: event.longitude }}
        anchor={{ x: 0.5, y: 0.5 }}
        onPress={handlePress}
        tracksViewChanges={tracksViewChanges}
      >
        <View collapsable={false} style={{ alignItems: 'center' }}>
          <Text style={{
            fontSize: 36,
            includeFontPadding: false,
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}>
            {emoji}
          </Text>
          <View style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: colors.accent,
            marginTop: 2,
          }} />
        </View>
      </Marker>
    )
  }

  return (
    <Marker
      identifier={event.id}
      coordinate={{ latitude: event.latitude, longitude: event.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={handlePress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={{ alignItems: 'center', width: 64 }}>
        <View style={{ width: 48, height: 48 }}>
          <Animated.View style={{
            position: 'absolute',
            top: -8, left: -8,
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.accent + '35',
            opacity: glowAnim,
          }} />
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: colors.surface,
            borderWidth: 2, borderColor: colors.accent,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35, shadowRadius: 8,
          }}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>
        </View>
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: colors.accent,
          marginTop: -1,
        }} />
      </View>
    </Marker>
  )
}

export default memo(EventMarker)
