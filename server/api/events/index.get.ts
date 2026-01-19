import prisma from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  const events = await prisma.event.findMany({
    where: {
      organizerId: auth.user.id
    },
    orderBy: {
      datetime: 'desc'
    },
    include: {
      _count: {
        select: {
          rsvps: {
            where: { status: 'IN' }
          }
        }
      }
    }
  })

  return {
    events: events.map(e => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      sportType: e.sportType,
      location: e.location,
      datetime: e.datetime,
      endDatetime: e.endDatetime,
      minPlayers: e.minPlayers,
      maxPlayers: e.maxPlayers,
      allowSharing: e.allowSharing,
      rsvpCount: e._count.rsvps
    }))
  }
})
