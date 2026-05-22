import { useRef, useEffect, useMemo } from 'react'
import { Tabs } from 'expo-router'
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useUnread } from '../../lib/hooks/useUnreadNotifications'
import { useColors } from '../../lib/hooks/useColors'
import { ColorTheme } from '../../constants/colors'

const { width } = Dimensions.get('window')

type IconName = React.ComponentProps<typeof Ionicons>['name']

const TAB_CONFIG: Record<string, { icon: IconName; activeIcon: IconName; label: string }> = {
  map:           { icon: 'map-outline',           activeIcon: 'map',           label: 'Harita'  },
  discover:      { icon: 'compass-outline',        activeIcon: 'compass',       label: 'Keşfet'  },
  create:        { icon: 'add',                    activeIcon: 'add',           label: ''        },
  notifications: { icon: 'notifications-outline',  activeIcon: 'notifications', label: 'Bildirim'},
  profile:       { icon: 'person-outline',         activeIcon: 'person',        label: 'Profil'  },
}

function createStyles(c: ColorTheme) {
  const TAB_ACTIVE_BG = c.accent + '2E'
  const TAB_BORDER = c.border

  return StyleSheet.create({
    barContainer: {
      position: 'absolute', bottom: BOTTOM,
      left: 16, right: 16,
    },
    bar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 28, borderWidth: 1, borderColor: TAB_BORDER,
      paddingHorizontal: 8, height: 68,
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 20,
    },
    tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
    tabContent: {
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 14, gap: 2,
    },
    tabContentActive: { backgroundColor: TAB_ACTIVE_BG },
    iconWrap: { position: 'relative' },
    tabLabel: { fontSize: 9, color: c.textSecondary, fontWeight: '500' },
    tabLabelActive: { color: c.accent, fontWeight: '700' },
    createWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    createBtn: {
      width: 52, height: 52, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 12,
    },
    badge: {
      position: 'absolute', top: -5, right: -8,
      backgroundColor: c.accentSecondary, borderRadius: 99,
      minWidth: 16, height: 16,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  })
}

function TabItem({ route, isFocused, onPress }: { route: any; isFocused: boolean; onPress: () => void }) {
  const { unreadCount } = useUnread()
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start()
    }
  }, [isFocused])

  const config = TAB_CONFIG[route.name]
  if (!config) return null

  if (route.name === 'create') {
    return (
      <TouchableOpacity style={styles.createWrapper} onPress={onPress} activeOpacity={0.85}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <LinearGradient
            colors={[colors.accent, colors.accentSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createBtn}
          >
            <Ionicons name="add" size={30} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  const showBadge = route.name === 'notifications' && unreadCount > 0

  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.tabContent,
          isFocused && styles.tabContentActive,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isFocused ? config.activeIcon : config.icon}
            size={22}
            color={isFocused ? colors.accent : colors.textSecondary}
          />
          {showBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
        {config.label ? (
          <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
            {config.label}
          </Text>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  )
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.barContainer} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => (
          <TabItem
            key={route.key}
            route={route}
            isFocused={state.index === index}
            onPress={() => navigation.navigate(route.name)}
          />
        ))}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="map" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="create" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  )
}

const BOTTOM = Platform.OS === 'ios' ? 34 : 16
