import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  StyleSheet, View, ActivityIndicator, Text,
  TouchableOpacity, Animated, Easing, Platform,
} from 'react-native'
import MapView, { Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import EventMarker from '../../components/map/EventMarker'
import { useEvents, Event } from '../../lib/hooks/useEvents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useColors } from '../../lib/hooks/useColors'
import { useTheme } from '../../lib/providers/ThemeProvider'
import { ColorTheme } from '../../constants/colors'
import { CATEGORIES } from '../../constants/categories'

const DEFAULT_REGION: Region = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 34 + 68 + 16 : 16 + 68 + 16

// Android / Google Maps için dark style
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e2d4a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#1e2d4a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e2d4a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1117' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#172033' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243352' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#111827' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1929' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#1e2d4a' }] },
]

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },

    card: {
      position: 'absolute',
      left: 12,
      right: 12,
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 10,
      gap: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 16,
    },
    handle: {
      alignSelf: 'center',
      width: 36, height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      marginBottom: 2,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    emojiWrap: {
      width: 52, height: 52, borderRadius: 16,
      backgroundColor: c.accent + '18',
      borderWidth: 1, borderColor: c.accent + '30',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    emojiText: { fontSize: 26 },
    info: { flex: 1, gap: 5, paddingTop: 2 },
    title: {
      fontSize: 15, fontWeight: '700',
      color: c.textPrimary, lineHeight: 21,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: c.accent, fontWeight: '600' },
    metaAddress: { fontSize: 12, color: c.textSecondary, flex: 1 },
    closeBtn: {
      width: 28, height: 28, borderRadius: 9,
      backgroundColor: c.background,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.background,
      borderWidth: 1, borderColor: c.border,
      borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    },
    chipText: { fontSize: 12, color: c.textSecondary, fontWeight: '500' },
    cta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: c.accent,
      borderRadius: 14, paddingVertical: 13,
    },
    ctaText: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    locateBtn: {
      position: 'absolute',
      right: 16,
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 10,
      elevation: 8,
    },
  })
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null)
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [locationReady, setLocationReady] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [locating, setLocating] = useState(false)
  const slideAnim = useRef(new Animated.Value(200)).current
  const markerJustPressed = useRef(false)
  const userCoords = useRef<{ latitude: number; longitude: number } | null>(null)
  const { events, refetch } = useEvents(region.latitude, region.longitude)

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [])
  )
  const { user } = useAuth()
  const colors = useColors()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { setLocationReady(true); return }
      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords
      userCoords.current = { latitude, longitude }
      setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 })
      setLocationReady(true)
      if (user) {
        await supabase.from('profiles').update({ last_lat: latitude, last_lng: longitude }).eq('id', user.id)
      }
    })()
  }, [user])

  const handleLocateMe = useCallback(async () => {
    if (locating) return
    if (userCoords.current) {
      mapRef.current?.animateToRegion(
        { ...userCoords.current, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      )
      return
    }
    setLocating(true)
    try {
      const location = await Location.getCurrentPositionAsync({})
      const { latitude, longitude } = location.coords
      userCoords.current = { latitude, longitude }
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      )
    } finally {
      setLocating(false)
    }
  }, [locating])

  const openCard = (event: Event) => {
    setSelectedEvent(event)
    slideAnim.stopAnimation()
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }

  const closeCard = () => {
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setSelectedEvent(null))
  }

  const handleSelect = useCallback((event: Event) => {
    markerJustPressed.current = true
    openCard(event)
    setTimeout(() => { markerJustPressed.current = false }, 100)
  }, [])

  const handleMapPress = useCallback(() => {
    if (markerJustPressed.current) return
    closeCard()
  }, [])

  if (!locationReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  const category = selectedEvent?.category_id
    ? CATEGORIES.find(c => c.id === selectedEvent.category_id)
    : null

  const formattedDate = selectedEvent
    ? new Date(selectedEvent.starts_at).toLocaleDateString('tr-TR', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : ''

  const formattedTime = selectedEvent
    ? new Date(selectedEvent.starts_at).toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit',
      })
    : ''

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        userInterfaceStyle={theme === 'dark' ? 'dark' : 'light'}
        customMapStyle={theme === 'dark' ? DARK_MAP_STYLE : []}
      >
        {events.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            onSelect={handleSelect}
          />
        ))}
      </MapView>

      <TouchableOpacity
        style={[styles.locateBtn, { bottom: TAB_BAR_HEIGHT + 16 }]}
        onPress={handleLocateMe}
        activeOpacity={0.75}
      >
        {locating
          ? <ActivityIndicator size="small" color={colors.accent} />
          : <Ionicons name="navigate" size={20} color={colors.accent} />
        }
      </TouchableOpacity>

      {selectedEvent && (
        <Animated.View
          style={[
            styles.card,
            { bottom: TAB_BAR_HEIGHT + 12, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.body}>
            <View style={styles.emojiWrap}>
              <Text style={styles.emojiText}>{selectedEvent.emoji ?? '📍'}</Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>{selectedEvent.title}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color={colors.accent} />
                <Text style={styles.metaText}>{formattedDate} · {formattedTime}</Text>
              </View>
              {selectedEvent.address ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.metaAddress} numberOfLines={1}>{selectedEvent.address}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeCard}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {category && (
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{category.icon} {category.name}</Text>
              </View>
              {selectedEvent.max_attendees && (
                <View style={styles.chip}>
                  <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
                  <Text style={styles.chipText}>Maks {selectedEvent.max_attendees} kişi</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push(`/event/${selectedEvent.id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Detayları Gör</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  )
}
