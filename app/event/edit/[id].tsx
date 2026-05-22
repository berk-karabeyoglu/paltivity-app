import { useState, useEffect, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Modal, Animated,
} from 'react-native'
import MapView, { Marker, MapPressEvent } from 'react-native-maps'
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
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
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
    map: { height: 200, borderRadius: 12, marginTop: 8 },
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
  const [startsAt, setStartsAt] = useState<Date>(new Date())
  const [emoji, setEmoji] = useState('📍')
  const [maxAttendees, setMaxAttendees] = useState('')

  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<PickerMode>('date')
  const { particles, fire } = useConfetti()

  useEffect(() => {
    if (user) fetchEvent()
  }, [id, user])

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .rpc('get_event_by_id', { p_event_id: id })
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
    setStartsAt(new Date(event.starts_at))
    setCoords({ latitude: event.latitude, longitude: event.longitude })
    setLoading(false)
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

    setSaving(true)
    try {
      const { error } = await supabase.from('events').update({
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        category_id: categoryId,
        location: `POINT(${coords.longitude} ${coords.latitude})`,
        emoji,
        starts_at: startsAt.toISOString(),
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      }).eq('id', id)
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <Text style={styles.label}>Adres</Text>
      <TextInput
        style={styles.input}
        placeholder="Mekan adı veya adres"
        placeholderTextColor={colors.textSecondary}
        value={address}
        onChangeText={setAddress}
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

      <Text style={styles.label}>Konum * {coords ? '✅' : '(haritaya dokun)'}</Text>
      <MapView
        style={styles.map}
        initialRegion={coords ? {
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : {
          latitude: 41.0082, longitude: 28.9784,
          latitudeDelta: 0.05, longitudeDelta: 0.05,
        }}
        onPress={(e: MapPressEvent) => setCoords(e.nativeEvent.coordinate)}
      >
        {coords && <Marker coordinate={coords} />}
      </MapView>

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
  )
}
