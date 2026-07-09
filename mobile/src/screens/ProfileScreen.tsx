import { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper'
import { profile } from '@/api'
import { useAuth } from '@/hooks/useAuth'

export function ProfileScreen() {
  const theme = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { profile } = await profile.get()
      setData(profile)
    } catch {}
  }

  async function save() {
    setSaving(true)
    try {
      await profile.update(data)
    } catch {}
    setSaving(false)
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>Career Profile</Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Email</Text>
            <Text variant="bodyLarge" style={{ marginBottom: 12 }}>{user?.email}</Text>

            <TextInput label="Target Role" value={data?.targetRole || ''} onChangeText={(v) => setData({ ...data, targetRole: v })} mode="outlined" style={styles.input} />
            <TextInput label="Industry" value={data?.industry || ''} onChangeText={(v) => setData({ ...data, industry: v })} mode="outlined" style={styles.input} />
            <TextInput label="Seniority" value={data?.seniority || ''} onChangeText={(v) => setData({ ...data, seniority: v })} mode="outlined" style={styles.input} />
            <TextInput label="Location" value={data?.location || ''} onChangeText={(v) => setData({ ...data, location: v })} mode="outlined" style={styles.input} />
            <TextInput label="LinkedIn URL" value={data?.linkedinUrl || ''} onChangeText={(v) => setData({ ...data, linkedinUrl: v })} mode="outlined" style={styles.input} />
            <TextInput label="Career Goals" value={data?.careerGoals || ''} onChangeText={(v) => setData({ ...data, careerGoals: v })} mode="outlined" multiline numberOfLines={3} style={styles.input} />

            <Button mode="contained" onPress={save} disabled={saving} style={styles.button}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  card: { borderRadius: 12 },
  input: { marginBottom: 12 },
  button: { borderRadius: 8, marginTop: 8 },
})
