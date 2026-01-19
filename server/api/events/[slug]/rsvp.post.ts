import { z } from 'zod'
import prisma from '../../../utils/db'

const rsvpSchema = z.object({
  status: z.enum(['IN', 'OUT'])
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const slug = getRouterParam(event, 'slug')

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required to RSVP'
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
    where: { slug },
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

  if (!existingEvent) {
    throw createError({
      statusCode: 404,
      message: 'Event not found'
    })
  }

  const body = await readBody(event)
  const parsed = rsvpSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const { status } = parsed.data

  // Check capacity if RSVPing IN
  if (status === 'IN') {
    const existingRsvp = await prisma.rsvp.findUnique({
      where: {
        eventId_userId: {
          eventId: existingEvent.id,
          userId: auth.user.id
        }
      }
    })

    // Only check capacity if this is a new RSVP or changing from OUT to IN
    if (!existingRsvp || existingRsvp.status === 'OUT') {
      if (existingEvent._count.rsvps >= existingEvent.maxPlayers) {
        throw createError({
          statusCode: 400,
          message: 'Event is at full capacity'
        })
      }
    }
  }

  // Upsert the RSVP
  const rsvp = await prisma.rsvp.upsert({
    where: {
      eventId_userId: {
        eventId: existingEvent.id,
        userId: auth.user.id
      }
    },
    create: {
      eventId: existingEvent.id,
      userId: auth.user.id,
      status
    },
    update: {
      status
    }
  })

  // Get updated count
  const updatedCount = await prisma.rsvp.count({
    where: {
      eventId: existingEvent.id,
      status: 'IN'
    }
  })

  return {
    rsvp: {
      id: rsvp.id,
      status: rsvp.status
    },
    rsvpCount: updatedCount
  }
})
