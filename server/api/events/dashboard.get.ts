import prisma from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  const now = new Date()

  // Find all events where user is organizer OR has an RSVP
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: auth.user.id },
        { rsvps: { some: { userId: auth.user.id } } }
      ]
    },
    orderBy: {
      datetime: 'asc'
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true
        }
      },
      rsvps: {
        where: { userId: auth.user.id },
        select: { status: true }
      },
      _count: {
        select: {
          rsvps: {
            where: { status: 'IN' }
          }
        }
      }
    }
  })

  // Split into upcoming and past, with appropriate ordering
  const upcoming = events
    .filter(e => new Date(e.datetime) >= now)
    .map(e => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      sportType: e.sportType,
      location: e.location,
      datetime: e.datetime,
      endDatetime: e.endDatetime,
      maxPlayers: e.maxPlayers,
      rsvpCount: e._count.rsvps,
      isOrganizer: e.organizerId === auth.user.id,
      userRsvpStatus: e.rsvps[0]?.status ?? null,
      organizer: e.organizer
    }))

  const past = events
    .filter(e => new Date(e.datetime) < now)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    .map(e => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      sportType: e.sportType,
      location: e.location,
      datetime: e.datetime,
      endDatetime: e.endDatetime,
      maxPlayers: e.maxPlayers,
      rsvpCount: e._count.rsvps,
      isOrganizer: e.organizerId === auth.user.id,
      userRsvpStatus: e.rsvps[0]?.status ?? null,
      organizer: e.organizer
    }))

  return {
    upcoming,
    past
  }
})
