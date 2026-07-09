import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, Card, ActivityIndicator, Chip, useTheme } from 'react-native-paper'
import { resumes } from '@/api'

export function ResumeGeneratorScreen() {
  const theme = useTheme()
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!context.trim()) { setError('Please paste your background information'); return }
    setError('')
    setLoading(true)
    try {
      const { resume } = await resumes.generate(context)
      setResult(resume)
    } catch (e: any) {
      setError(e.message || 'Generation failed')
    }
    setLoading(false)
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>AI Resume Generator</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Paste your experience, skills, and background. AI will generate a professional resume.
        </Text>

        <TextInput
          label="Your background (experience, skills, education...)"
          value={context}
          onChangeText={setContext}
          mode="outlined"
          multiline
          numberOfLines={8}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button mode="contained" onPress={generate} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Generate Resume'}
        </Button>

        {result && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="titleLarge">{result.title || 'Generated Resume'}</Text>
              {result.data?.summary && (
                <Text variant="bodyMedium" style={styles.section}>{result.data.summary}</Text>
              )}
              {result.data?.experience?.map((exp: any, i: number) => (
                <View key={i} style={styles.expItem}>
                  <Text variant="titleMedium">{exp.title} at {exp.company}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {exp.startDate} - {exp.endDate}
                  </Text>
                  {exp.bullets?.map((b: string, j: number) => (
                    <Text key={j} variant="bodySmall" style={styles.bullet}>• {b}</Text>
                  ))}
                </View>
              ))}
              {result.data?.skills && (
                <View style={styles.skillsRow}>
                  {result.data.skills.map((s: string, i: number) => (
                    <Chip key={i} style={styles.chip}>{s}</Chip>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  input: { marginBottom: 12 },
  button: { borderRadius: 8, marginBottom: 16 },
  error: { color: '#ef4444', marginBottom: 8 },
  resultCard: { borderRadius: 12 },
  section: { marginTop: 8, color: '#475569' },
  expItem: { marginTop: 12 },
  bullet: { marginLeft: 8, marginTop: 2, color: '#64748b' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  chip: { margin: 2 },
})
