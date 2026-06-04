import { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'

const { width } = Dimensions.get('window')

const ACCENT_START = '#396afc'
const ACCENT_END = '#2948ff'
const BG = '#070B10'
const TEXT = '#F1F5F9'
const MUTED = '#94A3B8'
const SURFACE = 'rgba(57,106,252,0.08)'
const BORDER = 'rgba(255,255,255,0.09)'

type SlideData = {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap
  title: string
  desc: string
}

const SLIDES: SlideData[] = [
  {
    icon: 'compass-outline',
    title: 'Paltivity\'ye\nHoş Geldin',
    desc: 'Çevrende neler olduğunu keşfet, etkinlikler oluştur, insanlarla buluş.',
  },
  {
    icon: 'people-outline',
    title: 'Keşfet & Katıl',
    desc: 'Yakınındaki etkinlikleri haritada gör, bir tıkla katıl, yeni insanlarla tanış.',
  },
  {
    icon: 'location-outline',
    title: 'Konumunu Paylaş',
    desc: 'Etkinlikleri haritada görmek için konum iznine ihtiyacımız var.',
  },
]

async function completeOnboarding() {
  await AsyncStorage.setItem('paltivity:onboarding_v1', '1')
  router.replace('/(tabs)/map')
}

async function handleFinish() {
  await Location.requestForegroundPermissionsAsync()
  await completeOnboarding()
}

function Slide({ item }: { item: SlideData }) {
  return (
    <View style={styles.slide}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon} size={52} color={ACCENT_START} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>
    </View>
  )
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  )
}

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const listRef = useRef<FlatList>(null)
  const isLast = index === SLIDES.length - 1

  const next = () => {
    if (isLast) {
      handleFinish()
      return
    }
    const next = index + 1
    listRef.current?.scrollToIndex({ index: next, animated: true })
    setIndex(next)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={completeOnboarding}>
        <Text style={styles.skipText}>Atla</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Slide item={item} />}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.list}
      />

      <View style={styles.bottom}>
        <Dots count={SLIDES.length} active={index} />

        <TouchableOpacity onPress={next} activeOpacity={0.85}>
          <LinearGradient
            colors={[ACCENT_START, ACCENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>
              {isLast ? 'Başla' : 'İleri'}
            </Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 15,
    color: MUTED,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  iconWrap: {
    width: 104,
    height: 104,
    borderRadius: 32,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  desc: {
    fontSize: 16,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: ACCENT_START,
  },
  dotInactive: {
    width: 6,
    backgroundColor: BORDER,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    width: width - 48,
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
})
