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
      message: 'Only the organizer can delete this event'
    })
  }

  await prisma.event.delete({
    where: { slug }
  })

  return { success: true }
})
