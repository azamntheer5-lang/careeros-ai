'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Heart,
  MessageCircle,
  Send,
  X,
  Plus,
  Check,
  Globe,
  Lock,
  Sparkles,
  TrendingUp,
  Award,
  HelpCircle,
  Briefcase,
  PencilLine,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types (local — the network module owns its shape; types.ts is not modified)
// ---------------------------------------------------------------------------

type NetworkProfile = {
  id: string
  userId: string
  slug: string
  bio: string | null
  headline: string | null
  tags: string[]
  visibility: 'public' | 'private'
  followers: number
  following: number
  userName: string | null
  userHeadline: string | null
  isFollowing?: boolean
}

type Post = {
  id: string
  type: string
  title: string | null
  content: string
  tags: string[]
  likes: number
  comments: number
  createdAt: string
  authorId: string
  authorName: string | null
  authorHeadline: string | null
}

type NetworkResponse = {
  profile: NetworkProfile
  posts: Post[]
  suggested: NetworkProfile[]
}

// ---------------------------------------------------------------------------
// Post-type styling
// ---------------------------------------------------------------------------

const POST_TYPES: { value: string; label: string; icon: typeof Sparkles; badge: string }[] = [
  { value: 'post', label: 'Post', icon: Sparkles, badge: 'bg-secondary text-secondary-foreground' },
  { value: 'achievement', label: 'Achievement', icon: Award, badge: 'bg-brand-soft text-brand' },
  { value: 'question', label: 'Question', icon: HelpCircle, badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { value: 'opportunity', label: 'Opportunity', icon: Briefcase, badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' },
]

function postTypeMeta(type: string) {
  return POST_TYPES.find((p) => p.value === type) ?? POST_TYPES[0]
}

function initials(name: string | null): string {
  if (!name) return '··'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase()
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ===========================================================================
// Module
// ===========================================================================

export function NetworkModule() {
  const { t } = useApp()
  const [data, setData] = useState<NetworkResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await api<NetworkResponse>('/api/network')
    setData(res)
    setLoading(false)
  }, [])

  useEffect(() => {
    api<NetworkResponse>('/api/network')
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const refreshFeed = useCallback(async () => {
    const res = await api<{ posts: Post[] }>('/api/network')
    setData((d) => (d ? { ...d, posts: res.posts } : d))
  }, [])

  const updateSuggested = useCallback(
    (profileId: string, isFollowing: boolean, newFollowers: number) => {
      setData((d) =>
        d
          ? {
              ...d,
              suggested: d.suggested.map((s) =>
                s.id === profileId ? { ...s, isFollowing, followers: newFollowers } : s
              ),
            }
          : d
      )
    },
    []
  )

  const updateOwnFollowingCount = useCallback((delta: number) => {
    setData((d) => (d ? { ...d, profile: { ...d.profile, following: Math.max(0, d.profile.following + delta) } } : d))
  }, [])

  return (
    <div>
      <ModuleHeader
        title={t('networkTitle')}
        subtitle={t('networkSub')}
        icon={Users}
        actions={
          data ? (
            <div className="hidden sm:flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-brand" />
              <span className="font-medium">{data.profile.followers}</span>
              <span className="text-muted-foreground">followers</span>
              <span className="mx-1 h-3 w-px bg-border" />
              <span className="font-medium">{data.profile.following}</span>
              <span className="text-muted-foreground">following</span>
            </div>
          ) : null
        }
      />

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : (
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-5">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            <FeedTab
              profile={data.profile}
              posts={data.posts}
              onPosted={refreshFeed}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab profile={data.profile} posts={data.posts.filter((p) => p.authorId === data.profile.userId)} onSaved={load} />
          </TabsContent>

          <TabsContent value="discover">
            <DiscoverTab
              suggested={data.suggested}
              onFollowChange={(profileId, following, followers) => {
                updateSuggested(profileId, following, followers)
                updateOwnFollowingCount(following ? 1 : -1)
              }}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ===========================================================================
// Feed Tab
// ===========================================================================

function FeedTab({ profile, posts, onPosted }: { profile: NetworkProfile; posts: Post[]; onPosted: () => Promise<void> }) {
  const { toast } = useToast()
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('post')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      toast({ title: 'Nothing to post', description: 'Write something before posting.', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api('/api/network', {
        method: 'POST',
        body: { content: trimmed, title: title.trim() || undefined, type, tags },
      })
      setContent('')
      setTitle('')
      setTags([])
      setTagDraft('')
      setType('post')
      toast({ title: 'Posted', description: 'Your post is live in the feed.' })
      await onPosted()
    } catch (e) {
      toast({ title: 'Failed to post', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const addTag = () => {
    const v = tagDraft.trim()
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagDraft('')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-4">
        {/* Composer */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="bg-card/60 backdrop-blur-sm border-border/70">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 ring-1 ring-border">
                  <AvatarFallback className="bg-brand-soft text-brand text-xs font-semibold">
                    {initials(profile.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {POST_TYPES.map((p) => {
                      const Icon = p.icon
                      const active = type === p.value
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setType(p.value)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                            active
                              ? 'border-brand/40 bg-brand-soft text-brand'
                              : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                        >
                          <Icon className="h-3 w-3" /> {p.label}
                        </button>
                      )
                    })}
                  </div>

                  {(type === 'achievement' || type === 'opportunity' || type === 'question') && (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        type === 'achievement'
                          ? 'What did you achieve?'
                          : type === 'question'
                          ? 'What do you want to ask?'
                          : 'What opportunity is this?'
                      }
                      className="mb-2 h-9 text-sm"
                    />
                  )}

                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share an insight, win, or question with the network…"
                    rows={3}
                    className="resize-none text-sm"
                  />

                  <TagChips tags={tags} draft={tagDraft} setDraft={setTagDraft} onAdd={addTag} onRemove={(i) => setTags(tags.filter((_, idx) => idx !== i))} />

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] text-muted-foreground">{content.length} chars</span>
                    <Button
                      size="sm"
                      onClick={submit}
                      disabled={busy || !content.trim()}
                      className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feed */}
        <div className="space-y-3">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No posts yet. Be the first to share something with the network.
              </CardContent>
            </Card>
          ) : (
            posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.2) }}
              >
                <PostCard post={post} />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar — your profile snapshot */}
      <aside className="hidden lg:block">
        <Card className="bg-card/60 backdrop-blur-sm border-border/70 sticky top-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 ring-1 ring-border">
                <AvatarFallback className="bg-brand-soft text-brand text-sm font-semibold">
                  {initials(profile.userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{profile.userName}</div>
                <div className="text-xs text-muted-foreground truncate">{profile.headline}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
              {profile.bio || 'No bio yet. Switch to My Profile to add one.'}
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg border bg-background/50 p-2.5 text-center">
                <div className="text-lg font-semibold text-brand">{profile.followers}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Followers</div>
              </div>
              <div className="rounded-lg border bg-background/50 p-2.5 text-center">
                <div className="text-lg font-semibold text-brand">{profile.following}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Following</div>
              </div>
            </div>
            {profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  const meta = postTypeMeta(post.type)
  const Icon = meta.icon
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border/70 hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 ring-1 ring-border shrink-0">
            <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
              {initials(post.authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold text-sm truncate">{post.authorName || 'Anonymous'}</span>
              <span className="text-[11px] text-muted-foreground truncate">{post.authorHeadline}</span>
              <span className="text-[11px] text-muted-foreground">· {timeAgo(post.createdAt)}</span>
            </div>

            <div className="mt-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}>
                <Icon className="h-2.5 w-2.5" /> {meta.label}
              </span>
            </div>

            {post.title && <h4 className="font-medium text-sm mt-2 leading-snug">{post.title}</h4>}
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap leading-relaxed">{post.content}</p>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-[10px] text-brand bg-brand-soft/60 rounded-full px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <button className="inline-flex items-center gap-1 hover:text-brand transition-colors" type="button">
                <Heart className="h-3.5 w-3.5" /> {post.likes}
              </button>
              <button className="inline-flex items-center gap-1 hover:text-brand transition-colors" type="button">
                <MessageCircle className="h-3.5 w-3.5" /> {post.comments}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// Profile Tab
// ===========================================================================

function ProfileTab({
  profile,
  posts,
  onSaved,
}: {
  profile: NetworkProfile
  posts: Post[]
  onSaved: () => Promise<void>
}) {
  const { toast } = useToast()
  const [bio, setBio] = useState(profile.bio ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [tags, setTags] = useState<string[]>(profile.tags)
  const [tagDraft, setTagDraft] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>(profile.visibility)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Re-sync if the upstream profile changes after save/refresh.
  useEffect(() => {
    setBio(profile.bio ?? '')
    setHeadline(profile.headline ?? '')
    setTags(profile.tags)
    setVisibility(profile.visibility)
    setDirty(false)
  }, [profile.id, profile.bio, profile.headline, profile.visibility, profile.tags.join(',')])

  const addTag = () => {
    const v = tagDraft.trim()
    if (v && !tags.includes(v)) {
      setTags([...tags, v])
      setDirty(true)
    }
    setTagDraft('')
  }

  const save = async () => {
    setBusy(true)
    try {
      await api(`/api/network/${profile.slug}`, {
        method: 'PUT',
        body: {
          bio: bio.trim() || null,
          headline: headline.trim() || null,
          tags,
          visibility,
        },
      })
      setDirty(false)
      toast({ title: 'Profile saved', description: 'Your network profile is updated.' })
      await onSaved()
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-4">
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="bg-card/60 backdrop-blur-sm border-border/70">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-brand/30 shrink-0">
                  <AvatarFallback className="bg-brand-soft text-brand text-lg font-semibold">
                    {initials(profile.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{profile.userName}</h3>
                    {visibility === 'public' ? (
                      <Badge variant="outline" className="text-[10px] gap-1 text-brand border-brand/30">
                        <Globe className="h-2.5 w-2.5" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" /> Private
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{profile.headline || 'No headline yet'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span><strong className="text-foreground">{profile.followers}</strong> <span className="text-muted-foreground">followers</span></span>
                    <span><strong className="text-foreground">{profile.following}</strong> <span className="text-muted-foreground">following</span></span>
                    <span className="text-muted-foreground">@{profile.slug}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit form */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <PencilLine className="h-4 w-4 text-brand" />
              <h3 className="font-semibold text-sm">Edit profile</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Headline</Label>
                <Input
                  value={headline}
                  onChange={(e) => { setHeadline(e.target.value); setDirty(true) }}
                  placeholder="e.g. Senior Engineer @ Vercel · Building dev tools"
                  className="mt-1 h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); setDirty(true) }}
                  placeholder="Tell the network who you are, what you build, and what you care about."
                  rows={4}
                  className="mt-1 text-sm resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">{bio.length} characters</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Expertise tags</Label>
                <TagChips
                  tags={tags}
                  draft={tagDraft}
                  setDraft={setTagDraft}
                  onAdd={addTag}
                  onRemove={(i) => { setTags(tags.filter((_, idx) => idx !== i)); setDirty(true) }}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-background/40 px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {visibility === 'public' ? <Globe className="h-3.5 w-3.5 text-brand" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                    Public profile
                  </div>
                  <p className="text-[11px] text-muted-foreground">When on, anyone can view your profile by slug.</p>
                </div>
                <Switch
                  checked={visibility === 'public'}
                  onCheckedChange={(v) => { setVisibility(v ? 'public' : 'private'); setDirty(true) }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={save}
                  disabled={busy || !dirty}
                  className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
                  Save changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Own posts */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Your posts</h4>
          <div className="space-y-3">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  You haven&apos;t posted yet. Head to the Feed tab to share something.
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      </div>

      {/* Tip card */}
      <aside className="hidden lg:block">
        <Card className="bg-card/60 backdrop-blur-sm border-border/70 sticky top-4">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h4 className="font-semibold text-sm">Profile tips</h4>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><TrendingUp className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" /> Profiles with a clear headline get 4× more profile views.</li>
              <li className="flex gap-2"><Award className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" /> Add 3–6 expertise tags so others can find you in Discover.</li>
              <li className="flex gap-2"><Users className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" /> Posting weekly keeps your profile in the network feed.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

// ===========================================================================
// Discover Tab
// ===========================================================================

function DiscoverTab({
  suggested,
  onFollowChange,
}: {
  suggested: NetworkProfile[]
  onFollowChange: (profileId: string, following: boolean, followers: number) => void
}) {
  const { toast } = useToast()
  const [pending, setPending] = useState<string | null>(null)

  const toggleFollow = async (p: NetworkProfile) => {
    setPending(p.id)
    try {
      const res = await api<{ following: boolean; followers: number }>('/api/network/follow', {
        method: 'POST',
        body: { followeeId: p.id },
      })
      onFollowChange(p.id, res.following, res.followers)
      toast({
        title: res.following ? `Following ${p.userName}` : `Unfollowed ${p.userName}`,
        description: res.following ? "You'll see their posts in your feed." : undefined,
      })
    } catch (e) {
      toast({ title: 'Action failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {suggested.length} professional{suggested.length === 1 ? '' : 's'} to follow
        </p>
      </div>

      {suggested.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No suggestions yet. Check back later for new professionals.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {suggested.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.25) }}
            >
              <Card className="bg-card/60 backdrop-blur-sm border-border/70 h-full flex flex-col hover:border-brand/30 transition-colors">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-12 w-12 ring-1 ring-border shrink-0">
                      <AvatarFallback className="bg-brand-soft text-brand text-sm font-semibold">
                        {initials(p.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.userName}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.headline}</div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3 flex-1">
                    {p.bio || 'No bio yet.'}
                  </p>

                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{p.followers}</span> followers ·{' '}
                      <span className="font-medium text-foreground">{p.following}</span> following
                    </div>
                    <Button
                      size="sm"
                      variant={p.isFollowing ? 'outline' : 'default'}
                      onClick={() => toggleFollow(p)}
                      disabled={pending === p.id}
                      className={
                        p.isFollowing
                          ? 'rounded-full h-8 text-xs'
                          : 'rounded-full h-8 text-xs bg-brand text-brand-foreground hover:bg-brand/90'
                      }
                    >
                      {pending === p.id ? (
                        <Spinner className="h-3 w-3" />
                      ) : p.isFollowing ? (
                        <>
                          <Check className="h-3 w-3" /> Following
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> Follow
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Shared — Tag chip input
// ===========================================================================

function TagChips({
  tags,
  draft,
  setDraft,
  onAdd,
  onRemove,
}: {
  tags: string[]
  draft: string
  setDraft: (v: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="mt-1">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              onAdd()
            }
          }}
          placeholder="Add a tag (e.g. Distributed Systems)"
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAdd}
          disabled={!draft.trim()}
          className="h-8 px-2.5 rounded-full"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft/70 text-brand text-[11px] font-medium px-2 py-0.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="hover:bg-brand/20 rounded-full p-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
