import prisma from '../../../utils/db'

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

  // Find the event with organizer and RSVPs
  const eventData = await prisma.event.findUnique({
    where: { slug },
    include: {
      rsvps: {
        where: { status: 'WAITLIST' },
        include: {
          user: {
            select: {
              phone: true,
              name: true
            }
          }
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

  // Check if user is organizer or has IN status
  const isOrganizer = auth.user.id === eventData.organizerId

  if (!isOrganizer) {
    const userRsvp = await prisma.rsvp.findUnique({
      where: {
        eventId_userId: {
          eventId: eventData.id,
          userId: auth.user.id
        }
      }
    })

    if (!userRsvp || userRsvp.status !== 'IN') {
      throw createError({
        statusCode: 403,
        message: 'Only the organizer or confirmed attendees can notify the waitlist'
      })
    }
  }

  // Collect phone numbers from waitlisted users
  const phones: string[] = []
  for (const rsvp of eventData.rsvps) {
    if (rsvp.user?.phone) {
      phones.push(rsvp.user.phone)
    } else if (rsvp.guestPhone) {
      phones.push(rsvp.guestPhone)
    }
  }

  // Format event date for message
  const eventDate = new Date(eventData.datetime)
  const dayStr = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })

  // Build the message
  const baseUrl = process.env.PUBLIC_URL || 'https://example.com'
  const eventUrl = `${baseUrl}/e/${slug}`
  const message = `A spot just opened up for ${eventData.title} on ${dayStr}!\n\nClaim it here: ${eventUrl}`

  // Build SMS URL (comma-separated recipients for iOS, semicolon for Android - we'll use comma)
  const smsRecipients = phones.join(',')
  const smsUrl = `sms:${smsRecipients}?body=${encodeURIComponent(message)}`

  return {
    phones,
    message,
    smsUrl,
    waitlistCount: phones.length
  }
})
