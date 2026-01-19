import { z } from 'zod'
import prisma from '../../utils/db'

const createFromEventSchema = z.object({
  eventSlug: z.string().min(1),
  groupName: z.string().min(1).max(100)
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  const body = await readBody(event)
  const parsed = createFromEventSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const { eventSlug, groupName } = parsed.data

  // Find the event and verify ownership
  const eventData = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      rsvps: {
        where: { status: 'IN' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true
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

  if (eventData.organizerId !== auth.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Only the organizer can create groups from this event'
    })
  }

  // Create group and members in transaction
  const group = await prisma.$transaction(async (tx) => {
    const newGroup = await tx.group.create({
      data: {
        name: groupName,
        visibility: 'PRIVATE',
        ownerId: auth.user!.id
      }
    })

    // Add attendees as members (excluding organizer)
    const members = eventData.rsvps
      .filter(r => r.user && r.userId !== auth.user!.id)
      .map(r => ({
        groupId: newGroup.id,
        userId: r.userId!,
        name: r.user!.name,
        phone: r.user!.phone
      }))

    // Also add guests (without userId)
    const guests = eventData.rsvps
      .filter(r => !r.user && r.guestName && r.guestPhone)
      .map(r => ({
        groupId: newGroup.id,
        userId: null,
        name: r.guestName!,
        phone: r.guestPhone!
      }))

    if (members.length > 0 || guests.length > 0) {
      await tx.groupMember.createMany({
        data: [...members, ...guests]
      })
    }

    return newGroup
  })

  const memberCount = await prisma.groupMember.count({
    where: { groupId: group.id }
  })

  return {
    group: {
      id: group.id,
      name: group.name,
      memberCount
    }
  }
})
