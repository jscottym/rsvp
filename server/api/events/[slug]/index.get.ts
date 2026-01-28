import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Event slug is required'
    })
  }

  const eventData = await prisma.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: {
          id: true,
          name: true
        }
      },
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              name: true
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

  const auth = event.context.auth
  const isOrganizer = auth?.user?.id === eventData.organizerId

  // Get user's RSVP if authenticated
  let userRsvp: { status: string; comment: string | null; createdAt: string; updatedAt: string } | null = null
  if (auth?.user) {
    const rsvp = await prisma.rsvp.findUnique({
      where: {
        eventId_userId: {
          eventId: eventData.id,
          userId: auth.user.id
        }
      }
    })
    if (rsvp) {
      userRsvp = {
        status: rsvp.status,
        comment: rsvp.comment,
        createdAt: rsvp.createdAt.toISOString(),
        updatedAt: rsvp.updatedAt.toISOString()
      }
    }
  }

  // Count IN responses for capacity and WAITLIST for waitlist count
  const inCount = eventData.rsvps.filter(r => r.status === 'IN').length
  const waitlistCount = eventData.rsvps.filter(r => r.status === 'WAITLIST').length

  return {
    event: {
      id: eventData.id,
      slug: eventData.slug,
      title: eventData.title,
      sportType: eventData.sportType,
      description: eventData.description,
      location: eventData.location,
      datetime: eventData.datetime,
      endDatetime: eventData.endDatetime,
      minPlayers: eventData.minPlayers,
      maxPlayers: eventData.maxPlayers,
      allowSharing: eventData.allowSharing,
      sharingNote: eventData.sharingNote,
      organizer: {
        id: eventData.organizer.id,
        name: eventData.organizer.name
      },
      rsvpCount: inCount,
      waitlistCount,
      rsvps: eventData.rsvps.map(r => ({
        id: r.id,
        userId: r.user?.id || null,
        status: r.status,
        comment: r.comment,
        name: r.user?.name || r.guestName || 'Anonymous',
        isUser: !!r.user,
        updatedAt: r.updatedAt.toISOString()
      })),
      isOrganizer,
      userRsvp
    }
  }
})
