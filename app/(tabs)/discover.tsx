import { useEffect, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useEvents, Event } from '../../lib/hooks/useEvents'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'
import { CATEGORIES_WITH_ALL } from '../../constants/categories'

type SortKey = 'date' | 'distance'

// Haversine — sadece bir kez çağrılır (useMemo içinde)
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function createStyles(c: ColorTheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
    sortRow: { flexDirection: 'row', gap: 8 },
    sortChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 10, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.surface,
    },
    sortChipActive: { borderColor: c.accent, backgroundColor: c.accent + '18' },
    sortText: { fontSize: 12, color: c.textSecondary, fontWeight: '500' },
    sortTextActive: { color: c.accent, fontWeight: '600' },
    categoryScrollView: { flexGrow: 0, flexShrink: 0 },
    categoryScroll: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, gap: 12 },
    categoryChip: { alignItems: 'center', gap: 4 },
    categoryBubble: {
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    categoryBubbleActive: { borderColor: c.accent, backgroundColor: c.accent + '15' },
    categoryIcon: { fontSize: 18 },
    categoryName: { fontSize: 10, color: c.textSecondary, fontWeight: '500' },
    categoryNameActive: { color: c.accent, fontWeight: '600' },
    list: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120, gap: 10 },
    card: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface, borderRadius: 16,
      borderWidth: 1, borderColor: c.border,
      padding: 14, gap: 12,
    },
    cardLeft: {},
    emojiBox: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: c.surface2,
      borderWidth: 1, borderColor: c.border,
      alignItems: 'center', justifyContent: 'center',
    },
    emojiText: { fontSize: 24 },
    cardBody: { flex: 1, gap: 4 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
    cardAddress: { fontSize: 12, color: c.textSecondary },
    cardMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: c.accent, fontWeight: '500' },
    metaTextSecondary: { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
    chevron: { marginLeft: 4 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 60, gap: 8 },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    emptySubtitle: { fontSize: 13, color: c.textSecondary },
  })
}

// O3: dist prop dışarıdan geliyor — render'da tekrar hesaplanmıyor
function EventCard({ event, dist, colors, styles }: { event: Event; dist: number; colors: ColorTheme; styles: ReturnType<typeof createStyles> }) {
  const emoji = event.emoji ?? '📍'
  const distLabel = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`

  const date = new Date(event.starts_at)
  const dateLabel = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  const timeLabel = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const isToday = new Date().toDateString() === date.toDateString()
  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === date.toDateString()
  const dayLabel = isToday ? 'Bugün' : isTomorrow ? 'Yarın' : dateLabel

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/event/${event.id}`)}>
      <View style={styles.cardLeft}>
        <View style={styles.emojiBox}>
          <Text style={styles.emojiText}>{emoji}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
        {event.address ? (
          <Text style={styles.cardAddress} numberOfLines={1}>📍 {event.address}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={colors.accent} />
            <Text style={styles.metaText}>{dayLabel} · {timeLabel}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="navigate-outline" size={11} color={colors.textSecondary} />
            <Text style={styles.metaTextSecondary}>{distLabel}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} style={styles.chevron} />
    </TouchableOpacity>
  )
}

export default function DiscoverScreen() {
  const [location, setLocation] = useState({ lat: 41.0082, lng: 28.9784 })
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('date')
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { events, loading, refetch } = useEvents(location.lat, location.lng, 25)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({})
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    })()
  }, [])

  // O3: Mesafe bir kez hesaplanıyor, sort comparator'da tekrar çalışmıyor
  const filtered = useMemo(() => {
    const withDist = events.map(e => ({
      ...e,
      _dist: distanceKm(location.lat, location.lng, e.latitude, e.longitude),
    }))
    return withDist
      .filter(e => selectedCategory === null || e.category_id === selectedCategory)
      .sort((a, b) =>
        sort === 'date'
          ? new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          : a._dist - b._dist
      )
  }, [events, selectedCategory, sort, location.lat, location.lng])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keşfet</Text>
        <View style={styles.sortRow}>
          <TouchableOpacity
            style={[styles.sortChip, sort === 'date' && styles.sortChipActive]}
            onPress={() => setSort('date')}
          >
            <Ionicons name="calendar-outline" size={12} color={sort === 'date' ? colors.accent : colors.textSecondary} />
            <Text style={[styles.sortText, sort === 'date' && styles.sortTextActive]}>Tarih</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortChip, sort === 'distance' && styles.sortChipActive]}
            onPress={() => setSort('distance')}
          >
            <Ionicons name="navigate-outline" size={12} color={sort === 'distance' ? colors.accent : colors.textSecondary} />
            <Text style={[styles.sortText, sort === 'distance' && styles.sortTextActive]}>Mesafe</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryScrollView}
      >
        {CATEGORIES_WITH_ALL.map(cat => {
          const active = selectedCategory === cat.id
          return (
            <TouchableOpacity
              key={String(cat.id)}
              style={styles.categoryChip}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <View style={[styles.categoryBubble, active && styles.categoryBubbleActive]}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
              </View>
              <Text style={[styles.categoryName, active && styles.categoryNameActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔭</Text>
          <Text style={styles.emptyTitle}>Event bulunamadı</Text>
          <Text style={styles.emptySubtitle}>Bu kategoride yakında event yok</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <EventCard event={item} dist={item._dist} colors={colors} styles={styles} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.accent} />
          }
        />
      )}
    </View>
  )
}
