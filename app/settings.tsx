import { toTurkishError } from '../lib/utils/errorMessage'
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Animated,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/hooks/useAuth'
import { useColors } from '../lib/hooks/useColors'
import { useTheme } from '../lib/providers/ThemeProvider'
import { ColorTheme } from '../constants/colors'

// Kendi animasyonlu toggle'ımız — useNativeDriver: true ile JS re-render'dan bağımsız
function AnimatedToggle({ value, onToggle, activeColor }: { value: boolean; onToggle: () => void; activeColor: string }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
      mass: 0.8,
    }).start()
  }, [value])

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] })

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      <View style={[
        toggleStyles.track,
        { backgroundColor: value ? activeColor + 'CC' : '#CBD5E1' },
      ]}>
        <Animated.View style={[toggleStyles.thumb, { transform: [{ translateX }] }]} />
      </View>
    </TouchableOpacity>
  )
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 46, height: 28, borderRadius: 14,
    justifyContent: 'center',
  },
  thumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
})

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingBottom: 60 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 22, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },

    section: { paddingHorizontal: 20, marginBottom: 32 },
    sectionLabel: {
      fontSize: 11, fontWeight: '700', color: c.textSecondary,
      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
    },
    card: {
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    rowIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
    rowSub: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
    signOutRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    signOutTitle: { fontSize: 15, fontWeight: '600', color: c.error },
    dangerRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    dangerTitle: { fontSize: 15, fontWeight: '600', color: c.error },
  })
}

type RowProps = {
  icon: any
  iconBg: string
  title: string
  sub?: string
  right?: React.ReactNode
  onPress?: () => void
  isLast?: boolean
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth()
  const colors = useColors()
  const { theme, setTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [isPrivate, setIsPrivate] = useState(false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('is_private')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setIsPrivate(data.is_private ?? false)
      })
  }, [user])

  const handlePrivacyToggle = async (value: boolean) => {
    setIsPrivate(value)
    setSavingPrivacy(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_private: value })
        .eq('id', user?.id ?? '')
      if (error) throw error
    } catch (err: any) {
      setIsPrivate(!value)
      Alert.alert('Hata', toTurkishError(err.message))
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istiyor musun?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verilerin kalıcı olarak silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('delete_user_account')
              if (error) throw error
              await supabase.auth.signOut()
            } catch (e: any) {
              Alert.alert('Hata', toTurkishError(e?.message))
            }
          },
        },
      ]
    )
  }

  function Row({ icon, iconBg, title, sub, right, onPress, isLast }: RowProps) {
    return (
      <TouchableOpacity
        style={[styles.row, !isLast && styles.rowBorder]}
        onPress={onPress}
        activeOpacity={onPress ? 0.6 : 1}
        disabled={!onPress && !right}
      >
        <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color="#fff" />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{title}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        {right ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.border} /> : null)}
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
      </View>

      {/* Görünüm */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Görünüm</Text>
        <View style={styles.card}>
          <Row
            icon={theme === 'dark' ? 'moon' : 'sunny'}
            iconBg={colors.accent}
            title={theme === 'dark' ? 'Karanlık Tema' : 'Açık Tema'}
            sub={theme === 'dark' ? 'Açık temaya geç' : 'Karanlık temaya geç'}
            isLast
            right={
              <AnimatedToggle
                value={theme === 'light'}
                onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                activeColor={colors.accent}
              />
            }
          />
        </View>
      </View>

      {/* Gizlilik */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Gizlilik</Text>
        <View style={styles.card}>
          <Row
            icon={isPrivate ? 'lock-closed' : 'lock-open-outline'}
            iconBg={isPrivate ? colors.accent : colors.textSecondary}
            title="Profili Gizle"
            sub={isPrivate ? 'Profilin başkaları tarafından görülemiyor' : 'Profilin herkese açık'}
            isLast
            right={
              savingPrivacy
                ? <ActivityIndicator size="small" color={colors.accent} />
                : (
                  <AnimatedToggle
                    value={isPrivate}
                    onToggle={() => handlePrivacyToggle(!isPrivate)}
                    activeColor={colors.accent}
                  />
                )
            }
          />
        </View>
      </View>

      {/* Hesap */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Hesap</Text>
        <View style={styles.card}>
          <Row
            icon="key-outline"
            iconBg="#8B5CF6"
            title="Şifreyi Değiştir"
            isLast
            onPress={() => router.push('/change-password')}
          />
        </View>
      </View>

      {/* Hesap İşlemleri */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Hesap İşlemleri</Text>
        <View style={styles.card}>
          <TouchableOpacity style={[styles.signOutRow, styles.rowBorder]} onPress={handleSignOut} activeOpacity={0.6}>
            <View style={[styles.rowIconWrap, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="log-out-outline" size={17} color={colors.error} />
            </View>
            <Text style={styles.signOutTitle}>Çıkış Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount} activeOpacity={0.6}>
            <View style={[styles.rowIconWrap, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="trash-outline" size={17} color={colors.error} />
            </View>
            <Text style={styles.dangerTitle}>Hesabı Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
