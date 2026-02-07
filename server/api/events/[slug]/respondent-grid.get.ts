import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Event slug is required' })
  }

  const existingEvent = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true }
  })

  if (!existingEvent) {
    throw createError({ statusCode: 404, message: 'Event not found' })
  }

  if (existingEvent.organizerId !== auth.user.id) {
    throw createError({ statusCode: 403, message: 'Only the organizer can view the respondent grid' })
  }

  // Get all RSVPs with phone numbers
  const rsvps = await prisma.rsvp.findMany({
    where: { eventId: existingEvent.id },
    include: {
      user: {
        select: { id: true, name: true, phone: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Get organizer's groups with their members
  const groups = await prisma.group.findMany({
    where: { ownerId: auth.user.id },
    orderBy: [
      { type: 'desc' }, // MY_PEOPLE first (alphabetically desc: MY_PEOPLE > STANDARD)
      { createdAt: 'asc' }
    ],
    include: {
      members: {
        select: { phone: true }
      }
    }
  })

  // Build respondent list with group membership info
  const respondents = rsvps.map(r => {
    const phone = r.user?.phone || r.guestPhone || null
    const memberOfGroupIds = phone
      ? groups
          .filter(g => g.members.some(m => m.phone === phone))
          .map(g => g.id)
      : []

    return {
      rsvpId: r.id,
      name: r.user?.name || r.guestName || 'Anonymous',
      phone,
      status: r.status,
      isUser: !!r.user,
      groupIds: memberOfGroupIds
    }
  })

  return {
    respondents,
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      type: g.type
    }))
  }
})
