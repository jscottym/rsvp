import prisma from '../../../utils/db'
import { formatEventDate, formatEventTime } from '../../../utils/dateFormat'

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

  // Format event time/location
  const eventDate = new Date(eventData.datetime)
  const dayStr = formatEventDate(eventDate)
  const timeStr = formatEventTime(eventDate)
  const eventInfo = `${dayStr} ${timeStr} at ${eventData.location}`

  // Build the event URL
  const baseUrl = process.env.PUBLIC_URL || 'https://example.com'
  const eventUrl = `${baseUrl}/e/${slug}`

  // Collect phone numbers for recipients
  const confirmedPhones = confirmedPlayers
    .filter(p => p.phone)
    .map(p => p.phone!)

  const waitlistPhones = waitlistPlayers
    .filter(p => p.phone)
    .map(p => p.phone!)

  let message: string
  let phones: string[]

  if (waitlistPlayers.length > 0) {
    // Has waitlist: notify both confirmed players and waitlist
    const confirmedFirstNames = confirmedPlayers.slice(0, 3).map(p => getFirstName(p.name))
    const waitlistFirstNames = waitlistPlayers.slice(0, 3).map(p => getFirstName(p.name))

    const confirmedGreeting = confirmedFirstNames.length > 0
      ? `${confirmedFirstNames.join(', ')}, sorry... `
      : ''

    const waitlistNames = waitlistFirstNames.join(', ')

    message = `${confirmedGreeting}I need to drop out. ${waitlistNames}, can any of you take my spot? ${eventInfo}\n\n${eventUrl}`
    phones = [...confirmedPhones, ...waitlistPhones]
  } else {
    // No waitlist: just notify confirmed players
    if (confirmedPlayers.length <= 4) {
      // Name them individually
      const firstNames = confirmedPlayers.map(p => getFirstName(p.name))
      const greeting = firstNames.length > 0 ? `${firstNames.join(', ')}, sorry... ` : ''
      message = `${greeting}I need to drop out for ${eventInfo}.`
    } else {
      // Too many to name
      message = `Sorry, I need to drop out for ${eventInfo}.`
    }
    phones = confirmedPhones
  }

  const smsRecipients = phones.join(',')
  const smsUrl = `sms:${smsRecipients}?body=${encodeURIComponent(message)}`

  return {
    message,
    phones,
    smsUrl,
    hasWaitlist: waitlistPlayers.length > 0,
    confirmedCount: confirmedPlayers.length,
    waitlistCount: waitlistPlayers.length
  }
})
