import { toTurkishError } from '../../lib/utils/errorMessage'
import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Modal,
  Animated, Easing, KeyboardAvoidingView, Keyboard,
} from 'react-native'
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps'
import AppDateTimePicker from '../../components/ui/AppDateTimePicker'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'
import { useConfetti } from '../../lib/hooks/useConfetti'
import * as Location from 'expo-location'
import EmojiPicker from '../../components/ui/EmojiPicker'

type Coords = { latitude: number; longitude: number }
type PickerMode = 'date' | 'time' // openPicker arg

const DEFAULT_REGION: Region = {
  latitude: 41.0082, longitude: 28.9784,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 24, paddingBottom: 140 },
    heading: { fontSize: 24, fontWeight: '700', color: c.textPrimary, marginBottom: 24, marginTop: 48 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12,
      padding: 14, fontSize: 15, color: c.textPrimary,
      backgroundColor: c.surface, height: 52,
    },
    multiline: { height: 80, textAlignVertical: 'top', paddingTop: 14 },
    locationSection: { marginTop: 8 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14, height: 50, marginBottom: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
      zIndex: 20,
    },
    searchBarInput: { flex: 1, fontSize: 15, color: c.textPrimary },
    suggestionDropdown: {
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
      marginBottom: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
    },
    suggestionRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    },
    suggestionRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    suggestionIcon: {
      width: 34, height: 34, borderRadius: 9,
      backgroundColor: c.accent + '18',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    suggestionTexts: { flex: 1 },
    suggestionName: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    suggestionSub: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateButton: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 14,
    },
    dateButtonText: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    rowLeft: { flex: 1 },
    rowRight: { flex: 1, marginTop: 16 },
    mapWrapper: { borderRadius: 14, overflow: 'hidden' },
    map: { height: 220 },
    fullscreenBtn: {
      position: 'absolute', top: 8, right: 8,
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    fullscreenMap: { flex: 1 },
    fullscreenHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    fullscreenTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    fullscreenDone: { fontSize: 15, fontWeight: '700', color: c.accent },
    fullscreenHint: {
      position: 'absolute', bottom: 40, alignSelf: 'center',
      backgroundColor: c.surface, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    fullscreenHintText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 14, marginTop: 16,
    },
    toggleInfo: { flex: 1, gap: 2 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    toggleSub: { fontSize: 12, color: c.textSecondary },
    toggle: {
      width: 44, height: 26, borderRadius: 13,
      alignItems: 'center', justifyContent: 'center',
    },
    toggleOn: { backgroundColor: c.accent },
    toggleOff: { backgroundColor: c.border },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    buttonWrapper: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
    button: {
      backgroundColor: c.accent, borderRadius: 12,
      padding: 16, alignItems: 'center', width: '100%',
    },
    buttonDisabled: { opacity: 0.85 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', zIndex: 1 },
    successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 },
  })
}

export default function CreateScreen() {
  const { user } = useAuth()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [region, setRegion] = useState<Region>(DEFAULT_REGION)
  const [startsAt, setStartsAt] = useState<Date>(new Date())
  const [emoji, setEmoji] = useState('📍')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showFullscreen, setShowFullscreen] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const locationSectionRef = useRef<View>(null)
  const [createPhase, setCreatePhase] = useState<'idle' | 'filling' | 'success'>('idle')
  const progressAnim = useRef(new Animated.Value(0)).current
  const successOpacity = useRef(new Animated.Value(0)).current
  const buttonWidthRef = useRef(0)
  const mapRef = useRef<MapView>(null)
  const fullscreenMapRef = useRef<MapView>(null)
  const { particles, fire } = useConfetti()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerInitialStep, setPickerInitialStep] = useState<PickerMode>('date')
  const [dateConfirmed, setDateConfirmed] = useState(true)

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(loc => {
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        })
      }).catch(() => {})
    })
  }, [])

  const openPicker = (step: PickerMode) => {
    setPickerInitialStep(step)
    setShowPicker(true)
  }

  const handlePickerConfirm = (date: Date) => {
    setStartsAt(date)
    setDateConfirmed(true)
    setShowPicker(false)
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) { setSuggestions([]); return }
    setGeocoding(true)
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
        },
        body: JSON.stringify({ input: query, languageCode: 'tr', regionCode: 'TR' }),
      })
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
    } catch {
      setSuggestions([])
    } finally {
      setGeocoding(false)
    }
  }, [])

  const handleAddressChange = (text: string) => {
    setAddress(text)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => fetchSuggestions(text), 400)
    // Öneri listesi gelince görünür alanda olsun
    setTimeout(() => {
      locationSectionRef.current?.measureInWindow((_x, y) => {
        scrollRef.current?.scrollTo({ y: y - 80, animated: true })
      })
    }, 500)
  }

  const handleSelectSuggestion = async (item: any) => {
    Keyboard.dismiss()
    const prediction = item.placePrediction
    const name = prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text ?? ''
    const secondary = prediction?.structuredFormat?.secondaryText?.text ?? ''
    setAddress(secondary ? `${name}, ${secondary}` : name)
    setSuggestions([])
    try {
      const placeId = prediction?.placeId
      if (!placeId) return
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location&languageCode=tr`,
        { headers: { 'X-Goog-Api-Key': PLACES_KEY } }
      )
      const data = await res.json()
      const loc = data.location
      if (!loc) return
      const newCoords: Coords = { latitude: loc.latitude, longitude: loc.longitude }
      const newRegion: Region = { ...newCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      setCoords(newCoords)
      setRegion(newRegion)
      mapRef.current?.animateToRegion(newRegion, 800)
    } catch {}
  }

  const handleGeocode = async () => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    const query = address.trim()
    if (!query) return
    setGeocoding(true)
    setSuggestions([])
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_KEY,
        },
        body: JSON.stringify({ input: query, languageCode: 'tr', regionCode: 'TR' }),
      })
      const data = await res.json()
      if (!data.suggestions?.length) return Alert.alert('Bulunamadı', 'Adres bulunamadı, farklı bir arama dene.')
      setSuggestions(data.suggestions)
    } catch {
      Alert.alert('Hata', 'Konum aranırken bir sorun oluştu.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleMapPress = (e: MapPressEvent) => {
    try {
      const coord = e?.nativeEvent?.coordinate
      if (!coord) return
      setCoords(coord)
    } catch {}
  }

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Hata', 'Başlık gerekli')
    if (!coords) return Alert.alert('Hata', 'Haritadan konum seç')
    if (!dateConfirmed) return Alert.alert('Hata', 'Tarih ve saat seç')
    if (startsAt.getTime() < Date.now()) return Alert.alert('Hata', 'Geçmiş bir saat seçemezsin')
    if (createPhase !== 'idle') return

    setCreatePhase('filling')
    progressAnim.setValue(0)
    successOpacity.setValue(0)

    const animPromise = new Promise<void>(resolve => {
      Animated.timing(progressAnim, {
        toValue: buttonWidthRef.current, duration: 900,
        easing: Easing.inOut(Easing.quad), useNativeDriver: false,
      }).start(() => resolve())
    })

    if (!user) { setCreatePhase('idle'); return Alert.alert('Hata', 'Giriş yapman gerekiyor') }

    try {
      const { error } = await supabase.from('events').insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        category_id: categoryId,
        location: `POINT(${coords.longitude} ${coords.latitude})`,
        emoji,
        starts_at: startsAt.toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        requires_approval: requiresApproval,
      })
      if (error) throw error

      setTitle('')
      setDescription('')
      setAddress('')
      setCategoryId(null)
      setCoords(null)
      setRegion(DEFAULT_REGION)
      setStartsAt(new Date())
      setEmoji('📍')
      setMaxAttendees('')
      setRequiresApproval(false)
      setSuggestions([])

      await animPromise

      setCreatePhase('success')
      fire()
      Animated.timing(successOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start()
      setTimeout(() => {
        progressAnim.setValue(0)
        setCreatePhase('idle')
        router.replace('/(tabs)/map')
      }, 2000)
    } catch (err: any) {
      progressAnim.setValue(0)
      setCreatePhase('idle')
      Alert.alert('Hata', toTurkishError(err.message))
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Event Oluştur</Text>

      <Text style={styles.label}>Başlık *</Text>
      <TextInput
        style={styles.input}
        placeholder="Event adı"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Event hakkında bilgi ver"
        placeholderTextColor={colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />


      <Text style={styles.label}>Tarih ve Saat *</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('date')}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={[styles.dateButtonText, !dateConfirmed && { color: colors.textSecondary }]}>
            {dateConfirmed ? formatDate(startsAt) : 'Tarih seç'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('time')}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={[styles.dateButtonText, !dateConfirmed && { color: colors.textSecondary }]}>
            {dateConfirmed ? formatTime(startsAt) : 'Saat seç'}
          </Text>
        </TouchableOpacity>
      </View>

      <AppDateTimePicker
        visible={showPicker}
        value={startsAt}
        initialStep={pickerInitialStep}
        minimumDate={new Date()}
        onConfirm={handlePickerConfirm}
        onCancel={() => setShowPicker(false)}
      />

      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.label}>Maksimum Katılımcı</Text>
          <TextInput
            style={styles.input}
            placeholder="Sınırsız"
            placeholderTextColor={colors.textSecondary}
            value={maxAttendees}
            onChangeText={setMaxAttendees}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.label}>Emoji</Text>
          <EmojiPicker value={emoji} onChange={setEmoji} compact />
        </View>
      </View>

      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setRequiresApproval(v => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Onay Gerektir</Text>
          <Text style={styles.toggleSub}>Katılım isteklerini sen onaylarsın</Text>
        </View>
        <View style={[styles.toggle, requiresApproval ? styles.toggleOn : styles.toggleOff]}>
          <View style={[styles.toggleKnob, { transform: [{ translateX: requiresApproval ? 9 : -9 }] }]} />
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Konum *</Text>
      <View ref={locationSectionRef} style={styles.locationSection}>
        {/* Arama çubuğu */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Mekan veya adres ara..."
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={handleAddressChange}
            onSubmitEditing={handleGeocode}
            returnKeyType="search"
          />
          {geocoding
            ? <ActivityIndicator size="small" color={colors.accent} />
            : address.length > 0
              ? <TouchableOpacity onPress={() => { setAddress(''); setSuggestions([]) }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              : null
          }
        </View>

        {/* Floating öneri listesi */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionDropdown}>
            {suggestions.map((item, index) => {
              const pred = item.placePrediction
              const name = pred?.structuredFormat?.mainText?.text ?? pred?.text?.text ?? ''
              const sub = pred?.structuredFormat?.secondaryText?.text ?? ''
              return (
                <TouchableOpacity
                  key={pred?.placeId ?? index}
                  style={[styles.suggestionRow, index < suggestions.length - 1 && styles.suggestionRowBorder]}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.55}
                >
                  <View style={styles.suggestionIcon}>
                    <Ionicons name="location" size={15} color={colors.accent} />
                  </View>
                  <View style={styles.suggestionTexts}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{name}</Text>
                    {!!sub && <Text style={styles.suggestionSub} numberOfLines={1}>{sub}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={13} color={colors.border} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Harita */}
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {coords && <Marker coordinate={coords} />}
          </MapView>
          <TouchableOpacity style={styles.fullscreenBtn} onPress={() => setShowFullscreen(true)}>
            <Ionicons name="expand-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tam ekran harita */}
      <Modal visible={showFullscreen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.fullscreenHeader}>
            <TouchableOpacity onPress={() => setShowFullscreen(false)}>
              <Ionicons name="chevron-back" size={24} color={colors.accent} />
            </TouchableOpacity>
            <Text style={styles.fullscreenTitle}>Konum Seç</Text>
            <TouchableOpacity onPress={() => setShowFullscreen(false)}>
              <Text style={styles.fullscreenDone}>Tamam</Text>
            </TouchableOpacity>
          </View>
          <MapView
            ref={fullscreenMapRef}
            style={styles.fullscreenMap}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={(e) => {
              try {
                const coord = e?.nativeEvent?.coordinate
                if (!coord) return
                setCoords(coord)
                setRegion(r => ({ ...r, latitude: coord.latitude, longitude: coord.longitude }))
              } catch {}
            }}
          >
            {coords && <Marker coordinate={coords} />}
          </MapView>
          <View style={styles.fullscreenHint} pointerEvents="none">
            <Text style={styles.fullscreenHintText}>Konumu seçmek için haritaya dokun</Text>
          </View>
        </View>
      </Modal>

      <View style={styles.buttonWrapper}>
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
          style={[styles.button, { overflow: 'hidden' }, createPhase !== 'idle' && styles.buttonDisabled]}
          onPress={handleCreate}
          onLayout={e => { buttonWidthRef.current = e.nativeEvent.layout.width }}
          disabled={createPhase !== 'idle'}
          activeOpacity={0.9}
        >
          {(createPhase === 'filling' || createPhase === 'success') && (
            <Animated.View
              style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                backgroundColor: colors.accentSecondary,
                width: progressAnim,
              }}
            />
          )}

          {createPhase === 'success' ? (
            <Animated.View style={[styles.successRow, { opacity: successOpacity }]}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Oluşturuldu!</Text>
            </Animated.View>
          ) : (
            <Text style={styles.buttonText}>Event Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}
