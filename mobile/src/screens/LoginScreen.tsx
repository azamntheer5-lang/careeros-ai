import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, TextInput, Button, Card, Divider, ActivityIndicator } from 'react-native-paper'
import { useAuth } from '@/hooks/useAuth'

export function LoginScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        if (password.length < 8) {
          setError('Password must be at least 8 characters')
          setLoading(false)
          return
        }
        await register(email.trim(), password, name.trim())
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>CareerOS AI</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>The AI Career Operating System</Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.formTitle}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>

          {mode === 'register' && (
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={loading}
            style={styles.button}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="text"
            onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </Button>
        </Card.Content>
      </Card>

      <Text variant="bodySmall" style={styles.footer}>
        Connects to CareerOS AI backend
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontWeight: 'bold', color: '#10b981' },
  subtitle: { color: '#64748b', marginTop: 4 },
  card: { borderRadius: 16 },
  formTitle: { marginBottom: 16, fontWeight: '600' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, borderRadius: 8 },
  divider: { marginVertical: 16 },
  error: { color: '#ef4444', marginBottom: 8, fontSize: 13 },
  footer: { textAlign: 'center', marginTop: 24, color: '#94a3b8' },
})
