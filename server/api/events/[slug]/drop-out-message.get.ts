import prisma from '../../../utils/db'

function getFirstName(name: string): string {
  return name.split(' ')[0]
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const slug = getRouterParam(event, 'slug')

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Event slug is required'
    })
  }

  const eventData = await prisma.event.findUnique({
    where: { slug },
    include: {
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  })

  if (!eventData) {
    throw createError({
      statusCode: 404,
      message: 'Event not found'
    })
  }

  // Get confirmed players (excluding the current user who is dropping out)
  const confirmedPlayers = eventData.rsvps
    .filter(r => r.status === 'IN' && r.userId !== auth.user!.id)
    .map(r => ({
      name: r.user?.name || r.guestName || 'Anonymous',
      phone: r.user?.phone || r.guestPhone || null
    }))

  // Get waitlisted players
  const waitlistPlayers = eventData.rsvps
    .filter(r => r.status === 'WAITLIST')
    .map(r => ({
      name: r.user?.name || r.guestName || 'Anonymous',
      phone: r.user?.phone || r.guestPhone || null
    }))

  const confirmedPhones = confirmedPlayers
    .filter(p => p.phone)
    .map(p => p.phone!)

  const waitlistPhones = waitlistPlayers
    .filter(p => p.phone)
    .map(p => p.phone!)

  const confirmedFirstNames = confirmedPlayers.slice(0, 3).map(p => getFirstName(p.name))
  const waitlistFirstNames = waitlistPlayers.slice(0, 3).map(p => getFirstName(p.name))

  return {
    phones: waitlistPlayers.length > 0 
      ? [...confirmedPhones, ...waitlistPhones]
      : confirmedPhones,
    hasWaitlist: waitlistPlayers.length > 0,
    confirmedCount: confirmedPlayers.length,
    waitlistCount: waitlistPlayers.length,
    confirmedFirstNames,
    waitlistFirstNames,
    event: {
      title: eventData.title,
      datetime: eventData.datetime.toISOString(),
      location: eventData.location,
      slug
    }
  }
})
