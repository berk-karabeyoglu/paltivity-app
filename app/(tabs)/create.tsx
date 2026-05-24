import { useState, useRef, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Modal,
  Animated, Easing,
} from 'react-native'
import MapView, { Marker, MapPressEvent } from 'react-native-maps'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/hooks/useAuth'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'
import { useConfetti } from '../../lib/hooks/useConfetti'
import { CATEGORIES } from '../../constants/categories'
import EmojiPicker from '../../components/ui/EmojiPicker'

type Coords = { latitude: number; longitude: number }
type PickerMode = 'date' | 'time'

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
    dateRow: { flexDirection: 'row', gap: 10 },
    dateButton: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 14,
    },
    dateButtonText: { fontSize: 14, color: c.textPrimary, fontWeight: '500' },
    modalOverlay: {
      flex: 1, justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalCard: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 40,
    },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    modalDone: { fontSize: 16, fontWeight: '700', color: c.accent },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface,
    },
    categoryChipSelected: { backgroundColor: c.accent + '20', borderColor: c.accent },
    categoryText: { fontSize: 13, color: c.textSecondary },
    categoryTextSelected: { color: c.accent, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    rowLeft: { flex: 1 },
    rowRight: { flex: 1, marginTop: 16 },
    map: { height: 200, borderRadius: 12, marginTop: 8 },
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
    toggleKnob: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#fff',
    },
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
  const [startsAt, setStartsAt] = useState<Date>(new Date())
  const [emoji, setEmoji] = useState('📍')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createPhase, setCreatePhase] = useState<'idle' | 'filling' | 'success'>('idle')
  const progressAnim = useRef(new Animated.Value(0)).current
  const successOpacity = useRef(new Animated.Value(0)).current
  const buttonWidthRef = useRef(0)
  const { particles, fire } = useConfetti()
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<PickerMode>('date')
  const [dateConfirmed, setDateConfirmed] = useState(true)

  const openDatePicker = (mode: PickerMode) => {
    setPickerMode(mode)
    setShowPicker(true)
  }

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false)
    if (selected) {
      setStartsAt(selected)
      setDateConfirmed(true)
    }
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const handleMapPress = (e: MapPressEvent) => {
    setCoords(e.nativeEvent.coordinate)
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

      // Reset form immediately so returning to tab shows a clean screen
      setTitle('')
      setDescription('')
      setAddress('')
      setCategoryId(null)
      setCoords(null)
      setStartsAt(new Date())
      setEmoji('📍')
      setMaxAttendees('')
      setRequiresApproval(false)

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
      Alert.alert('Hata', err.message)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
        <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('date')}>
          <Ionicons name="calendar-outline" size={16} color={colors.accent} />
          <Text style={[styles.dateButtonText, !dateConfirmed && { color: colors.textSecondary }]}>
            {dateConfirmed ? formatDate(startsAt) : 'Tarih seç'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('time')}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />
          <Text style={[styles.dateButtonText, !dateConfirmed && { color: colors.textSecondary }]}>
            {dateConfirmed ? formatTime(startsAt) : 'Saat seç'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* iOS: modal picker */}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {pickerMode === 'date' ? 'Tarih Seç' : 'Saat Seç'}
                </Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Tamam</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startsAt}
                mode={pickerMode}
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                locale="tr-TR"
                textColor={colors.textPrimary}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android: inline picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={startsAt}
          mode={pickerMode}
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
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

      <Text style={styles.label}>Konum * {coords ? '✅' : '(haritaya dokun)'}</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 41.0082,
          longitude: 28.9784,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={handleMapPress}
      >
        {coords && <Marker coordinate={coords} />}
      </MapView>

      <View style={styles.buttonWrapper}>
        {/* Confetti particles */}
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
  )
}
