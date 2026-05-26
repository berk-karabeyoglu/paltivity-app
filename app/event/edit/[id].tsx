import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Modal, Animated,
  KeyboardAvoidingView, Keyboard,
} from 'react-native'
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/hooks/useAuth'
import { useColors } from '../../../lib/hooks/useColors'
import { ColorTheme } from '../../../constants/colors'
import { CATEGORIES } from '../../../constants/categories'
import EmojiPicker from '../../../components/ui/EmojiPicker'
import { useConfetti } from '../../../lib/hooks/useConfetti'
import { signalEventRefresh } from '../../../lib/eventRefreshSignal'

type Coords = { latitude: number; longitude: number }
type PickerMode = 'date' | 'time'

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY!

const DEFAULT_REGION: Region = {
  latitude: 41.0082, longitude: 28.9784,
  latitudeDelta: 0.05, longitudeDelta: 0.05,
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 24, paddingBottom: 60 },
    header: { marginTop: 56, marginBottom: 24 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    backText: { color: c.accent, fontSize: 16 },
    heading: { fontSize: 24, fontWeight: '700', color: c.textPrimary },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 16 },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12,
      padding: 14, fontSize: 15, color: c.textPrimary,
      backgroundColor: c.surface, height: 52,
    },
    multiline: { height: 80, textAlignVertical: 'top', paddingTop: 14 },
    dateRow: { flexDirection: 'row', gap: 10 },
    dateButton: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 14,
    },
    dateButtonText: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCard: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    modalDone: { fontSize: 16, fontWeight: '700', color: c.accent },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    rowLeft: { flex: 1 },
    rowRight: { flex: 1, marginTop: 16 },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: { borderWidth: 1, borderColor: c.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface },
    categoryChipSelected: { backgroundColor: c.accent + '20', borderColor: c.accent },
    categoryText: { fontSize: 13, color: c.textSecondary },
    categoryTextSelected: { color: c.accent, fontWeight: '600' },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 14, marginTop: 16,
    },
    toggleInfo: { flex: 1, gap: 2 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
    toggleSub: { fontSize: 12, color: c.textSecondary },
    toggle: { width: 44, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    toggleOn: { backgroundColor: c.accent },
    toggleOff: { backgroundColor: c.border },
    toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
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
    mapWrapper: { borderRadius: 14, overflow: 'hidden' },
    map: { height: 220 },
    fullscreenBtn: {
      position: 'absolute', top: 8, right: 8,
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    fullscreenHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    fullscreenTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    fullscreenDone: { fontSize: 15, fontWeight: '700', color: c.accent },
    fullscreenMap: { flex: 1 },
    fullscreenHint: {
      position: 'absolute', bottom: 40, alignSelf: 'center',
      backgroundColor: c.surface, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    fullscreenHintText: { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
    button: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  })
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<PickerMode>('date')

  const mapRef = useRef<MapView>(null)
  const fullscreenMapRef = useRef<MapView>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const locationSectionRef = useRef<View>(null)
  const { particles, fire } = useConfetti()

  useEffect(() => {
    if (user) fetchEvent()
  }, [id, user])

  const fetchEvent = async () => {
    const { data, error } = await supabase.rpc('get_event_by_id', { p_event_id: id })
    if (error) { Alert.alert('Hata', error.message); return }
    const event = Array.isArray(data) ? data[0] : data
    if (!event) { Alert.alert('Hata', 'Event bulunamadı'); return }
    if (event.creator_id !== user?.id) {
      Alert.alert('Hata', 'Bu eventi düzenleme yetkin yok')
      router.back()
      return
    }
    setTitle(event.title)
    setDescription(event.description ?? '')
    setAddress(event.address ?? '')
    setCategoryId(event.category_id)
    setEmoji(event.emoji ?? '📍')
    setMaxAttendees(event.max_attendees ? String(event.max_attendees) : '')
    setRequiresApproval(event.requires_approval ?? false)
    setStartsAt(new Date(event.starts_at))
    const newCoords = { latitude: event.latitude, longitude: event.longitude }
    setCoords(newCoords)
    setRegion({ ...newCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 })
    setLoading(false)
  }

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) { setSuggestions([]); return }
    setGeocoding(true)
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY },
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
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY },
        body: JSON.stringify({ input: query, languageCode: 'tr', regionCode: 'TR' }),
      })
      const data = await res.json()
      if (!data.suggestions?.length) return Alert.alert('Bulunamadı', 'Adres bulunamadı.')
      setSuggestions(data.suggestions)
    } catch {
      Alert.alert('Hata', 'Konum aranırken bir sorun oluştu.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (selected) setStartsAt(selected)
  }

  const formatDate = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatTime = (d: Date) => d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert('Hata', 'Başlık gerekli')
    if (!coords) return Alert.alert('Hata', 'Konum seç')
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_event', {
        p_event_id:          id,
        p_updater_id:        user.id,
        p_title:             title.trim(),
        p_description:       description.trim() || null,
        p_address:           address.trim() || null,
        p_category_id:       categoryId,
        p_location:          `POINT(${coords.longitude} ${coords.latitude})`,
        p_emoji:             emoji,
        p_starts_at:         startsAt.toISOString(),
        p_max_attendees:     maxAttendees ? parseInt(maxAttendees) : null,
        p_requires_approval: requiresApproval,
      })
      if (error) throw error
      fire()
      setSaved(true)
      signalEventRefresh()
      setTimeout(() => router.back(), 900)
    } catch (err: any) {
      Alert.alert('Hata', err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Eventi Düzenle</Text>
      </View>

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
        <TouchableOpacity style={styles.dateButton} onPress={() => { setPickerMode('date'); setShowPicker(true) }}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={styles.dateButtonText}>{formatDate(startsAt)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => { setPickerMode('time'); setShowPicker(true) }}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={styles.dateButtonText}>{formatTime(startsAt)}</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' && (
        <Modal transparent visible={showPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{pickerMode === 'date' ? 'Tarih Seç' : 'Saat Seç'}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Tamam</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={startsAt} mode={pickerMode} display="spinner" onChange={handleDateChange} locale="tr-TR" textColor={colors.textPrimary} />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker value={startsAt} mode={pickerMode} display="default" onChange={handleDateChange} />
      )}

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

      <Text style={styles.label}>Kategori</Text>
      <View style={styles.categories}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipSelected]}
            onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
          >
            <Text style={[styles.categoryText, categoryId === cat.id && styles.categoryTextSelected]}>
              {cat.icon} {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
            onPress={(e: MapPressEvent) => {
              try {
                const coord = e?.nativeEvent?.coordinate
                if (!coord) return
                setCoords(coord)
              } catch {}
            }}
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

      <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {particles.map((p, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: p.size, height: p.size,
              borderRadius: p.size / 4,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x }, { translateY: p.y }, { scale: p.scale },
                { rotate: p.rotate.interpolate({ inputRange: [-6, 6], outputRange: ['-360deg', '360deg'] }) },
              ],
            }}
          />
        ))}
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled, { width: '100%' }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving && !saved
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{saved ? 'Kaydedildi ✓' : 'Kaydet'}</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  )
}
