import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, err, parseJson } from '@/lib/server'

function serializeMentor(m: any) {
  return {
    ...m,
    expertise: parseJson<string[]>(m.expertise),
    industries: parseJson<string[]>(m.industries),
    availability: parseJson<any[]>(m.availability),
    rateDisplay: `$${(m.rate / 100).toFixed(0)}`,
  }
}

function serializeBooking(b: any) {
  return {
    ...b,
    feedback: b.feedback ? parseJson(b.feedback) : null,
    mentor: b.mentor ? serializeMentor(b.mentor) : null,
    user: b.user,
  }
}

// GET — current user's bookings (as a user booking mentors) AND bookings
// received on their own mentor profile (as a mentor).
export async function GET() {
  try {
    const user = await getCurrentUser()
    const [asUser, ownMentor] = await Promise.all([
      db.booking.findMany({
        where: { userId: user.id },
        include: { mentor: { include: { user: true } } },
        orderBy: { scheduledAt: 'desc' },
      }),
      db.mentor.findUnique({
        where: { userId: user.id },
        include: {
          bookings: {
            include: { user: true },
            orderBy: { scheduledAt: 'desc' },
          },
        },
      }),
    ])

    return NextResponse.json({
      asUser: asUser.map(serializeBooking),
      asMentor: ownMentor?.bookings.map(serializeBooking) ?? [],
    })
  } catch (e) {
    return err(e)
  }
}

// POST — create a booking. Body: { mentorId, type, topic, scheduledAt, duration }
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    const body = await req.json()
    const { mentorId, type, topic, scheduledAt, duration } = body

    if (!mentorId || !scheduledAt) {
      return NextResponse.json(
        { error: 'mentorId and scheduledAt are required' },
        { status: 400 }
      )
    }

    const mentor = await db.mentor.findUnique({ where: { id: mentorId } })
    if (!mentor) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })
    }

    // Users cannot book their own mentor profile.
    if (mentor.userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot book your own mentor profile' },
        { status: 400 }
      )
    }

    const dur = Number(duration) || 60
    // prorated price based on the mentor's hourly rate (stored as cents).
    const price = Math.round((mentor.rate * dur) / 60)

    const booking = await db.booking.create({
      data: {
        userId: user.id,
        mentorId,
        type: type || 'session',
        topic: topic || null,
        scheduledAt: new Date(scheduledAt),
        duration: dur,
        status: 'pending',
        price,
      },
      include: { mentor: { include: { user: true } } },
    })

    // Increment mentor's session count as a booking signal.
    await db.mentor.update({
      where: { id: mentorId },
      data: { sessions: { increment: 1 } },
    })

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: 'booking.create',
          entity: 'Booking',
          entityId: booking.id,
          meta: JSON.stringify({
            mentorId,
            type: booking.type,
            price,
            duration: dur,
          }),
        },
      })
    } catch {}

    return NextResponse.json({ booking: serializeBooking(booking) })
  } catch (e) {
    return err(e)
  }
}
