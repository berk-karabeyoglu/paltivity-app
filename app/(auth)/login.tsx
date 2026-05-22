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

function Orb({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) {
  const opacity = useRef(new Animated.Value(0.1)).current
  const scale = useRef(new Animated.Value(0.85)).current
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.45, duration: 3200, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.1, duration: 3200, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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
          <Text style={styles.gradientBtnText}>{loading ? 'Giriş yapılıyor...' : label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  )
}

function SocialBtn({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
  return (
    <Animated.View style={[styles.socialBtn, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.socialBtnInner}
        onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, damping: 15, stiffness: 300 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }).start()}
        onPress={onPress}
      >
        <Text style={styles.socialIcon}>{icon}</Text>
        <Text style={styles.socialLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  )
}

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Hata', 'Tüm alanları doldur')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      Alert.alert('Giriş hatası', err.message)
    } finally {
      setLoading(false)
    }
  }

  const f400 = fontsLoaded ? 'Poppins_400Regular' : undefined
  const f600 = fontsLoaded ? 'Poppins_600SemiBold' : undefined
  const f700 = fontsLoaded ? 'Poppins_700Bold' : undefined

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Orb x={width * 0.85} y={height * 0.08} size={320} color={C.violet} delay={0} />
      <Orb x={width * 0.1} y={height * 0.45} size={240} color={C.pink} delay={1000} />
      <Orb x={width * 0.65} y={height * 0.78} size={200} color={C.violet} delay={500} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.logoSection}>
            <LinearGradient colors={[C.violet, C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </LinearGradient>
            <Text style={[styles.logoText, { fontFamily: f700 }]}>paltivity</Text>
            <Text style={[styles.tagline, { fontFamily: f400 }]}>Etrafındaki aktiviteleri keşfet</Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontFamily: f700 }]}>Hoş geldin 👋</Text>
            <Text style={[styles.cardSub, { fontFamily: f400 }]}>Devam etmek için giriş yap</Text>

            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={C.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { fontFamily: f400 }]}
                placeholder="Email adresin"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={C.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { fontFamily: f400, flex: 1 }]}
                placeholder="Şifren"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <GradientButton onPress={handleLogin} label="Giriş Yap" loading={loading} />

            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={[styles.divText, { fontFamily: f400 }]}>ya da</Text>
              <View style={styles.divLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialBtn icon="🍎" label="Apple" onPress={() => Alert.alert('Yakında', 'Apple ile giriş yakında!')} />
              <SocialBtn icon="G" label="Google" onPress={() => Alert.alert('Yakında', 'Google ile giriş yakında!')} />
            </View>
          </View>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.footer}>
              <Text style={[styles.footerText, { fontFamily: f400 }]}>
                Hesabın yok mu?{'  '}
                <Text style={[styles.footerAccent, { fontFamily: f600 }]}>Kayıt ol →</Text>
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
  scroll: { flexGrow: 1, padding: 24, paddingTop: 72, paddingBottom: 48 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logoEmoji: { fontSize: 32 },
  logoText: { fontSize: 38, fontWeight: '800', color: C.text, letterSpacing: -1.5, marginBottom: 8 },
  tagline: { fontSize: 14, color: C.muted },
  card: {
    backgroundColor: C.surface,
    borderRadius: 28, borderWidth: 1, borderColor: C.border,
    padding: 24, gap: 12, marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 13, color: C.muted, marginBottom: 4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: C.text },
  eyeBtn: { padding: 4 },
  gradientBtn: { borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  gradientBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { color: C.muted, fontSize: 12 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.inputBg },
  socialBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48 },
  socialIcon: { fontSize: 17, color: C.text, fontWeight: '700' },
  socialLabel: { fontSize: 14, color: C.text, fontWeight: '600' },
  footer: { alignItems: 'center', paddingVertical: 8 },
  footerText: { color: C.muted, fontSize: 14 },
  footerAccent: { color: C.violet },
})
