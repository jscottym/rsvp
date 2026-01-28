import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const slug = getRouterParam(event, 'slug')

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Event slug is required'
    })
  }

  // Find the event
  const existingEvent = await prisma.event.findUnique({
    where: { slug }
  })

  if (!existingEvent) {
    throw createError({
      statusCode: 404,
      message: 'Event not found'
    })
  }

  // Check if user is organizer
  if (existingEvent.organizerId !== auth.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Only the organizer can view full RSVP details'
    })
  }

  // Get all RSVPs with full details
  const rsvps = await prisma.rsvp.findMany({
    where: { eventId: existingEvent.id },
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
  })

  return {
    rsvps: rsvps.map(r => ({
      id: r.id,
      status: r.status,
      comment: r.comment,
      name: r.user?.name || r.guestName || 'Anonymous',
      phone: r.user?.phone || r.guestPhone || null,
      isUser: !!r.user,
      createdAt: r.createdAt
    }))
  }
})
