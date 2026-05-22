import { Redirect } from 'expo-router'
import { useAuth } from '../lib/hooks/useAuth'
import { ActivityIndicator, View } from 'react-native'

export default function Index() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (session) return <Redirect href="/(tabs)/map" />
  return <Redirect href="/(auth)/login" />
}
