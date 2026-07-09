import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, Card, ActivityIndicator, useTheme } from 'react-native-paper'
import { coverLetter } from '@/api'

export function CoverLetterScreen() {
  const theme = useTheme()
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobContext, setJobContext] = useState('')
  const [resumeContext, setResumeContext] = useState('')
  const [type, setType] = useState('cover')
  const [tone, setTone] = useState('professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function generate() {
    if (!jobContext.trim() || !resumeContext.trim()) {
      setError('Please fill in your background and the job context')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { letter } = await coverLetter.generate({ type, tone, company, role, jobContext, resumeContext })
      setResult(letter.content)
    } catch (e: any) {
      setError(e.message || 'Generation failed')
    }
    setLoading(false)
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>Cover Letter Generator</Text>

        <View style={styles.row}>
          <TextInput label="Company" value={company} onChangeText={setCompany} mode="outlined" style={{ flex: 1 }} />
          <TextInput label="Role" value={role} onChangeText={setRole} mode="outlined" style={{ flex: 1, marginLeft: 8 }} />
        </View>

        <TextInput
          label="Your background (experience, skills...)"
          value={resumeContext}
          onChangeText={setResumeContext}
          mode="outlined" multiline numberOfLines={4} style={styles.input}
        />

        <TextInput
          label="Job context (why you want it, hiring manager...)"
          value={jobContext}
          onChangeText={setJobContext}
          mode="outlined" multiline numberOfLines={4} style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button mode="contained" onPress={generate} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Generate Letter'}
        </Button>

        {result ? (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.letterText}>{result}</Text>
            </Card.Content>
          </Card>
        ) : null}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 12 },
  input: { marginBottom: 12 },
  button: { borderRadius: 8, marginBottom: 16 },
  error: { color: '#ef4444', marginBottom: 8 },
  resultCard: { borderRadius: 12 },
  letterText: { lineHeight: 22 },
})
