'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useProfile } from '@/components/careeros/profile-context'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Globe, Plus, ArrowLeft, Save, Trash2, ExternalLink, Copy, Eye, EyeOff,
  Sparkles, Palette, LayoutList, Share2, Check, Wand2,
} from 'lucide-react'

/* ---------------- Types ---------------- */

type SectionType = 'hero' | 'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'contact'

type PortfolioSection = {
  id: string
  type: SectionType
  title: string
  visible: boolean
}

type Portfolio = {
  id: string
  slug: string
  title: string
  tagline: string | null
  bio: string | null
  theme: string
  accent: string
  sections: PortfolioSection[]
  published: boolean
  views: number
  updatedAt: string
  createdAt: string
}

/* ---------------- Constants ---------------- */

const THEMES = [
  { id: 'aurora', name: 'Aurora', desc: 'Gradient mesh hero, glass cards' },
  { id: 'minimal', name: 'Minimal', desc: 'Whitespace-first, monochrome' },
  { id: 'bold', name: 'Bold', desc: 'High contrast, oversized type' },
  { id: 'dark', name: 'Dark', desc: 'Always-dark, neon accents' },
  { id: 'paper', name: 'Paper', desc: 'Warm cream background' },
] as const

const ACCENTS = [
  { id: 'emerald', hex: '#10b981' },
  { id: 'teal', hex: '#14b8a6' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'rose', hex: '#f43f5e' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'slate', hex: '#64748b' },
] as const

const SECTION_TEMPLATES: { type: SectionType; defaultTitle: string }[] = [
  { type: 'hero', defaultTitle: 'Hero' },
  { type: 'about', defaultTitle: 'About' },
  { type: 'experience', defaultTitle: 'Experience' },
  { type: 'skills', defaultTitle: 'Skills' },
  { type: 'projects', defaultTitle: 'Projects' },
  { type: 'certifications', defaultTitle: 'Certifications' },
  { type: 'contact', defaultTitle: 'Contact' },
]

const DEFAULT_SECTIONS: PortfolioSection[] = SECTION_TEMPLATES.map((s, i) => ({
  id: s.type,
  type: s.type,
  title: s.defaultTitle,
  visible: s.type !== 'certifications',
}))

/* ---------------- Module ---------------- */

export function PortfolioModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const { profile, user } = useProfile()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [active, setActive] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    api<{ portfolios: any[] }>('/api/portfolio')
      .then(({ portfolios }) => setPortfolios(portfolios.map(normalize)))
      .catch((e: Error) => toast({ title: 'Failed to load portfolios', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  // Sync local form when active changes.
  const [form, setForm] = useState<Portfolio | null>(null)
  const synced = active && (!form || form.id !== active.id)
  if (synced) setForm(active)

  const createNew = async () => {
    setCreating(true)
    try {
      const payload: { title: string; tagline?: string; bio?: string } = {
        title: user?.name ? `${user.name}'s Portfolio` : 'My Portfolio',
      }
      if (user?.headline) payload.tagline = user.headline
      if (profile?.brandStatement) payload.bio = profile.brandStatement
      const { portfolio } = await api<{ portfolio: any }>('/api/portfolio', { method: 'POST', body: payload })
      const fresh = normalize(portfolio)
      setPortfolios((p) => [fresh, ...p])
      setActive(fresh)
      toast({ title: 'Portfolio created', description: 'Start editing — your link is ready.' })
    } catch (e) {
      toast({ title: 'Failed to create', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const remove = async (p: Portfolio) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try {
      await api(`/api/portfolio/${p.id}`, { method: 'DELETE' })
      setPortfolios((arr) => arr.filter((x) => x.id !== p.id))
      if (active?.id === p.id) {
        setActive(null)
        setForm(null)
      }
      toast({ title: 'Portfolio deleted' })
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const save = async () => {
    if (!form) return
    setSaving(true)
    try {
      const { portfolio } = await api<{ portfolio: any }>(`/api/portfolio/${form.id}`, {
        method: 'PUT',
        body: {
          title: form.title,
          tagline: form.tagline,
          bio: form.bio,
          theme: form.theme,
          accent: form.accent,
          sections: form.sections,
          published: form.published,
        },
      })
      const fresh = normalize(portfolio)
      setActive(fresh)
      setForm(fresh)
      setPortfolios((arr) => arr.map((x) => (x.id === fresh.id ? fresh : x)))
      toast({ title: 'Saved', description: 'Your portfolio is updated.' })
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async () => {
    if (!form) return
    const next = !form.published
    setForm({ ...form, published: next })
    setSaving(true)
    try {
      const { portfolio } = await api<{ portfolio: any }>(`/api/portfolio/${form.id}`, {
        method: 'PUT', body: { published: next },
      })
      const fresh = normalize(portfolio)
      setActive(fresh)
      setForm(fresh)
      setPortfolios((arr) => arr.map((x) => (x.id === fresh.id ? fresh : x)))
      toast({ title: next ? 'Published' : 'Unpublished', description: next ? 'Your portfolio is now live.' : 'Portfolio hidden from public.' })
    } catch (e) {
      toast({ title: 'Toggle failed', description: (e as Error).message, variant: 'destructive' })
      setForm((f) => (f ? { ...f, published: !next } : f))
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    if (!form) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${form.slug}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast({ title: 'Link copied', description: 'Share it anywhere.' })
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  const prefillFromProfile = () => {
    if (!form) return
    setForm({
      ...form,
      tagline: form.tagline || user?.headline || profile?.targetRole || '',
      bio: form.bio || profile?.brandStatement || profile?.careerGoals || '',
    })
    toast({ title: 'Prefilled from profile' })
  }

  /* ---------------- Render ---------------- */

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-brand" /></div>
  }

  return (
    <div>
      <ModuleHeader
        title={t('portfolioTitle')}
        subtitle={t('portfolioSub')}
        icon={Globe}
        actions={
          <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={createNew} disabled={creating}>
            {creating ? <Spinner /> : <Plus className="h-4 w-4" />} New
          </Button>
        }
      />

      <AnimatePresence mode="wait">
        {!form ? (
          /* ---------- LIST ---------- */
          <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            {portfolios.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="mb-4">No portfolios yet — create your first one.</p>
                  <Button className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={createNew} disabled={creating}>
                    {creating ? <Spinner /> : <Plus className="h-4 w-4" />} Create portfolio
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolios.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="group cursor-pointer hover:border-brand/40 hover:shadow-md transition-all h-full" onClick={() => setActive(p)}>
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${(ACCENTS.find((a) => a.id === p.accent) || ACCENTS[0]).hex}22`, color: (ACCENTS.find((a) => a.id === p.accent) || ACCENTS[0]).hex }}>
                            <Globe className="h-5 w-5" />
                          </div>
                          {p.published ? (
                            <Badge className="bg-brand-soft text-brand border-brand/30 hover:bg-brand-soft">Live</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-base truncate">{p.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">{p.tagline || 'No tagline yet.'}</p>
                        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views}</span>
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* ---------- EDITOR ---------- */
          <motion.div key="editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <div className="flex items-center justify-between mb-4 gap-3">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setActive(null); setForm(null) }}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => remove(form)} title="Delete">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
                <Button size="sm" className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90" onClick={save} disabled={saving}>
                  {saving ? <Spinner /> : <Save className="h-4 w-4" />} {t('save')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
              {/* Editor column */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="content"><Sparkles className="h-3.5 w-3.5" /> Content</TabsTrigger>
                  <TabsTrigger value="design"><Palette className="h-3.5 w-3.5" /> Design</TabsTrigger>
                  <TabsTrigger value="sections"><LayoutList className="h-3.5 w-3.5" /> Sections</TabsTrigger>
                  <TabsTrigger value="share"><Share2 className="h-3.5 w-3.5" /> Share</TabsTrigger>
                </TabsList>

                {/* CONTENT */}
                <TabsContent value="content">
                  <Card>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Content</h3>
                        <Button variant="outline" size="sm" className="rounded-full h-7 text-xs" onClick={prefillFromProfile}>
                          <Wand2 className="h-3.5 w-3.5" /> Prefill from profile
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Title</Label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="My Portfolio" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Tagline</Label>
                        <Input value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="mt-1" placeholder="Senior Engineer → Staff" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Bio</Label>
                        <Textarea rows={4} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1" placeholder="A short paragraph about who you are and what you build." />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* DESIGN */}
                <TabsContent value="design">
                  <Card>
                    <CardContent className="p-5 space-y-5">
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Theme</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {THEMES.map((th) => (
                            <button key={th.id} onClick={() => setForm({ ...form, theme: th.id })}
                              className={`text-start rounded-lg border p-3 text-sm transition ${form.theme === th.id ? 'border-brand bg-brand-soft' : 'hover:bg-accent'}`}>
                              <div className="font-medium">{th.name}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{th.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold mb-3">Accent color</h3>
                        <div className="flex flex-wrap gap-2">
                          {ACCENTS.map((a) => (
                            <button key={a.id} onClick={() => setForm({ ...form, accent: a.id })}
                              className={`relative h-10 w-10 rounded-full transition ${form.accent === a.id ? 'ring-2 ring-offset-2 ring-offset-background' : ''}`}
                              style={{ background: a.hex, boxShadow: form.accent === a.id ? `0 0 0 2px ${a.hex}` : undefined }}
                              title={a.id}>
                              {form.accent === a.id && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SECTIONS */}
                <TabsContent value="sections">
                  <Card>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Sections</h3>
                        <span className="text-xs text-muted-foreground">Toggle visibility & rename</span>
                      </div>
                      {form.sections.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                          <div className="h-7 w-7 rounded-md bg-brand-soft text-brand flex items-center justify-center text-[10px] font-semibold">{i + 1}</div>
                          <Input value={s.title} onChange={(e) => {
                            const next = [...form.sections]; next[i] = { ...s, title: e.target.value }
                            setForm({ ...form, sections: next })
                          }} className="h-8 text-sm" />
                          <Badge variant="outline" className="text-[10px] capitalize">{s.type}</Badge>
                          <div className="ms-auto flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">{s.visible ? 'Visible' : 'Hidden'}</span>
                            <Switch checked={s.visible} onCheckedChange={(v) => {
                              const next = [...form.sections]; next[i] = { ...s, visible: v }
                              setForm({ ...form, sections: next })
                            }} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SHARE */}
                <TabsContent value="share">
                  <ShareCard form={form} copied={copied} onCopy={copyLink} onTogglePublish={togglePublish} saving={saving} origin={origin} />
                </TabsContent>
              </Tabs>

              {/* Right rail: quick share + stats */}
              <div className="space-y-4">
                <ShareCard form={form} copied={copied} onCopy={copyLink} onTogglePublish={togglePublish} saving={saving} compact origin={origin} />
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">{t('views')}</div>
                        <div className="text-2xl font-semibold mt-0.5">{form.views}</div>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
                        <Eye className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Live view counter — increments each time someone opens your public link.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="text-xs text-muted-foreground mb-2">Preview snippet</div>
                    <div className="rounded-lg overflow-hidden border" style={{ background: '#0b0d10' }}>
                      <div className="px-3 py-2 text-[10px] font-mono text-zinc-500 truncate">{origin || 'https://careeros.ai'}/p/{form.slug}</div>
                      <div className="px-3 pb-3 pt-1">
                        <div className="h-2 w-2 rounded-full mb-1.5" style={{ background: (ACCENTS.find((a) => a.id === form.accent) || ACCENTS[0]).hex }} />
                        <div className="h-2.5 w-3/4 rounded bg-white/90 mb-1.5" />
                        <div className="h-1.5 w-full rounded bg-white/30" />
                        <div className="h-1.5 w-5/6 rounded bg-white/30 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------------- Share card ---------------- */

function ShareCard({
  form, copied, onCopy, onTogglePublish, saving, compact, origin,
}: {
  form: Portfolio
  copied: boolean
  onCopy: () => void
  onTogglePublish: () => void
  saving: boolean
  compact?: boolean
  origin: string
}) {
  const { t } = useApp()
  const publicUrl = `${origin}/p/${form.slug}`
  return (
    <Card className="border-brand/20">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Share2 className="h-4 w-4 text-brand" /> {t('publicLink')}</h3>
          <Badge variant={form.published ? 'default' : 'outline'} className={form.published ? 'bg-brand-soft text-brand border-brand/30 hover:bg-brand-soft' : ''}>
            {form.published ? t('published') : 'Draft'}
          </Badge>
        </div>

        {/* Link row */}
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1.5">
          <div className="flex-1 min-w-0 px-1.5 text-xs font-mono truncate text-muted-foreground">/p/{form.slug}</div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCopy} title={t('copyLink')}>
            {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button asChild size="sm" className="h-7 px-2" title="Open">
            <a href={`/p/${form.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
          </Button>
        </div>

        {/* QR-style placeholder box */}
        <div className="relative rounded-xl border border-dashed border-brand/30 p-4 text-center bg-brand-soft/40">
          <div className="grid grid-cols-8 gap-0.5 max-w-[140px] mx-auto mb-3">
            {Array.from({ length: 64 }).map((_, i) => {
              // deterministic pseudo-random pattern from slug
              const seed = (form.slug.charCodeAt(i % form.slug.length) + i * 7) % 5
              return <div key={i} className="aspect-square rounded-[1px]" style={{ background: seed < 2 ? 'var(--brand)' : 'transparent' }} />
            })}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground break-all px-2">{publicUrl}</div>
          <div className="text-[10px] text-muted-foreground mt-1.5">Scan or share your public link</div>
        </div>

        {/* Publish toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              {form.published ? <Eye className="h-3.5 w-3.5 text-brand" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
              {form.published ? t('published') : 'Draft mode'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {form.published ? 'Anyone with the link can view.' : 'Only you can see this portfolio.'}
            </div>
          </div>
          <Button size="sm" className="rounded-full"
            variant={form.published ? 'outline' : 'default'}
            onClick={onTogglePublish} disabled={saving}>
            {saving ? <Spinner /> : form.published ? 'Unpublish' : t('publish')}
          </Button>
        </div>

        {!compact && (
          <p className="text-[11px] text-muted-foreground">Tip: switching themes or accents updates your live page instantly.</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Helpers ---------------- */

function normalize(p: any): Portfolio {
  let sections: PortfolioSection[] = []
  if (typeof p.sections === 'string') {
    try { sections = JSON.parse(p.sections) } catch { sections = [] }
  } else if (Array.isArray(p.sections)) {
    sections = p.sections
  }
  if (!sections.length) sections = DEFAULT_SECTIONS
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline ?? null,
    bio: p.bio ?? null,
    theme: p.theme ?? 'aurora',
    accent: p.accent ?? 'emerald',
    sections,
    published: !!p.published,
    views: p.views ?? 0,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  }
}
