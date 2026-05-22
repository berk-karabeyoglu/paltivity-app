import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, Dimensions, Animated, Easing, ScrollView, Pressable,
} from 'react-native'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins'
import { useAuth } from '../../lib/hooks/useAuth'

const { width, height } = Dimensions.get('window')

const C = {
  bg: '#070B10',
  violet: '#396afc',
  pink: '#2948ff',
  surface: 'rgba(57,106,252,0.07)',
  border: 'rgba(255,255,255,0.09)',
  text: '#F1F5F9',
  muted: '#94A3B8',
  inputBg: 'rgba(255,255,255,0.05)',
}

const GENDERS = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
  { value: 'prefer_not_to_say', label: 'Belirtmek istemiyorum' },
]

function Orb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0.1)).current
  const scale = useRef(new Animated.Value(0.85)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.4, duration: 3500, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.1, duration: 3500, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ])).start()
  }, [])
  return (
    <Animated.View style={{
      position: 'absolute', left: x - size / 2, top: y - size / 2,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color, opacity, transform: [{ scale }],
    }} />
  )
}

function InputRow({ icon, placeholder, value, onChangeText, secure, keyboardType, autoCapitalize, fontFamily, right }: any) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color={C.muted} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, { fontFamily, flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
      {right}
    </View>
  )
}

function GradientButton({ onPress, label, loading }: { onPress: () => void; label: string; loading?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }).start()}
        onPress={onPress}
      >
        <LinearGradient colors={[C.violet, C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBtn}>
          <Text style={styles.gradientBtnText}>{loading ? 'Kaydediliyor...' : label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  )
}

export default function RegisterScreen() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold })

  const slideAnim = useRef(new Animated.Value(40)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
    ]).start()
  }, [])

  const handleRegister = async () => {
    if (!email || !password || !username || !fullName) return Alert.alert('Hata', 'Tüm zorunlu alanları doldur')
    if (password.length < 6) return Alert.alert('Hata', 'Şifre en az 6 karakter olmalı')
    setLoading(true)
    try {
      await signUp(email, password, username, fullName, gender)
    } catch (err: any) {
      Alert.alert('Kayıt hatası', err.message)
    } finally {
      setLoading(false)
    }
  }

  const f400 = fontsLoaded ? 'Poppins_400Regular' : undefined
  const f600 = fontsLoaded ? 'Poppins_600SemiBold' : undefined
  const f700 = fontsLoaded ? 'Poppins_700Bold' : undefined

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Orb x={width * 0.1} y={height * 0.05} size={280} color={C.pink} delay={0} />
      <Orb x={width * 0.9} y={height * 0.4} size={220} color={C.violet} delay={800} />
      <Orb x={width * 0.3} y={height * 0.8} size={180} color={C.pink} delay={400} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={C.muted} />
              </TouchableOpacity>
            </Link>
            <LinearGradient colors={[C.violet, C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </LinearGradient>
          </View>

          <Text style={[styles.title, { fontFamily: f700 }]}>Hesap oluştur 🚀</Text>
          <Text style={[styles.subtitle, { fontFamily: f400 }]}>Aktivite dünyasına katıl</Text>

          <View style={styles.card}>
            <InputRow icon="person-outline" placeholder="Ad Soyad *" value={fullName} onChangeText={setFullName} fontFamily={f400} />
            <InputRow icon="at-outline" placeholder="Kullanıcı adı *" value={username} onChangeText={setUsername} autoCapitalize="none" fontFamily={f400} />
            <InputRow icon="mail-outline" placeholder="Email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" fontFamily={f400} />
            <InputRow
              icon="lock-closed-outline"
              placeholder="Şifre *"
              value={password}
              onChangeText={setPassword}
              secure={!showPass}
              fontFamily={f400}
              right={
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.muted} />
                </TouchableOpacity>
              }
            />

            <Text style={[styles.sectionLabel, { fontFamily: f600 }]}>Cinsiyet</Text>
            <View style={styles.genderRow}>
              {GENDERS.map(g => {
                const active = gender === g.value
                return (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.genderChip, active && styles.genderChipActive]}
                    onPress={() => setGender(g.value === gender ? null : g.value)}
                  >
                    {active && (
                      <LinearGradient colors={[C.violet, C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    )}
                    <Text style={[styles.genderText, { fontFamily: f400 }, active && styles.genderTextActive]}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <GradientButton onPress={handleRegister} label="Kayıt Ol" loading={loading} />
          </View>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.footer}>
              <Text style={[styles.footerText, { fontFamily: f400 }]}>
                Zaten hesabın var mı?{'  '}
                <Text style={[styles.footerAccent, { fontFamily: f600 }]}>Giriş yap →</Text>
              </Text>
            </TouchableOpacity>
          </Link>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  title: { fontSize: 30, fontWeight: '800', color: C.text, letterSpacing: -1, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, marginBottom: 28 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 28, borderWidth: 1, borderColor: C.border,
    padding: 20, gap: 10, marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: C.text },
  eyeBtn: { padding: 4 },
  sectionLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: {
    borderWidth: 1, borderColor: C.border, borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.inputBg, overflow: 'hidden',
  },
  genderChipActive: { borderColor: 'transparent' },
  genderText: { fontSize: 12, color: C.muted },
  genderTextActive: { color: '#fff', fontWeight: '600' },
  gradientBtn: { borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  gradientBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center', paddingVertical: 8 },
  footerText: { color: C.muted, fontSize: 14 },
  footerAccent: { color: C.violet },
})
