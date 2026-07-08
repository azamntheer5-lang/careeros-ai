'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { useApp } from '@/components/app-provider'
import { useToast } from '@/hooks/use-toast'
import { useProfile } from '@/components/careeros/profile-context'
import { ModuleHeader } from '@/components/careeros/module-header'
import { Spinner } from '@/components/careeros/loading'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  GraduationCap,
  Star,
  Clock,
  Shield,
  Plus,
  X,
  Calendar,
  Video,
  FileText,
  Mic,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Mentor = {
  id: string
  userId: string
  slug: string
  title: string
  expertise: string[]
  industries: string[]
  experience: number | null
  rate: number
  currency: string
  rating: number
  sessions: number
  bio: string | null
  availability: { day: string; slots: string[] }[]
  verified: boolean
  rateDisplay?: string
  user?: { id: string; name: string | null; headline: string | null }
}

type Booking = {
  id: string
  userId: string
  mentorId: string
  type: string
  topic: string | null
  scheduledAt: string
  duration: number
  status: string
  price: number
  feedback: { rating?: number; comment?: string } | null
  mentor?: Mentor
  user?: { id: string; name: string | null }
}

const BOOKING_TYPES = [
  { value: 'session', label: '1:1 Session', icon: MessageSquare, desc: 'General career guidance' },
  { value: 'resume_review', label: 'Resume Review', icon: FileText, desc: 'Deep resume + ATS feedback' },
  { value: 'mock_interview', label: 'Mock Interview', icon: Mic, desc: 'Practice + live feedback' },
] as const

const STATUS_STYLE: Record<string, string> = {
  pending: 'border-amber-500/40 text-amber-600 bg-amber-500/10',
  confirmed: 'border-brand/40 text-brand bg-brand/10',
  completed: 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10',
  cancelled: 'border-destructive/40 text-destructive bg-destructive/10',
}

// ---------------------------------------------------------------------------
// Main module
// ---------------------------------------------------------------------------
export function MentorsModule() {
  const { t } = useApp()
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [ownMentor, setOwnMentor] = useState<Mentor | null>(null)
  const [myBookings, setMyBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('browse')
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null)

  useEffect(() => {
    api<{ mentors: Mentor[]; ownMentor: Mentor | null; myBookings: Booking[] }>('/api/mentors')
      .then((res) => {
        setMentors(res.mentors)
        setOwnMentor(res.ownMentor)
        setMyBookings(res.myBookings)
      })
      .finally(() => setLoading(false))
  }, [])

  const reload = async () => {
    const res = await api<{ mentors: Mentor[]; ownMentor: Mentor | null; myBookings: Booking[] }>('/api/mentors')
    setMentors(res.mentors)
    setOwnMentor(res.ownMentor)
    setMyBookings(res.myBookings)
  }

  return (
    <div>
      <ModuleHeader title={t('mentorsTitle')} subtitle={t('mentorsSub')} icon={GraduationCap} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-brand" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
            <TabsTrigger value="browse">Browse Mentors</TabsTrigger>
            <TabsTrigger value="bookings">
              My Bookings
              {myBookings.length > 0 && (
                <span className="ms-1.5 rounded-full bg-brand-soft text-brand text-[10px] px-1.5 leading-4">
                  {myBookings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentor">Become a Mentor</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
            <BrowseMentors
              mentors={mentors}
              onBook={(m) => setBookingMentor(m)}
              onBecomeMentor={() => setTab('mentor')}
            />
          </TabsContent>

          <TabsContent value="bookings">
            <MyBookings bookings={myBookings} onBrowse={() => setTab('browse')} />
          </TabsContent>

          <TabsContent value="mentor">
            <BecomeMentor mentor={ownMentor} onSaved={reload} />
          </TabsContent>
        </Tabs>
      )}

      {bookingMentor && (
        <BookingDialog
          mentor={bookingMentor}
          onClose={() => setBookingMentor(null)}
          onBooked={() => {
            setBookingMentor(null)
            reload()
            setTab('bookings')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Browse Mentors tab
// ---------------------------------------------------------------------------
function BrowseMentors({
  mentors,
  onBook,
  onBecomeMentor,
}: {
  mentors: Mentor[]
  onBook: (m: Mentor) => void
  onBecomeMentor: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = mentors.filter((m) => {
    if (!q) return true
    const hay = `${m.title} ${m.user?.name || ''} ${m.expertise.join(' ')} ${m.industries.join(' ')}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search mentors, expertise, industries…"
            className="ps-9 h-9 rounded-full bg-card"
          />
          <Sparkles className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onBecomeMentor}
        >
          <GraduationCap className="h-4 w-4" /> Become a mentor
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m, i) => (
          <MentorCard key={m.id} mentor={m} index={i} onBook={() => onBook(m)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No mentors match your search.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MentorCard({
  mentor,
  index,
  onBook,
}: {
  mentor: Mentor
  index: number
  onBook: () => void
}) {
  const name = mentor.user?.name || 'Mentor'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
    >
      <Card className="h-full hover:shadow-md hover:border-brand/40 transition-all group">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-12 w-12 ring-2 ring-brand/20">
              <AvatarFallback className="bg-brand-soft text-brand font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold truncate">{name}</h3>
                {mentor.verified && (
                  <Shield
                    className="h-3.5 w-3.5 text-brand shrink-0"
                    aria-label="Verified"
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{mentor.title}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-amber-600">
                {mentor.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {mentor.bio && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">
              {mentor.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {mentor.expertise.slice(0, 4).map((e) => (
              <Badge
                key={e}
                variant="outline"
                className="text-[10px] bg-brand-soft/40 border-brand/20 text-foreground"
              >
                {e}
              </Badge>
            ))}
            {mentor.expertise.length > 4 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                +{mentor.expertise.length - 4}
              </Badge>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-brand">
                  {mentor.rateDisplay || `$${(mentor.rate / 100).toFixed(0)}`}
                </span>
                <span className="text-[10px] text-muted-foreground">/ session</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {mentor.sessions} sessions
              </div>
            </div>
            <Button
              size="sm"
              className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90 h-8"
              onClick={onBook}
            >
              Book <ArrowRight className="h-3 w-3 flip-rtl" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Booking dialog
// ---------------------------------------------------------------------------
function BookingDialog({
  mentor,
  onClose,
  onBooked,
}: {
  mentor: Mentor
  onClose: () => void
  onBooked: () => void
}) {
  const { t } = useApp()
  const { toast } = useToast()
  const [type, setType] = useState<string>('session')
  const [topic, setTopic] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('60')
  const [busy, setBusy] = useState(false)

  // Default datetime = next day 17:00 local.
  useEffect(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(17, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    setScheduledAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    )
  }, [])

  const price = Math.round((mentor.rate * Number(duration)) / 60)

  const submit = async () => {
    if (!scheduledAt) {
      toast({ title: 'Pick a date & time', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      await api('/api/bookings', {
        method: 'POST',
        body: { mentorId: mentor.id, type, topic, scheduledAt, duration: Number(duration) },
      })
      toast({
        title: t('booked'),
        description: `Session with ${mentor.user?.name || 'mentor'} requested.`,
      })
      onBooked()
    } catch (e) {
      toast({ title: 'Booking failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const name = mentor.user?.name || 'Mentor'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-brand" /> Book {name}
          </DialogTitle>
          <DialogDescription>{mentor.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Session type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOKING_TYPES.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value}>
                    <span className="flex items-center gap-2">
                      <tp.icon className="h-3.5 w-3.5" />
                      {tp.label}
                      <span className="text-[10px] text-muted-foreground">· {tp.desc}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Topic (optional)</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Transitioning from IC to manager"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Date & time</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mentor.availability?.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                Mentor availability
              </div>
              <div className="flex flex-wrap gap-1.5">
                {mentor.availability.map((a) => (
                  <Badge key={a.day} variant="outline" className="text-[10px]">
                    {a.day}: {a.slots.join(', ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-brand-soft/40 p-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">Video session</span>
            </div>
            <div className="text-end">
              <div className="text-lg font-bold text-brand">
                ${(price / 100).toFixed(0)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {duration} min · {(mentor.rate / 100).toFixed(0)}/hr
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {busy ? <Spinner /> : <Calendar className="h-4 w-4" />}
            {t('book')} · ${(price / 100).toFixed(0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// My Bookings tab
// ---------------------------------------------------------------------------
function MyBookings({
  bookings,
  onBrowse,
}: {
  bookings: Booking[]
  onBrowse: () => void
}) {
  const now = Date.now()
  const upcoming = bookings.filter(
    (b) => new Date(b.scheduledAt).getTime() >= now && b.status !== 'cancelled'
  )
  const past = bookings.filter(
    (b) => new Date(b.scheduledAt).getTime() < now || b.status === 'cancelled'
  )

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="mb-4">No bookings yet. Browse mentors and book your first session.</p>
          <Button
            size="sm"
            className="rounded-full bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={onBrowse}
          >
            Browse mentors <ArrowRight className="h-3 w-3 flip-rtl" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <BookingList title="Upcoming" bookings={upcoming} empty="No upcoming sessions." />
      <BookingList title="Past" bookings={past} empty="No past sessions yet." />
    </div>
  )
}

function BookingList({
  title,
  bookings,
  empty,
}: {
  title: string
  bookings: Booking[]
  empty: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {bookings.length}
        </Badge>
      </div>
      {bookings.length === 0 ? (
        <p className="text-xs text-muted-foreground ps-0.5">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {bookings.map((b, i) => (
            <BookingCard key={b.id} booking={b} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking, index }: { booking: Booking; index: number }) {
  const mentor = booking.mentor
  const name = mentor?.user?.name || 'Mentor'
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const typeMeta = BOOKING_TYPES.find((tp) => tp.value === booking.type) || BOOKING_TYPES[0]
  const TypeIcon = typeMeta.icon
  const date = new Date(booking.scheduledAt)
  const isPast = date.getTime() < Date.now()

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.05, 0.4) }}>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 ring-1 ring-brand/20">
              <AvatarFallback className="bg-brand-soft text-brand text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{name}</div>
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize shrink-0 ${STATUS_STYLE[booking.status] || ''}`}
                >
                  {booking.status}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {mentor?.title}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px] bg-brand-soft/30 border-brand/20">
              <TypeIcon className="h-3 w-3" /> {typeMeta.label}
            </Badge>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              · {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {booking.duration}m
            </span>
            <span className="ms-auto text-brand font-semibold">
              ${(booking.price / 100).toFixed(0)}
            </span>
          </div>

          {booking.topic && (
            <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground">Topic: </span>
              {booking.topic}
            </div>
          )}

          {isPast && booking.status === 'completed' && booking.feedback?.rating && (
            <div className="mt-2 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < (booking.feedback?.rating || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
              {booking.feedback?.comment && (
                <span className="text-[10px] text-muted-foreground ms-1 line-clamp-1">
                  · {booking.feedback.comment}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Become a Mentor tab
// ---------------------------------------------------------------------------
function BecomeMentor({
  mentor,
  onSaved,
}: {
  mentor: Mentor | null
  onSaved: () => void
}) {
  const { t } = useApp()
  const { toast } = useToast()
  const { user, profile } = useProfile()
  const [form, setForm] = useState({
    title: '',
    expertise: [] as string[],
    industries: [] as string[],
    experience: 5,
    rate: 100,
    bio: '',
    availability: 'Mon: 17:00, 18:00\nWed: 17:00, 18:00',
  })
  const [busy, setBusy] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate form from existing mentor or profile.
  useEffect(() => {
    if (mentor) {
      setForm({
        title: mentor.title || '',
        expertise: mentor.expertise || [],
        industries: mentor.industries || [],
        experience: mentor.experience ?? 5,
        rate: Math.round((mentor.rate || 0) / 100),
        bio: mentor.bio || '',
        availability:
          mentor.availability?.length > 0
            ? mentor.availability
                .map((a) => `${a.day}: ${a.slots.join(', ')}`)
                .join('\n')
            : 'Mon: 17:00, 18:00\nWed: 17:00, 18:00',
      })
    } else if (profile) {
      setForm((f) => ({
        ...f,
        title: profile.targetRole ? `${profile.targetRole} & Career Coach` : 'Career Mentor',
        expertise: profile.strengths?.slice(0, 6) || [],
        industries: profile.industry ? [profile.industry] : [],
        experience: profile.experienceYears ?? 5,
        bio: profile.brandStatement || '',
      }))
    }
    setHydrated(true)
  }, [mentor?.id, profile?.id])

  const parseAvailability = (text: string) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [day, rest] = line.split(':')
        if (!day || !rest) return null
        const slots = rest
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        return slots.length ? { day: day.trim(), slots } : null
      })
      .filter(Boolean) as { day: string; slots: string[] }[]
  }

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const availability = parseAvailability(form.availability)
      const payload = {
        title: form.title.trim(),
        expertise: form.expertise,
        industries: form.industries,
        experience: Number(form.experience),
        rate: Number(form.rate) * 100, // dollars → cents
        bio: form.bio.trim() || null,
        availability,
      }
      if (mentor) {
        await api(`/api/mentors/${mentor.id}`, { method: 'PUT', body: payload })
        toast({ title: 'Mentor profile updated' })
      } else {
        await api('/api/mentors', { method: 'POST', body: payload })
        toast({ title: 'Mentor profile created', description: 'You are now listed in the marketplace.' })
      }
      onSaved()
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b">
            <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center ring-1 ring-brand/20">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {mentor ? 'Edit your mentor profile' : 'Become a mentor'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Share your expertise. Get paid to help others grow.
              </p>
            </div>
            {mentor?.verified && (
              <Badge variant="outline" className="ms-auto text-[10px] text-brand border-brand/40">
                <Shield className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Title / Headline</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Principal Engineer @ Google"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Shown prominently on your mentor card.
            </p>
          </div>

          <ChipInput
            label="Expertise"
            placeholder="Add an expertise area and press Enter"
            values={form.expertise}
            onChange={(v) => setForm({ ...form, expertise: v })}
          />

          <ChipInput
            label="Industries"
            placeholder="Add an industry and press Enter"
            values={form.industries}
            onChange={(v) => setForm({ ...form, industries: v })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Experience (years)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rate (USD / hour)</Label>
              <div className="relative mt-1">
                <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  type="number"
                  min={0}
                  step={10}
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                  className="ps-6"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell mentees about your background, what you can help with, and your mentoring style."
              rows={4}
              className="mt-1 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Availability</Label>
            <Textarea
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              placeholder={'Mon: 17:00, 18:00\nWed: 17:00, 18:00'}
              rows={3}
              className="mt-1 font-mono text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              One day per line. Format: <code>Day: HH:MM, HH:MM</code>
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={save}
              disabled={busy || !hydrated}
              className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90 rounded-full"
            >
              {busy ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
              {mentor ? t('save') : t('create')} profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview + tips sidebar */}
      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2.5">
              Live preview
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3 mb-2">
                <Avatar className="h-11 w-11 ring-2 ring-brand/20">
                  <AvatarFallback className="bg-brand-soft text-brand font-semibold text-sm">
                    {(user?.name || 'M')
                      .split(' ')
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm truncate">
                      {user?.name || 'Your name'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {form.title || 'Your title'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-600">New</span>
                </div>
              </div>
              {form.bio && (
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                  {form.bio}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mb-2">
                {form.expertise.slice(0, 3).map((e) => (
                  <Badge
                    key={e}
                    variant="outline"
                    className="text-[9px] bg-brand-soft/40 border-brand/20"
                  >
                    {e}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-bold text-brand">${form.rate}/session</span>
                <span className="text-[10px] text-muted-foreground">0 sessions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-soft/30 border-brand/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-xs font-semibold">Tips to get booked</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">▸</span>
                Be specific in your title — company + role beats generic labels.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">▸</span>
                List 4-8 expertise areas — mentees search by skill.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">▸</span>
                Mention outcomes you have helped people achieve.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-brand mt-0.5">▸</span>
                Competitive rates start at $100-200/hr for senior mentors.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable chip input (expertise / industries)
// ---------------------------------------------------------------------------
function ChipInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (values.includes(v)) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={add}
          disabled={!draft.trim()}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {values.map((v) => (
            <Badge
              key={v}
              variant="outline"
              className="text-[11px] bg-brand-soft/40 border-brand/20 gap-1 ps-2 pe-1 py-0.5"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-full hover:bg-brand/15 p-0.5"
                aria-label={`Remove ${v}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
