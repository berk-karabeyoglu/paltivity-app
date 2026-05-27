import { toTurkishError } from '../../../lib/utils/errorMessage'
import { useEffect, useState, useMemo } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, ActionSheetIOS
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/hooks/useAuth'
import { useColors } from '../../../lib/hooks/useColors'
import { ColorTheme } from '../../../constants/colors'

const GENDERS = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
  { value: 'prefer_not_to_say', label: 'Belirtmek istemiyorum' },
]

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    content: { padding: 24, paddingBottom: 140 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 56, marginBottom: 32,
    },
    backButton: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
    saveButton: { paddingHorizontal: 4 },
    saveText: { fontSize: 16, fontWeight: '700', color: c.accent },
    avatarContainer: { alignSelf: 'center', marginBottom: 36, position: 'relative' },
    avatar: {
      width: 96, height: 96, borderRadius: 32,
      borderWidth: 2, borderColor: c.accent + '60',
    },
    avatarPlaceholder: {
      width: 96, height: 96, borderRadius: 32,
      backgroundColor: c.accent + '20',
      borderWidth: 2, borderColor: c.accent + '60',
      alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 32, fontWeight: '700', color: c.accent },
    avatarBadge: {
      position: 'absolute', bottom: -4, right: -4,
      width: 28, height: 28, borderRadius: 10,
      backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: c.background,
    },
    form: { gap: 24 },
    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: 14, padding: 16, fontSize: 16, color: c.textPrimary,
    },
    multiline: { height: 90, textAlignVertical: 'top' },
    genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    genderChip: {
      borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.surface,
    },
    genderChipSelected: { borderColor: c.accent, backgroundColor: c.accent + '15' },
    genderText: { fontSize: 13, color: c.textSecondary },
    genderTextSelected: { color: c.accent, fontWeight: '600' },
  })
}

export default function EditProfileScreen() {
  const { user } = useAuth()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, bio, gender, avatar_url')
      .eq('id', user?.id ?? '')
      .single()
    if (data) {
      setUsername(data.username ?? '')
      setFullName(data.full_name ?? '')
      setBio(data.bio ?? '')
      setGender(data.gender ?? null)
      setAvatarUrl(data.avatar_url ?? null)
    }
    setLoading(false)
  }

  const pickImage = async (fromCamera: boolean) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (status !== 'granted') {
      return Alert.alert('İzin gerekli', fromCamera ? 'Kamera iznini ver' : 'Fotoğraf iznini ver')
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 })

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const showPhotoOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['İptal', 'Fotoğraf Çek', 'Fotoğraflardan Seç'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) pickImage(true)
          if (index === 2) pickImage(false)
        }
      )
    } else {
      Alert.alert('Fotoğraf Ekle', '', [
        { text: 'Fotoğraf Çek', onPress: () => pickImage(true) },
        { text: 'Fotoğraflardan Seç', onPress: () => pickImage(false) },
        { text: 'İptal', style: 'cancel' },
      ])
    }
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri) return avatarUrl

    setUploadingPhoto(true)
    try {
      const ext = (avatarUri.split('.').pop()?.toLowerCase() ?? 'jpg').replace('jpeg', 'jpg')
      const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      const path = `${user?.id ?? ''}/avatar.${ext}`

      const arrayBuffer = await fetch(avatarUri).then(r => r.arrayBuffer())

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeType })

      if (error) throw error

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return `${data.publicUrl}?t=${Date.now()}`
    } catch (err: any) {
      Alert.alert('Fotoğraf yüklenemedi', toTurkishError(err.message))
      return avatarUrl
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    if (!username.trim()) return Alert.alert('Hata', 'Kullanıcı adı boş olamaz')
    setSaving(true)
    try {
      const newAvatarUrl = await uploadAvatar()
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          gender,
          avatar_url: newAvatarUrl,
        })
        .eq('id', user?.id ?? '')
      if (error) throw error
      router.back()
    } catch (err: any) {
      Alert.alert('Hata', toTurkishError(err.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  const displayPhoto = avatarUri ?? avatarUrl
  const initials = (fullName || username || '?').slice(0, 2).toUpperCase()

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.title}>Profili Düzenle</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || uploadingPhoto} style={styles.saveButton}>
            {saving || uploadingPhoto
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Text style={styles.saveText}>Kaydet</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.avatarContainer} onPress={showPhotoOptions}>
          {displayPhoto ? (
            <Image source={{ uri: displayPhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Adın ve soyadın"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Kullanıcı Adı</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="kullanici_adi"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinden bahset..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Cinsiyet</Text>
            <View style={styles.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.genderChip, gender === g.value && styles.genderChipSelected]}
                  onPress={() => setGender(g.value === gender ? null : g.value)}
                >
                  <Text style={[styles.genderText, gender === g.value && styles.genderTextSelected]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
