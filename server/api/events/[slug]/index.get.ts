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
        where: { status: 'IN' },
        include: {
          user: {
            select: {
              id: true,
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

  const auth = event.context.auth
  const isOrganizer = auth?.user?.id === eventData.organizerId

  // Get user's RSVP status if authenticated
  let userRsvp = null
  if (auth?.user) {
    const rsvp = await prisma.rsvp.findUnique({
      where: {
        eventId_userId: {
          eventId: eventData.id,
          userId: auth.user.id
        }
      }
    })
    userRsvp = rsvp?.status || null
  }

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
      rsvpCount: eventData.rsvps.length,
      attendees: eventData.rsvps.map(r => ({
        id: r.id,
        name: r.user?.name || r.guestName || 'Anonymous',
        isUser: !!r.user
      })),
      isOrganizer,
      userRsvp
    }
  }
})
