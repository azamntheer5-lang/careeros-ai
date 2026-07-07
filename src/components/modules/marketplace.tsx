'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ShoppingBag,
  Star,
  Download,
  Users,
  FileText,
  Globe,
  Mail,
  GraduationCap,
  BookOpen,
  Package,
  Sparkles,
  TrendingUp,
  Check,
  Plus,
  Trash2,
  BadgeCheck,
  Wallet,
  Award,
  Pencil,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (local — the marketplace module owns its shape)
// ---------------------------------------------------------------------------

type Template = {
  id: string
  kind: 'template'
  creatorId: string
  creatorName: string | null
  creatorHeadline: string | null
  type: 'resume' | 'portfolio' | 'cover_letter'
  name: string
  description: string | null
  category: string | null
  preview: { accent?: string; layout?: string; font?: string; theme?: string; hero?: string; tone?: string } | null
  config: Record<string, unknown> | null
  price: number
  priceDisplay: string
  downloads: number
  rating: number
  published: boolean
  featured: boolean
  createdAt: string
  updatedAt: string
}

type Content = {
  id: string
  kind: 'content'
  creatorId: string
  creatorName: string | null
  creatorHeadline: string | null
  type: 'course' | 'guide' | 'template' | 'coaching_pack'
  title: string
  description: string | null
  content: string
  price: number
  priceDisplay: string
  tags: string[]
  published: boolean
  enrollments: number
  rating: number
  createdAt: string
  updatedAt: string
}

type MarketplaceData = {
  templates: Template[]
  content: Content[]
  mine: { templates: Template[]; content: Content[] }
}

type Item = Template | Content

// ---------------------------------------------------------------------------
// Styling maps
// ---------------------------------------------------------------------------

const ACCENT_STYLES: Record<string, { grad: string; solid: string; text: string; soft: string; ring: string }> = {
  emerald: { grad: 'from-emerald-500 to-teal-400', solid: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-500/15', ring: 'ring-emerald-500/30' },
  slate: { grad: 'from-slate-600 to-slate-400', solid: 'bg-slate-500', text: 'text-slate-600', soft: 'bg-slate-500/15', ring: 'ring-slate-500/30' },
  fuchsia: { grad: 'from-fuchsia-500 to-pink-400', solid: 'bg-fuchsia-500', text: 'text-fuchsia-600', soft: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-500/30' },
  amber: { grad: 'from-amber-500 to-orange-400', solid: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-500/15', ring: 'ring-amber-500/30' },
}

function accentOf(item: Item): string {
  if (item.kind === 'template') {
    const a = (item.preview?.accent as string) || (item.config?.accent as string) || 'emerald'
    return ACCENT_STYLES[a] ? a : 'emerald'
  }
  // Map content type to a stable accent.
  const map: Record<string, string> = { course: 'emerald', guide: 'amber', template: 'slate', coaching_pack: 'fuchsia' }
  return map[item.type] || 'emerald'
}

const TYPE_META: Record<string, { label: string; icon: typeof FileText }> = {
  resume: { label: 'Resume', icon: FileText },
  portfolio: { label: 'Portfolio', icon: Globe },
  cover_letter: { label: 'Cover Letter', icon: Mail },
  course: { label: 'Course', icon: GraduationCap },
  guide: { label: 'Guide', icon: BookOpen },
  template: { label: 'Template', icon: Package },
  coaching_pack: { label: 'Coaching', icon: Award },
}

function typeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.template
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function initials(name: string | null): string {
  if (!name) return '··'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase()
}

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

function StarRating({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <div className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full
        const isHalf = i === full && half
        return (
          <Star
            key={i}
            className={`${dim} ${filled || isHalf ? 'fill-amber-400 text-amber-500' : 'fill-muted text-muted-foreground/40'}`}
          />
        )
      })}
      <span className={`ms-1 font-medium ${size === 'md' ? 'text-sm' : 'text-xs'} text-foreground`}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template preview thumbnail — a styled mini layout using the accent color
// ---------------------------------------------------------------------------

function TemplateThumbnail({ template, className }: { template: Template; className?: string }) {
  const accent = ACCENT_STYLES[accentOf(template)]
  const layout = template.preview?.layout || 'single-column'
  const theme = template.preview?.theme

  if (template.type === 'portfolio') {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-gradient-to-br ${accent.grad} ${className ?? ''}`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0, transparent 40%)' }} />
        <div className="absolute inset-0 p-3 flex flex-col">
          <div className="flex items-center gap-1 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
          </div>
          <div className="text-white font-semibold text-[10px] leading-tight mb-1">
            {theme === 'minimal' ? 'engineer.' : template.name}
          </div>
          <div className="text-white/70 text-[8px] mb-2">{template.preview?.hero || 'Portfolio'}</div>
          <div className="grid grid-cols-2 gap-1 mt-auto">
            <div className="h-6 rounded bg-white/25" />
            <div className="h-6 rounded bg-white/15" />
            <div className="h-6 rounded bg-white/15" />
            <div className="h-6 rounded bg-white/25" />
          </div>
        </div>
      </div>
    )
  }

  if (template.type === 'cover_letter') {
    return (
      <div className={`relative h-full w-full overflow-hidden bg-card ${className ?? ''}`}>
        <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${accent.grad}`} />
        <div className="absolute inset-0 p-3 pt-4 flex flex-col gap-1.5">
          <div className={`h-1.5 w-12 rounded ${accent.solid}`} />
          <div className="h-1 w-20 rounded bg-muted-foreground/30" />
          <div className="h-1 w-16 rounded bg-muted-foreground/20" />
          <div className="mt-1 space-y-1">
            <div className="h-0.5 w-full rounded bg-muted-foreground/20" />
            <div className="h-0.5 w-full rounded bg-muted-foreground/20" />
            <div className="h-0.5 w-3/4 rounded bg-muted-foreground/20" />
          </div>
          <div className="mt-1 space-y-1">
            <div className="h-0.5 w-full rounded bg-muted-foreground/15" />
            <div className="h-0.5 w-5/6 rounded bg-muted-foreground/15" />
          </div>
          <div className={`mt-auto h-1.5 w-8 rounded ${accent.solid}`} />
        </div>
      </div>
    )
  }

  // resume (default) — accent bar + header + content lines
  return (
    <div className={`relative h-full w-full overflow-hidden bg-card ${className ?? ''}`}>
      {layout === 'accent-bar' && <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${accent.grad}`} />}
      {layout === 'two-column-header' && (
        <div className={`absolute top-0 inset-x-0 h-10 bg-gradient-to-br ${accent.grad} opacity-90`} />
      )}
      <div className="absolute inset-0 p-3 flex flex-col gap-1.5" style={{ paddingTop: layout === 'two-column-header' ? '2.75rem' : '0.75rem' }}>
        {layout !== 'accent-bar' && layout !== 'two-column-header' && (
          <div className={`h-1.5 w-16 rounded ${accent.solid} mb-1`} />
        )}
        <div className="h-2 w-20 rounded bg-foreground/70" />
        <div className="h-1 w-24 rounded bg-muted-foreground/40" />
        <div className="mt-1.5 space-y-1">
          <div className="h-1 w-full rounded bg-muted-foreground/25" />
          <div className="h-1 w-full rounded bg-muted-foreground/25" />
          <div className="h-1 w-2/3 rounded bg-muted-foreground/25" />
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          <div className="h-1 rounded bg-muted-foreground/20" />
          <div className="h-1 rounded bg-muted-foreground/20" />
          <div className="h-1 rounded bg-muted-foreground/20" />
        </div>
        <div className="mt-auto flex gap-1">
          <div className={`h-1.5 flex-1 rounded ${accent.solid} opacity-80`} />
          <div className="h-1.5 w-6 rounded bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onInstall,
  onPreview,
  isInstalling,
}: {
  template: Template
  onInstall: (t: Template) => void
  onPreview: (t: Template) => void
  isInstalling: boolean
}) {
  const accent = ACCENT_STYLES[accentOf(template)]
  const Icon = typeMeta(template.type).icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Card className="group h-full overflow-hidden border-border/70 bg-card/60 backdrop-blur-sm transition-colors hover:border-brand/40">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="block w-full text-start"
          aria-label={`Preview ${template.name}`}
        >
          <div className="relative h-36 sm:h-40 border-b border-border/60">
            <TemplateThumbnail template={template} />
            <div className="absolute top-2 start-2 flex items-center gap-1.5">
              <Badge className="bg-background/85 text-foreground backdrop-blur border-border/60 shadow-sm">
                <Icon className="h-3 w-3" />
                {typeMeta(template.type).label}
              </Badge>
              {template.featured && (
                <Badge className="bg-amber-500/90 text-white border-0 shadow-sm">
                  <Sparkles className="h-3 w-3" /> Featured
                </Badge>
              )}
            </div>
          </div>
        </button>
        <CardContent className="p-4 space-y-3">
          <div>
            <button
              type="button"
              onClick={() => onPreview(template)}
              className="text-start font-semibold leading-tight hover:text-brand transition-colors line-clamp-1"
            >
              {template.name}
            </button>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[2rem]">
              {template.description}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${accent.soft} ${accent.text} text-[9px] font-semibold ring-1 ${accent.ring}`}>
                {initials(template.creatorName)}
              </div>
              <span className="truncate text-muted-foreground">{template.creatorName}</span>
            </div>
            <StarRating value={template.rating} />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Download className="h-3 w-3" />
                {formatCount(template.downloads)}
              </span>
              {template.category && (
                <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                  {template.category}
                </Badge>
              )}
            </div>
            <div className={`text-sm font-semibold ${template.price === 0 ? 'text-brand' : 'text-foreground'}`}>
              {template.priceDisplay}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            size="sm"
            className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={isInstalling}
            onClick={() => onInstall(template)}
          >
            {isInstalling ? <Spinner className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {template.price === 0 ? 'Install' : 'Get Template'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Content card
// ---------------------------------------------------------------------------

function ContentCard({
  content,
  onEnroll,
  onPreview,
  isEnrolling,
}: {
  content: Content
  onEnroll: (c: Content) => void
  onPreview: (c: Content) => void
  isEnrolling: boolean
}) {
  const accent = ACCENT_STYLES[accentOf(content)]
  const Icon = typeMeta(content.type).icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Card className="group h-full overflow-hidden border-border/70 bg-card/60 backdrop-blur-sm transition-colors hover:border-brand/40">
        <button
          type="button"
          onClick={() => onPreview(content)}
          className="block w-full text-start"
          aria-label={`Preview ${content.title}`}
        >
          <div className={`relative h-24 bg-gradient-to-br ${accent.grad} overflow-hidden`}>
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0, transparent 50%)' }} />
            <div className="absolute inset-0 p-4 flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-90 mb-1">
                  <Icon className="h-3 w-3" />
                  {typeMeta(content.type).label}
                </div>
                <div className="text-base font-semibold leading-tight line-clamp-2 max-w-[80%]">
                  {content.title}
                </div>
              </div>
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30">
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </button>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${accent.soft} ${accent.text} text-[9px] font-semibold ring-1 ${accent.ring}`}>
                {initials(content.creatorName)}
              </div>
              <span className="truncate text-muted-foreground">{content.creatorName}</span>
            </div>
            <StarRating value={content.rating} />
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
            {content.description}
          </p>

          {content.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {formatCount(content.enrollments)} enrolled
            </div>
            <div className={`text-sm font-semibold ${content.price === 0 ? 'text-brand' : 'text-foreground'}`}>
              {content.priceDisplay}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            size="sm"
            className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={isEnrolling}
            onClick={() => onEnroll(content)}
          >
            {isEnrolling ? <Spinner className="h-3.5 w-3.5" /> : content.type === 'course' ? <GraduationCap className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
            {content.price === 0 ? 'Enroll Free' : content.type === 'course' ? 'Enroll' : 'Get Guide'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Featured carousel (horizontal scroll)
// ---------------------------------------------------------------------------

function FeaturedCarousel({
  items,
  onInstall,
  onPreview,
  installingId,
}: {
  items: Template[]
  onInstall: (t: Template) => void
  onPreview: (t: Template) => void
  installingId: string | null
}) {
  if (items.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/60 via-card/60 to-card/60 backdrop-blur-sm p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/20">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Featured Templates</h3>
            <p className="text-[11px] text-muted-foreground">Curated picks loved by the community</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ scrollbarWidth: 'thin' }}>
        {items.map((t) => {
          const accent = ACCENT_STYLES[accentOf(t)]
          const Icon = typeMeta(t.type).icon
          return (
            <motion.div
              key={t.id}
              whileHover={{ y: -2 }}
              className="snap-start shrink-0 w-64 sm:w-72 rounded-xl border border-border/70 bg-card/80 backdrop-blur-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onPreview(t)}
                className="block w-full text-start"
                aria-label={`Preview ${t.name}`}
              >
                <div className="relative h-24 border-b border-border/60">
                  <TemplateThumbnail template={t} />
                  <div className="absolute top-2 start-2">
                    <Badge className="bg-background/85 text-foreground backdrop-blur border-border/60 shadow-sm">
                      <Icon className="h-3 w-3" />
                      {typeMeta(t.type).label}
                    </Badge>
                  </div>
                </div>
              </button>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onPreview(t)}
                    className="text-start text-sm font-semibold leading-tight hover:text-brand transition-colors line-clamp-1"
                  >
                    {t.name}
                  </button>
                  <StarRating value={t.rating} />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className={`h-4 w-4 rounded-full ${accent.soft} ${accent.text} flex items-center justify-center text-[7px] font-semibold`}>
                      {initials(t.creatorName)}
                    </div>
                    <span className="truncate max-w-[5rem]">{t.creatorName}</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Download className="h-2.5 w-2.5" />
                      {formatCount(t.downloads)}
                    </span>
                  </div>
                  <div className={`text-xs font-semibold ${t.price === 0 ? 'text-brand' : 'text-foreground'}`}>
                    {t.priceDisplay}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90 h-7 text-[11px]"
                  disabled={installingId === t.id}
                  onClick={() => onInstall(t)}
                >
                  {installingId === t.id ? <Spinner className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  Install
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const TYPE_FILTERS: { value: string; label: string; icon: typeof FileText }[] = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'resume', label: 'Resume', icon: FileText },
  { value: 'portfolio', label: 'Portfolio', icon: Globe },
  { value: 'cover_letter', label: 'Cover Letter', icon: Mail },
]

function FilterBar({
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  search,
  setSearch,
}: {
  typeFilter: string
  setTypeFilter: (v: string) => void
  categoryFilter: string
  setCategoryFilter: (v: string) => void
  categories: string[]
  search: string
  setSearch: (v: string) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        {TYPE_FILTERS.map((f) => {
          const Icon = f.icon
          const active = typeFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setTypeFilter(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                active ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          )
        })}
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search templates, creators…"
        className="sm:max-w-xs h-9"
      />
      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger className="h-9 w-full sm:w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Item preview dialog
// ---------------------------------------------------------------------------

function ItemDialog({
  item,
  open,
  onOpenChange,
  onAction,
  isBusy,
}: {
  item: Item | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onAction: (i: Item) => void
  isBusy: boolean
}) {
  if (!item) return null
  const accent = ACCENT_STYLES[accentOf(item)]
  const isTemplate = item.kind === 'template'
  const Icon = typeMeta(isTemplate ? item.type : item.type).icon
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">
              <Icon className="h-3 w-3" />
              {typeMeta(isTemplate ? item.type : item.type).label}
            </Badge>
            {isTemplate && (item as Template).featured && (
              <Badge className="bg-amber-500/90 text-white border-0 text-[10px]">
                <Sparkles className="h-3 w-3" /> Featured
              </Badge>
            )}
          </div>
          <DialogTitle>{isTemplate ? (item as Template).name : (item as Content).title}</DialogTitle>
          <DialogDescription>
            by <span className="font-medium text-foreground">{item.creatorName}</span>
            {item.creatorHeadline ? ` · ${item.creatorHeadline}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isTemplate && (
            <div className="relative h-40 rounded-xl overflow-hidden border border-border">
              <TemplateThumbnail template={item as Template} />
            </div>
          )}

          <p className="text-sm text-muted-foreground">{item.description}</p>

          {!isTemplate && (item as Content).tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(item as Content).tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[11px] font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card/50 p-2.5 text-center">
              <Star className="h-3.5 w-3.5 mx-auto text-amber-500 fill-amber-400" />
              <div className="text-sm font-semibold mt-1">{item.rating.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Rating</div>
            </div>
            <div className="rounded-lg border bg-card/50 p-2.5 text-center">
              {isTemplate ? <Download className="h-3.5 w-3.5 mx-auto text-muted-foreground" /> : <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground" />}
              <div className="text-sm font-semibold mt-1">{formatCount(isTemplate ? (item as Template).downloads : (item as Content).enrollments)}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{isTemplate ? 'Downloads' : 'Enrolled'}</div>
            </div>
            <div className="rounded-lg border bg-card/50 p-2.5 text-center">
              <Wallet className="h-3.5 w-3.5 mx-auto text-muted-foreground" />
              <div className={`text-sm font-semibold mt-1 ${item.price === 0 ? 'text-brand' : ''}`}>{item.priceDisplay}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Price</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={isBusy}
            onClick={() => onAction(item)}
          >
            {isBusy ? (
              <Spinner className="h-4 w-4" />
            ) : isTemplate ? (
              <>
                <Download className="h-4 w-4" />
                {item.price === 0 ? 'Install Free' : `Get for ${item.priceDisplay}`}
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                {item.price === 0 ? 'Enroll Free' : `Enroll for ${item.priceDisplay}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Creator form
// ---------------------------------------------------------------------------

function CreatorForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { toast } = useToast()
  const { user } = useProfileSafe()
  const [kind, setKind] = useState<'template' | 'content'>('template')
  const [busy, setBusy] = useState(false)

  // Template fields
  const [tType, setTType] = useState<'resume' | 'portfolio' | 'cover_letter'>('resume')
  const [tName, setTName] = useState('')
  const [tDesc, setTDesc] = useState('')
  const [tCategory, setTCategory] = useState('')
  const [tPrice, setTPrice] = useState('0')
  const [tConfig, setTConfig] = useState('')
  const [tPublished, setTPublished] = useState(true)
  const [tFeatured, setTFeatured] = useState(false)

  // Content fields
  const [cType, setCType] = useState<'course' | 'guide' | 'template' | 'coaching_pack'>('guide')
  const [cTitle, setCTitle] = useState('')
  const [cDesc, setCDesc] = useState('')
  const [cTags, setCTags] = useState<string[]>([])
  const [cTagDraft, setCTagDraft] = useState('')
  const [cPrice, setCPrice] = useState('0')
  const [cContent, setCContent] = useState('')
  const [cPublished, setCPublished] = useState(true)

  const addTag = () => {
    const v = cTagDraft.trim()
    if (v && !cTags.includes(v)) setCTags([...cTags, v])
    setCTagDraft('')
  }

  const submit = async () => {
    setBusy(true)
    try {
      if (kind === 'template') {
        if (!tName.trim()) {
          toast({ title: 'Name required', description: 'Give your template a name.', variant: 'destructive' })
          setBusy(false)
          return
        }
        // Config is optional; if provided and not JSON, store as markdown string.
        let configValue: unknown = {}
        if (tConfig.trim()) {
          try {
            configValue = JSON.parse(tConfig)
          } catch {
            configValue = { note: tConfig }
          }
        }
        await api('/api/marketplace', {
          method: 'POST',
          body: {
            kind: 'template',
            type: tType,
            name: tName.trim(),
            description: tDesc.trim(),
            category: tCategory.trim(),
            price: Math.max(0, Math.floor(Number(tPrice) || 0)) * 100,
            config: configValue,
            published: tPublished,
            featured: tFeatured,
          },
        })
        setTName('')
        setTDesc('')
        setTCategory('')
        setTPrice('0')
        setTConfig('')
        setTFeatured(false)
        toast({ title: 'Template published', description: 'Your template is live in the marketplace.' })
      } else {
        if (!cTitle.trim()) {
          toast({ title: 'Title required', description: 'Give your content a title.', variant: 'destructive' })
          setBusy(false)
          return
        }
        if (!cContent.trim()) {
          toast({ title: 'Content required', description: 'Write or paste your guide/course content.', variant: 'destructive' })
          setBusy(false)
          return
        }
        await api('/api/marketplace', {
          method: 'POST',
          body: {
            kind: 'content',
            type: cType,
            title: cTitle.trim(),
            description: cDesc.trim(),
            tags: cTags,
            price: Math.max(0, Math.floor(Number(cPrice) || 0)) * 100,
            content: cContent,
            published: cPublished,
          },
        })
        setCTitle('')
        setCDesc('')
        setCTags([])
        setCTagDraft('')
        setCPrice('0')
        setCContent('')
        toast({ title: 'Content published', description: 'Your expert content is live in the marketplace.' })
      }
      await onCreated()
    } catch (e) {
      toast({ title: 'Failed to publish', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border/70">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand" />
          Publish a new item
        </CardTitle>
        <CardDescription>
          Share your work with the CareerOS community. Free items grow your audience; paid items earn you revenue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Kind toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background/60 p-1 w-fit">
          <button
            type="button"
            onClick={() => setKind('template')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              kind === 'template' ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-3.5 w-3.5" /> Template
          </button>
          <button
            type="button"
            onClick={() => setKind('content')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              kind === 'content' ? 'bg-brand text-brand-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> Expert Content
          </button>
        </div>

        {kind === 'template' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={tType} onValueChange={(v) => setTType(v as typeof tType)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume">Resume Template</SelectItem>
                    <SelectItem value="portfolio">Portfolio Theme</SelectItem>
                    <SelectItem value="cover_letter">Cover Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input
                  value={tCategory}
                  onChange={(e) => setTCategory(e.target.value)}
                  placeholder="e.g. Engineering, Design, Executive"
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. Tech Resume Pro" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                placeholder="What makes this template special? Who is it for?"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Price (USD, 0 = free)</Label>
                <Input
                  type="number"
                  min="0"
                  value={tPrice}
                  onChange={(e) => setTPrice(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={tPublished} onCheckedChange={setTPublished} />
                  Published
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={tFeatured} onCheckedChange={setTFeatured} />
                  Featured
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Template config (JSON, optional)</Label>
              <Textarea
                value={tConfig}
                onChange={(e) => setTConfig(e.target.value)}
                placeholder={'{\n  "template": "modern",\n  "accent": "emerald",\n  "sampleData": { ... }\n}'}
                rows={4}
                className="resize-none font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                For resume templates, include <code>template</code>, <code>accent</code>, and <code>sampleData</code> — installing will create a new resume.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={cType} onValueChange={(v) => setCType(v as typeof cType)}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="template">Template Pack</SelectItem>
                    <SelectItem value="coaching_pack">Coaching Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (USD, 0 = free)</Label>
                <Input
                  type="number"
                  min="0"
                  value={cPrice}
                  onChange={(e) => setCPrice(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="e.g. System Design Interview Guide" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                placeholder="A short pitch — what will readers learn?"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={cTagDraft}
                  onChange={(e) => setCTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                  className="h-9"
                />
                <Button type="button" size="sm" variant="outline" onClick={addTag} className="h-9">
                  Add
                </Button>
              </div>
              {cTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {cTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[11px] gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setCTags(cTags.filter((t) => t !== tag))}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content (Markdown)</Label>
              <Textarea
                value={cContent}
                onChange={(e) => setCContent(e.target.value)}
                placeholder={'# Your guide title\n\n## Section 1\nWrite your content here…'}
                rows={6}
                className="resize-none font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={cPublished} onCheckedChange={setCPublished} />
                Published
              </label>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground">
            Publishing as <span className="font-medium text-foreground">{user?.name || 'you'}</span>
          </p>
          <Button
            size="sm"
            className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={busy}
            onClick={submit}
          >
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Avoids importing the ProfileProvider context just to read a name — we only need the name for a label.
// Falling back to a local fetch keeps this module self-contained.
function useProfileSafe() {
  const [user, setUser] = useState<{ name: string | null } | null>(null)
  useEffect(() => {
    api<{ user: { name: string } }>('/api/profile')
      .then((res) => setUser({ name: res.user?.name ?? null }))
      .catch(() => setUser({ name: null }))
  }, [])
  return { user }
}

// ---------------------------------------------------------------------------
// Creator dashboard
// ---------------------------------------------------------------------------

function CreatorDashboard({
  mine,
  onDelete,
  onTogglePublish,
}: {
  mine: { templates: Template[]; content: Content[] }
  onDelete: (item: Item) => Promise<void>
  onTogglePublish: (item: Item) => Promise<void>
}) {
  const total = mine.templates.length + mine.content.length
  const totalDownloads = mine.templates.reduce((s, t) => s + t.downloads, 0)
  const totalEnrollments = mine.content.reduce((s, c) => s + c.enrollments, 0)
  const totalRevenue = [...mine.templates, ...mine.content].reduce((s, i) => s + i.price * (i.kind === 'template' ? i.downloads : i.enrollments), 0) / 100

  if (total === 0) {
    return (
      <Card className="bg-card/40 border-dashed">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand ring-1 ring-brand/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No published items yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Use the form on the left to publish your first template or expert guide. Your items will appear here with live stats.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/60 border-border/70">
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Items</div>
            <div className="text-xl font-semibold text-brand">{total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/70">
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Downloads</div>
            <div className="text-xl font-semibold">{formatCount(totalDownloads)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/70">
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Enrollments</div>
            <div className="text-xl font-semibold">{formatCount(totalEnrollments)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/70">
          <CardContent className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Est. Revenue</div>
            <div className="text-xl font-semibold">${totalRevenue.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      {mine.templates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Your Templates</h4>
          {mine.templates.map((t) => {
            const accent = ACCENT_STYLES[accentOf(t)]
            const Icon = typeMeta(t.type).icon
            return (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-card/60 border-border/70">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text} ring-1 ${accent.ring}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{t.name}</span>
                        {t.featured && <Badge className="bg-amber-500/90 text-white border-0 text-[9px] px-1 py-0">Featured</Badge>}
                        <Badge variant={t.published ? 'default' : 'secondary'} className="text-[9px] px-1 py-0">
                          {t.published ? 'Live' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" />{formatCount(t.downloads)}</span>
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-500" />{t.rating.toFixed(1)}</span>
                        <span>{t.priceDisplay}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => onTogglePublish(t)}
                      >
                        {t.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(t)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Content */}
      {mine.content.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Your Expert Content</h4>
          {mine.content.map((c) => {
            const accent = ACCENT_STYLES[accentOf(c)]
            const Icon = typeMeta(c.type).icon
            return (
              <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="bg-card/60 border-border/70">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text} ring-1 ${accent.ring}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{c.title}</span>
                        <Badge variant={c.published ? 'default' : 'secondary'} className="text-[9px] px-1 py-0">
                          {c.published ? 'Live' : 'Draft'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{formatCount(c.enrollments)}</span>
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-500" />{c.rating.toFixed(1)}</span>
                        <span>{c.priceDisplay}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => onTogglePublish(c)}
                      >
                        {c.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(c)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root module
// ---------------------------------------------------------------------------

export function MarketplaceModule() {
  const { t } = useApp()
  const { toast } = useToast()
  const [data, setData] = useState<MarketplaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('templates')

  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [installingId, setInstallingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Item | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    api<MarketplaceData>('/api/marketplace')
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const refresh = async () => {
    const res = await api<MarketplaceData>('/api/marketplace')
    setData(res)
  }

  const categories = useMemo(() => {
    const set = new Set<string>()
    data?.templates.forEach((t) => t.category && set.add(t.category))
    return Array.from(set).sort()
  }, [data?.templates])

  const featured = useMemo(
    () => (data?.templates ?? []).filter((t) => t.featured),
    [data?.templates]
  )

  const filteredTemplates = useMemo(() => {
    if (!data) return []
    return data.templates.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${t.name} ${t.description ?? ''} ${t.creatorName ?? ''} ${t.category ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [data, typeFilter, categoryFilter, search])

  const filteredContent = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.content
    const q = search.toLowerCase()
    return data.content.filter((c) =>
      `${c.title} ${c.description ?? ''} ${c.creatorName ?? ''} ${c.tags.join(' ')}`.toLowerCase().includes(q)
    )
  }, [data, search])

  const openPreview = (item: Item) => {
    setPreview(item)
    setPreviewOpen(true)
  }

  const installTemplate = async (tpl: Template) => {
    setInstallingId(tpl.id)
    try {
      const res = await api<{ ok: boolean; created?: { kind: string; title?: string } }>(
        `/api/marketplace/${tpl.id}/install`,
        { method: 'POST' }
      )
      if (res.created?.kind === 'resume') {
        toast({
          title: 'Template installed',
          description: `New resume "${res.created.title || tpl.name}" created from this template.`,
        })
      } else if (res.created?.kind === 'portfolio') {
        toast({
          title: 'Theme installed',
          description: `New portfolio "${res.created.title || tpl.name}" created from this theme.`,
        })
      } else if (res.created?.kind === 'cover_letter') {
        toast({
          title: 'Cover letter installed',
          description: 'A new cover letter was created from this template.',
        })
      } else {
        toast({ title: 'Installed', description: 'Template added to your library.' })
      }
      // Update local download count.
      setData((d) =>
        d
          ? {
              ...d,
              templates: d.templates.map((t) =>
                t.id === tpl.id ? { ...t, downloads: t.downloads + 1 } : t
              ),
            }
          : d
      )
      setPreviewOpen(false)
    } catch (e) {
      toast({ title: 'Install failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setInstallingId(null)
    }
  }

  const enrollContent = async (c: Content) => {
    setInstallingId(c.id)
    try {
      await api(`/api/marketplace/${c.id}/install`, { method: 'POST' })
      toast({
        title: 'Enrolled',
        description: `You now have access to "${c.title}".`,
      })
      setData((d) =>
        d
          ? {
              ...d,
              content: d.content.map((x) =>
                x.id === c.id ? { ...x, enrollments: x.enrollments + 1 } : x
              ),
            }
          : d
      )
      setPreviewOpen(false)
    } catch (e) {
      toast({ title: 'Enrollment failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setInstallingId(null)
    }
  }

  const handleAction = (item: Item) => {
    if (item.kind === 'template') installTemplate(item)
    else enrollContent(item)
  }

  const deleteItem = async (item: Item) => {
    if (!confirm(`Delete "${item.kind === 'template' ? item.name : item.title}"? This cannot be undone.`)) return
    try {
      await api(`/api/marketplace/${item.id}`, { method: 'DELETE' })
      toast({ title: 'Deleted', description: 'Your item has been removed from the marketplace.' })
      await refresh()
    } catch (e) {
      toast({ title: 'Delete failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const togglePublish = async (item: Item) => {
    try {
      await api(`/api/marketplace/${item.id}`, {
        method: 'PUT',
        body: { published: !item.published },
      })
      toast({
        title: item.published ? 'Unpublished' : 'Published',
        description: item.published ? 'Item is now a draft.' : 'Item is now live in the marketplace.',
      })
      await refresh()
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <ModuleHeader
        title={t('marketplaceTitle')}
        subtitle={t('marketplaceSub')}
        icon={ShoppingBag}
        actions={
          data ? (
            <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 text-xs">
              <Package className="h-3.5 w-3.5 text-brand" />
              <span className="font-medium">{data.templates.length}</span>
              <span className="text-muted-foreground">templates</span>
              <span className="mx-1 h-3 w-px bg-border" />
              <BookOpen className="h-3.5 w-3.5 text-brand" />
              <span className="font-medium">{data.content.length}</span>
              <span className="text-muted-foreground">guides</span>
            </div>
          ) : null
        }
      />

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-5">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="content">Expert Content</TabsTrigger>
            <TabsTrigger value="creator">Become a Creator</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-5">
            {featured.length > 0 && (
              <FeaturedCarousel
                items={featured}
                onInstall={installTemplate}
                onPreview={openPreview}
                installingId={installingId}
              />
            )}

            <FilterBar
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              categories={categories}
              search={search}
              setSearch={setSearch}
            />

            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No templates match your filters. Try clearing the search or switching category.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onInstall={installTemplate}
                    onPreview={openPreview}
                    isInstalling={installingId === tpl.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses, guides, creators…"
                className="sm:max-w-xs h-9"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-brand" />
                <span>{filteredContent.length} expert {filteredContent.length === 1 ? 'item' : 'items'}</span>
              </div>
            </div>

            {filteredContent.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-sm text-muted-foreground">
                  No expert content matches your search.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.map((c) => (
                  <ContentCard
                    key={c.id}
                    content={c}
                    onEnroll={enrollContent}
                    onPreview={openPreview}
                    isEnrolling={installingId === c.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creator" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              <CreatorForm onCreated={refresh} />
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-brand-soft/60 to-card/60 border-brand/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BadgeCheck className="h-4 w-4 text-brand" />
                      <h4 className="text-sm font-semibold">Creator benefits</h4>
                    </div>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                        Reach 50k+ ambitious professionals actively job-hunting.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                        Earn 70% revenue share on every paid install + enrollment.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                        Resume templates auto-create a Resume for the buyer — instant value.
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                        Featured placement for top-rated creators.
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creator Dashboard</h4>
                    {data.mine.templates.length + data.mine.content.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {data.mine.templates.length + data.mine.content.length} live
                      </Badge>
                    )}
                  </div>
                  <CreatorDashboard
                    mine={data.mine}
                    onDelete={deleteItem}
                    onTogglePublish={togglePublish}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ItemDialog
        item={preview}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onAction={handleAction}
        isBusy={preview ? installingId === preview.id : false}
      />
    </div>
  )
}
