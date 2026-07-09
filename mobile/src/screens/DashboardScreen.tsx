import { useState, useEffect, useCallback } from 'react'
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native'
import { Text, Card, Button, IconButton, ProgressBar, useTheme } from 'react-native-paper'
import { dashboard } from '@/api'
import { useAuth } from '@/hooks/useAuth'

type DashboardData = {
  stats: { resumes: number; jobs: number; interviews: number; avgAts: number }
  pipeline: { status: string; count: number }[]
}

export function DashboardScreen({ navigation }: any) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const theme = useTheme()

  const load = useCallback(async () => {
    try {
      const d = await dashboard.get()
      setData(d)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const stats = [
    { label: 'Resumes', value: data?.stats.resumes ?? 0, icon: 'file-document', color: '#10b981' },
    { label: 'Applications', value: data?.stats.jobs ?? 0, icon: 'briefcase', color: '#06b6d4' },
    { label: 'Interviews', value: data?.stats.interviews ?? 0, icon: 'microphone', color: '#f59e0b' },
    { label: 'ATS Score', value: `${data?.stats.avgAts ?? 0}%`, icon: 'target', color: '#ef4444' },
  ]

  const actions = [
    { label: 'AI Resume', icon: 'magic-staff', screen: 'ResumeGenerator' },
    { label: 'ATS Analysis', icon: 'magnify', screen: 'ATS' },
    { label: 'Cover Letter', icon: 'email-edit', screen: 'CoverLetter' },
    { label: 'Profile', icon: 'account', screen: 'Profile' },
  ]

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineSmall">Welcome, {user?.name?.split(' ')[0] || 'there'}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Your career command center
          </Text>
        </View>

        <View style={styles.statsRow}>
          {stats.map((s, i) => (
            <Card key={i} style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <IconButton icon={s.icon} size={20} iconColor={s.color} />
                <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>{s.value}</Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{s.label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {actions.map((a, i) => (
            <Card key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
              <Card.Content style={styles.actionContent}>
                <IconButton icon={a.icon} size={24} iconColor={theme.colors.primary} />
                <Text variant="labelMedium">{a.label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {data?.pipeline && data.pipeline.length > 0 && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>Application Pipeline</Text>
            <Card>
              <Card.Content>
                {data.pipeline.map((p, i) => (
                  <View key={i} style={styles.pipelineRow}>
                    <Text variant="bodyMedium" style={{ textTransform: 'capitalize' }}>{p.status}</Text>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{p.count}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { marginBottom: 20 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12 },
  statContent: { alignItems: 'center', paddingVertical: 8 },
  sectionTitle: { marginTop: 20, marginBottom: 12, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: { flex: 1, minWidth: '45%', borderRadius: 12 },
  actionContent: { alignItems: 'center', paddingVertical: 8 },
  pipelineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
})
