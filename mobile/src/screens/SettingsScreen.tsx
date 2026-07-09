import { View, StyleSheet } from 'react-native'
import { Text, Card, List, Switch, useTheme } from 'react-native-paper'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export function SettingsScreen() {
  const theme = useTheme()
  const { logout } = useAuth()
  const [darkMode, setDarkMode] = useState(true)

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall" style={styles.title}>Settings</Text>

      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title="Dark Mode"
            description="Toggle app theme"
            left={() => <List.Icon icon="theme-light-dark" />}
            right={() => <Switch value={darkMode} onValueChange={setDarkMode} />}
          />
          <List.Item
            title="AI Backend"
            description="Connected to CareerOS AI"
            left={() => <List.Icon icon="server-network" />}
          />
          <List.Item
            title="Version"
            description="1.0.0"
            left={() => <List.Icon icon="information" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title="Sign Out"
            description="Log out of your account"
            left={() => <List.Icon icon="logout" color="#ef4444" />}
            onPress={logout}
          />
        </Card.Content>
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  card: { borderRadius: 12, marginBottom: 12 },
})
