import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Event slug is required'
    })
  }

  // Find the event
  const existingEvent = await prisma.event.findUnique({
    where: { slug },
    select: { id: true }
  })

  if (!existingEvent) {
    throw createError({
      statusCode: 404,
      message: 'Event not found'
    })
  }

  // Get last 50 activities for this event
  const activities = await prisma.eventActivity.findMany({
    where: { eventId: existingEvent.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          nickname: true
        }
      }
    }
  })

  return {
    activities: activities.map(activity => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
      user: activity.user ? {
        id: activity.user.id,
        name: activity.user.nickname || activity.user.name
      } : null
    }))
  }
})
