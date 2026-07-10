'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Shield, Download, Trash2, KeyRound, FileText, Lock, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react'

export function SecurityModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaBusy, setMfaBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  // Privacy preferences stored locally (no schema field yet)
  const [aiTraining, setAiTraining] = useState(false)
  const [analytics, setAnalytics] = useState(true)

  useEffect(() => {
    api<{ logs: any[] }>('/api/audit?limit=30').then(({ logs }) => setAuditLogs(logs)).catch(() => {})
    api<{ mfaEnabled: boolean }>('/api/security/settings').then((r) => setMfaEnabled(r.mfaEnabled)).catch(() => {})
    // Load local privacy prefs
    try {
      setAiTraining(localStorage.getItem('pref_ai_training') === '1')
      setAnalytics(localStorage.getItem('pref_analytics') !== '0')
    } catch {}
  }, [])

  const toggleMfa = async (v: boolean) => {
    setMfaBusy(true)
    try {
      await api('/api/security/settings', { method: 'PUT', body: { mfaEnabled: v } })
      setMfaEnabled(v)
      toast({ title: v ? 'MFA enabled' : 'MFA disabled', description: v ? 'You will need a TOTP code on next login.' : 'MFA has been turned off.' })
    } catch (e) {
      toast({ title: 'Failed to update MFA', description: (e as Error).message, variant: 'destructive' })
    } finally { setMfaBusy(false) }
  }

  const savePrivacy = (key: string, value: boolean, setter: (v: boolean) => void) => {
    try { localStorage.setItem(key, value ? '1' : '0') } catch {}
    setter(value)
    toast({ title: 'Preference saved', description: 'Stored locally on this device.' })
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/security/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `careeros-data-export-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: 'Data exported', description: 'Your full data archive has been downloaded.' })
    } catch (e) { toast({ title: 'Export failed', description: (e as Error).message, variant: 'destructive' }) }
    finally { setExporting(false) }
  }

  const deleteAccount = async () => {
    try {
      await api('/api/security/delete', { method: 'POST' })
      toast({ title: 'Account deleted', description: 'All your data has been permanently removed.' })
      setTimeout(() => window.location.reload(), 2000)
    } catch (e) { toast({ title: 'Deletion failed', description: (e as Error).message, variant: 'destructive' }) }
  }

  return (
    <div>
      <ModuleHeader title={t('securityTitle')} subtitle={t('securitySub')} icon={Shield} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Security settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><KeyRound className="h-4 w-4 text-brand" /> Authentication</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Multi-factor authentication</div>
                  <div className="text-xs text-muted-foreground">Add an extra layer of security with TOTP</div>
                </div>
                <Switch checked={mfaEnabled} onCheckedChange={toggleMfa} disabled={mfaBusy} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">SSO (SAML)</div>
                  <div className="text-xs text-muted-foreground">Single sign-on for enterprise tenants</div>
                </div>
                <Badge variant="outline" className="text-[10px]">Enterprise</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4 text-brand" /> {t('privacyControls')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">Profile visibility</div><div className="text-xs text-muted-foreground">Who can see your career profile</div></div>
                <Badge variant="outline">Private</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">AI training data</div><div className="text-xs text-muted-foreground">Opt out of model improvement</div></div>
                <Switch checked={aiTraining} onCheckedChange={(v) => savePrivacy('pref_ai_training', v, setAiTraining)} />
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-sm font-medium">Analytics tracking</div><div className="text-xs text-muted-foreground">Product usage analytics</div></div>
                <Switch checked={analytics} onCheckedChange={(v) => savePrivacy('pref_analytics', v, setAnalytics)} />
              </div>
            </CardContent>
          </Card>

          {/* GDPR */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-brand" /> GDPR Data Rights</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={exportData} disabled={exporting} variant="outline" className="w-full justify-start rounded-full">
                {exporting ? <Spinner /> : <Download className="h-4 w-4" />} {t('dataExport')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start rounded-full text-destructive hover:text-destructive hover:bg-destructive/5">
                    <Trash2 className="h-4 w-4" /> {t('dataDeletion')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Permanently delete account?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete ALL your data — resumes, jobs, interviews, profile, billing history and everything else. This action cannot be undone. Export your data first if you want a copy.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-white hover:bg-destructive/90">Yes, delete everything</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Audit log */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Eye className="h-4 w-4 text-brand" /> Audit Trail</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1.5 pe-1">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No audit entries yet.</p>
                ) : auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{log.action}</div>
                      <div className="text-[10px] text-muted-foreground">{log.entity}{log.user?.name ? ` · ${log.user.name}` : ''} · {new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
