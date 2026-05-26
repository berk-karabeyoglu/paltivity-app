/**
 * AppDateTimePicker
 *
 * iOS  → native spinner in a bottom sheet (locale tr-TR, 24h)
 * Android → custom calendar grid (tarih) + +/- saat/dakika seçici (saat)
 *           Tamamen Türkçe, AM/PM yok, 24 saat formatı.
 *
 * NOT: Sheet / Header / Footer gibi iç component tanımlamak yasak —
 * her render'da yeni referans oluşur, Modal unmount/remount yapar.
 * Tüm JSX inline yazılmalı.
 */

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native'
import RNDateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useColors } from '../../lib/hooks/useColors'

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]
const WEEKDAYS_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa']

type Step = 'date' | 'time'

type Props = {
  visible: boolean
  value: Date
  initialStep?: Step
  minimumDate?: Date
  onConfirm: (date: Date) => void
  onCancel: () => void
}

export default function AppDateTimePicker({
  visible, value, initialStep = 'date', minimumDate, onConfirm, onCancel,
}: Props) {
  const colors = useColors()

  const [step, setStep] = useState<Step>(initialStep)
  const [tempDate, setTempDate] = useState(value)
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())

  // Sadece modal açılınca sıfırla
  useEffect(() => {
    if (visible) {
      setStep(initialStep)
      setTempDate(value)
      setViewYear(value.getFullYear())
      setViewMonth(value.getMonth())
    }
  }, [visible])

  // ── Takvim yardımcıları ──────────────────────────────────────────────────

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (day: number) => {
    const d = new Date(tempDate)
    d.setFullYear(viewYear, viewMonth, day)
    setTempDate(d)
  }

  const isDisabled = (day: number) => {
    if (!minimumDate) return false
    const cell = new Date(viewYear, viewMonth, day)
    const min = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())
    return cell < min
  }

  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedDay =
    tempDate.getMonth() === viewMonth && tempDate.getFullYear() === viewYear
      ? tempDate.getDate()
      : null

  // ── Saat yardımcıları ────────────────────────────────────────────────────

  const isTodaySelected = (d: Date) => {
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  const changeHour = (delta: number) => {
    const d = new Date(tempDate)
    let h = (d.getHours() + delta + 24) % 24
    if (isTodaySelected(d)) h = Math.max(h, new Date().getHours())
    d.setHours(h)
    // Saati sınırladıktan sonra dakikayı da kontrol et
    if (isTodaySelected(d) && d.getHours() === new Date().getHours()) {
      d.setMinutes(Math.max(d.getMinutes(), new Date().getMinutes()))
    }
    setTempDate(d)
  }

  const changeMinute = (delta: number) => {
    const d = new Date(tempDate)
    const now = new Date()
    let m = (d.getMinutes() + delta + 60) % 60
    if (isTodaySelected(d) && d.getHours() === now.getHours()) {
      m = Math.max(m, now.getMinutes())
    }
    d.setMinutes(m)
    setTempDate(d)
  }

  const handlePrimary = () => {
    if (step === 'date') {
      // Tarih adımından saate geçerken, bugün seçildiyse minimum saati garantile
      const d = new Date(tempDate)
      const now = new Date()
      if (isTodaySelected(d)) {
        const minH = now.getHours()
        const minM = now.getMinutes() + 1 // tam şu anı geçersiz say
        if (d.getHours() < minH || (d.getHours() === minH && d.getMinutes() < minM)) {
          d.setHours(minH, minM, 0, 0)
          setTempDate(d)
        }
      }
      setStep('time')
    } else {
      onConfirm(tempDate)
    }
  }

  const handleSecondary = () => {
    if (step === 'time' && initialStep === 'date') setStep('date')
    else onCancel()
  }

  const twoStep = initialStep === 'date'
  const primaryLabel = step === 'date' ? 'Devam →' : 'Tamam'
  const secondaryLabel = step === 'time' && twoStep ? '← Geri' : 'İptal'

  // ── Ortak iç bileşenler (inline, component tanımı değil) ─────────────────

  const handle = (
    <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 14 }} />
  )

  const stepPills = twoStep ? (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 24, paddingTop: 16 }}>
      <View style={{ height: 4, width: 28, borderRadius: 2, backgroundColor: colors.accent }} />
      <View style={{ height: 4, width: 28, borderRadius: 2, backgroundColor: step === 'time' ? colors.accent : colors.border }} />
    </View>
  ) : null

  const title = (
    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 4 }}>
      {step === 'date' ? 'Tarih Seç' : 'Saat Seç'}
    </Text>
  )

  const footer = (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16 }}>
      <TouchableOpacity
        style={{ flex: 1, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        onPress={handleSecondary}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>{secondaryLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={{ flex: 2, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
        onPress={handlePrimary}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{primaryLabel}</Text>
      </TouchableOpacity>
    </View>
  )

  // ════════════════════════════════════════════════════════════════════════
  // iOS — native spinner
  // ════════════════════════════════════════════════════════════════════════

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
          activeOpacity={1}
          onPress={onCancel}
        >
          <View
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 34 }}
            onStartShouldSetResponder={() => true}
          >
            {handle}
            {stepPills}
            {title}
            <RNDateTimePicker
              value={tempDate}
              mode={step}
              display="spinner"
              onChange={(_, d) => { if (d) setTempDate(d) }}
              minimumDate={step === 'date' ? minimumDate : undefined}
              locale="tr-TR"
              textColor={colors.textPrimary}
            />
            {footer}
          </View>
        </TouchableOpacity>
      </Modal>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // Android — özel takvim + saat seçici
  // ════════════════════════════════════════════════════════════════════════

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 28 }}
          onStartShouldSetResponder={() => true}
        >
          {handle}
          {stepPills}
          {title}

          {step === 'date' ? (
            <>
              {/* Ay navigasyonu */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                <TouchableOpacity onPress={prevMonth} style={{ padding: 10 }}>
                  <Ionicons name="chevron-back" size={22} color={colors.accent} />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  {MONTHS_TR[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={{ padding: 10 }}>
                  <Ionicons name="chevron-forward" size={22} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Gün başlıkları */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 }}>
                {WEEKDAYS_TR.map(d => (
                  <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Takvim grid */}
              <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
                {Array.from({ length: cells.length / 7 }, (_, row) => (
                  <View key={row} style={{ flexDirection: 'row' }}>
                    {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                      const disabled = day !== null && isDisabled(day)
                      const selected = day !== null && day === selectedDay
                      return (
                        <TouchableOpacity
                          key={col}
                          style={{ flex: 1, alignItems: 'center', paddingVertical: 5 }}
                          onPress={() => day && !disabled && selectDay(day)}
                          disabled={!day || disabled}
                          activeOpacity={0.65}
                        >
                          {/* overflow:hidden + ayrı bg View: Android'de borderRadius render bug'ını önler */}
                          <View style={{ width: 36, height: 36, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: selected ? colors.accent : 'transparent' }]} />
                            {day ? (
                              <Text style={{
                                fontSize: 14,
                                fontWeight: selected ? '700' : '400',
                                color: selected ? '#fff' : disabled ? colors.border : colors.textPrimary,
                              }}>
                                {day}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                ))}
              </View>
            </>
          ) : (
            /* Saat seçici */
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                {/* Saat */}
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => changeHour(1)} style={{ padding: 10 }} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
                    <Ionicons name="chevron-up" size={30} color={colors.accent} />
                  </TouchableOpacity>
                  <View style={{
                    width: 88, height: 72, borderRadius: 18,
                    backgroundColor: colors.accent + '12',
                    borderWidth: 1.5, borderColor: colors.accent + '40',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 40, fontWeight: '700', color: colors.textPrimary, letterSpacing: -1 }}>
                      {String(tempDate.getHours()).padStart(2, '0')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => changeHour(-1)} style={{ padding: 10 }} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
                    <Ionicons name="chevron-down" size={30} color={colors.accent} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginTop: 2 }}>Saat</Text>
                </View>

                {/* Ayraç */}
                <Text style={{ fontSize: 40, fontWeight: '700', color: colors.textPrimary, marginBottom: 28 }}>:</Text>

                {/* Dakika */}
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => changeMinute(1)} style={{ padding: 10 }} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
                    <Ionicons name="chevron-up" size={30} color={colors.accent} />
                  </TouchableOpacity>
                  <View style={{
                    width: 88, height: 72, borderRadius: 18,
                    backgroundColor: colors.accent + '12',
                    borderWidth: 1.5, borderColor: colors.accent + '40',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 40, fontWeight: '700', color: colors.textPrimary, letterSpacing: -1 }}>
                      {String(tempDate.getMinutes()).padStart(2, '0')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => changeMinute(-1)} style={{ padding: 10 }} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
                    <Ionicons name="chevron-down" size={30} color={colors.accent} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginTop: 2 }}>Dakika</Text>
                </View>

              </View>
            </View>
          )}

          {footer}
        </View>
      </TouchableOpacity>
    </Modal>
  )
}
