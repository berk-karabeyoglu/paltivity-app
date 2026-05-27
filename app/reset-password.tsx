import { toTurkishError } from '../lib/utils/errorMessage'
import { useState, useMemo, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { useColors } from '../lib/hooks/useColors'
import { ColorTheme } from '../constants/colors'

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    inner: { flexGrow: 1, paddingBottom: 48 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24, gap: 12,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 22, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
    body: { paddingHorizontal: 20, gap: 16 },
    hint: { fontSize: 14, color: c.textSecondary, lineHeight: 20, marginBottom: 4 },
    fieldLabel: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6,
    },
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border,
      paddingHorizontal: 14,
    },
    inputRowFocused: { borderColor: c.accent },
    inputRowError: { borderColor: '#EF4444' },
    input: { flex: 1, height: 50, fontSize: 15, color: c.textPrimary },
    eyeBtn: { padding: 6 },
    errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
    strengthBar: {
      height: 4, borderRadius: 2, marginTop: 8,
      flexDirection: 'row', gap: 4,
    },
    strengthSegment: { flex: 1, borderRadius: 2 },
    strengthLabel: { fontSize: 12, marginTop: 4 },
    submitBtn: {
      marginTop: 8, height: 52, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    submitLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
    rules: { gap: 6, marginTop: 4 },
    rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleText: { fontSize: 13 },
  })
}

function strength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '#CBD5E1' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { score: 1, label: 'Çok zayıf', color: '#EF4444' },
    { score: 2, label: 'Zayıf', color: '#F97316' },
    { score: 3, label: 'Orta', color: '#EAB308' },
    { score: 4, label: 'Güçlü', color: '#22C55E' },
  ]
  return map[s - 1] ?? { score: 0, label: '', color: '#CBD5E1' }
}

export default function ResetPasswordScreen() {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [focused, setFocused] = useState<'new' | 'confirm' | null>(null)
  const [loading, setLoading] = useState(false)

  const confirmRef = useRef<TextInput>(null)

  const pw = strength(newPw)
  const segments = [0, 1, 2, 3]

  const rules = [
    { ok: newPw.length >= 8, text: 'En az 8 karakter' },
    { ok: /[A-Z]/.test(newPw), text: 'Büyük harf' },
    { ok: /[0-9]/.test(newPw), text: 'Rakam' },
  ]

  const canSubmit = newPw.length >= 8 && newPw === confirmPw && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      Alert.alert('Başarılı', 'Şifren güncellendi.', [
        { text: 'Tamam', onPress: () => router.replace('/(tabs)/map') },
      ])
    } catch (e: any) {
      const msg = e?.message ?? ''
      if (msg.toLowerCase().includes('session')) {
        Alert.alert('Link Geçersiz', 'Şifre sıfırlama linki süresi dolmuş. Yeni bir link talep et.', [
          { text: 'Tamam', onPress: () => router.replace('/(auth)/login') },
        ])
      } else {
        Alert.alert('Hata', toTurkishError(msg))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.backBtn}>
            <Ionicons name="lock-reset" size={18} color={colors.accent} />
          </View>
          <Text style={styles.title}>Yeni Şifre Belirle</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.hint}>
            Hesabın için yeni bir şifre belirle.
          </Text>

          {/* Yeni şifre */}
          <View>
            <Text style={styles.fieldLabel}>Yeni Şifre</Text>
            <View style={[styles.inputRow, focused === 'new' && styles.inputRowFocused]}>
              <TextInput
                style={styles.input}
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setFocused('new')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => confirmRef.current?.focus()}
                placeholderTextColor={colors.textSecondary}
                placeholder="••••••••"
                autoFocus
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {newPw.length > 0 && (
              <>
                <View style={styles.strengthBar}>
                  {segments.map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: i < pw.score ? pw.color : colors.border },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: pw.score > 0 ? pw.color : colors.textSecondary }]}>
                  {pw.label}
                </Text>
                <View style={styles.rules}>
                  {rules.map(r => (
                    <View style={styles.rule} key={r.text}>
                      <Ionicons
                        name={r.ok ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={r.ok ? '#22C55E' : colors.textSecondary}
                      />
                      <Text style={[styles.ruleText, { color: r.ok ? colors.textPrimary : colors.textSecondary }]}>
                        {r.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Şifre onayla */}
          <View>
            <Text style={styles.fieldLabel}>Şifreyi Onayla</Text>
            <View style={[
              styles.inputRow,
              focused === 'confirm' && styles.inputRowFocused,
              confirmPw.length > 0 && newPw !== confirmPw ? styles.inputRowError : {},
            ]}>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleSubmit}
                placeholderTextColor={colors.textSecondary}
                placeholder="••••••••"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {confirmPw.length > 0 && newPw !== confirmPw && (
              <Text style={styles.errorText}>Şifreler eşleşmiyor</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.accent : colors.border }]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitLabel}>Şifreyi Kaydet</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
