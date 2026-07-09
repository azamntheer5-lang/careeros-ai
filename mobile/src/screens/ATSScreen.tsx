import { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, TextInput, Button, Card, ActivityIndicator, ProgressBar, useTheme } from 'react-native-paper'
import { ats } from '@/api'

export function ATSScreen() {
  const theme = useTheme()
  const [resumeText, setResumeText] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function analyze() {
    if (!jobDesc.trim()) { setError('Please paste the job description'); return }
    setError('')
    setLoading(true)
    try {
      const { analysis } = await ats.analyze({ resumeText: resumeText || undefined, jobDescription: jobDesc })
      setResult(analysis)
    } catch (e: any) {
      setError(e.message || 'Analysis failed')
    }
    setLoading(false)
  }

  const scoreColor = result?.score >= 80 ? '#10b981' : result?.score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>ATS Analysis</Text>

        <TextInput
          label="Your resume text (optional — uses your latest resume if empty)"
          value={resumeText}
          onChangeText={setResumeText}
          mode="outlined"
          multiline
          numberOfLines={5}
          style={styles.input}
        />

        <TextInput
          label="Job description"
          value={jobDesc}
          onChangeText={setJobDesc}
          mode="outlined"
          multiline
          numberOfLines={6}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button mode="contained" onPress={analyze} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : 'Analyze Match'}
        </Button>

        {result && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <View style={styles.scoreRow}>
                <Text variant="displaySmall" style={{ color: scoreColor, fontWeight: 'bold' }}>
                  {result.score}
                </Text>
                <Text variant="bodyLarge">/ 100</Text>
              </View>
              <Text variant="titleLarge" style={{ color: scoreColor }}>{result.grade}</Text>

              <ProgressBar progress={(result.score || 0) / 100} color={scoreColor} style={styles.bar} />

              <Text variant="titleSmall" style={styles.sectionTitle}>Keyword Match</Text>
              <Text variant="bodyMedium">{result.keywordScore}%</Text>

              <Text variant="titleSmall" style={styles.sectionTitle}>Matched Keywords</Text>
              {result.matchedKeywords?.map((k: string, i: number) => (
                <Text key={i} variant="bodySmall" style={styles.keyword}>✓ {k}</Text>
              ))}

              <Text variant="titleSmall" style={styles.sectionTitle}>Missing Keywords</Text>
              {result.missingKeywords?.map((k: string, i: number) => (
                <Text key={i} variant="bodySmall" style={{ color: '#ef4444' }}>✗ {k}</Text>
              ))}

              <Text variant="titleSmall" style={styles.sectionTitle}>Recommendations</Text>
              {result.recommendations?.map((r: any, i: number) => (
                <Text key={i} variant="bodySmall" style={styles.rec}>• {r.suggestion}</Text>
              ))}
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 16 },
  input: { marginBottom: 12 },
  button: { borderRadius: 8, marginBottom: 16 },
  error: { color: '#ef4444', marginBottom: 8 },
  resultCard: { borderRadius: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  bar: { marginVertical: 12, height: 8, borderRadius: 4 },
  sectionTitle: { marginTop: 16, marginBottom: 4, fontWeight: '600' },
  keyword: { color: '#10b981', marginTop: 2 },
  rec: { color: '#64748b', marginTop: 4 },
})
