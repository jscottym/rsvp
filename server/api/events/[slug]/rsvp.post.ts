import { z } from 'zod'
import prisma from '../../../utils/db'
import { broadcastToEvent, type RsvpUpdatePayload } from '../../../utils/broadcast'
import type { EventActivityType, RsvpStatus } from '@prisma/client'

const rsvpSchema = z.object({
  status: z.enum(['IN', 'OUT', 'MAYBE', 'IN_IF', 'WAITLIST']),
  comment: z.string().max(500).optional()
})

function getActivityType(status: RsvpStatus): EventActivityType {
  const map: Record<RsvpStatus, EventActivityType> = {
    IN: 'RSVP_IN',
    OUT: 'RSVP_OUT',
    MAYBE: 'RSVP_MAYBE',
    IN_IF: 'RSVP_IN_IF',
    WAITLIST: 'RSVP_WAITLIST'
  }
  return map[status]
}

function getActivityMessage(name: string, status: RsvpStatus): string {
  const messages: Record<RsvpStatus, string> = {
    IN: `${name} is in`,
    OUT: `${name} dropped out`,
    MAYBE: `${name} might come`,
    IN_IF: `${name} is in if...`,
    WAITLIST: `${name} joined the waitlist`
  }
  return messages[status]
}

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

  const { status, comment } = parsed.data

  // Check capacity if RSVPing IN (skip for WAITLIST - it's for full events)
  if (status === 'IN') {
    const existingRsvp = await prisma.rsvp.findUnique({
      where: {
        eventId_userId: {
          eventId: existingEvent.id,
          userId: auth.user.id
        }
      }
    })

    // Only check capacity if this is a new RSVP or changing to IN from another status
    if (!existingRsvp || existingRsvp.status !== 'IN') {
      if (existingEvent._count.rsvps >= existingEvent.maxPlayers) {
        throw createError({
          statusCode: 400,
          message: 'Event is at full capacity'
        })
      }
    }
  }

  // Upsert the RSVP and create activity in a transaction
  const userName = auth.user.nickname || auth.user.name
  const activityMessage = getActivityMessage(userName, status)
  const activityType = getActivityType(status)

  const [rsvp, activity] = await prisma.$transaction([
    prisma.rsvp.upsert({
      where: {
        eventId_userId: {
          eventId: existingEvent.id,
          userId: auth.user.id
        }
      },
      create: {
        eventId: existingEvent.id,
        userId: auth.user.id,
        status,
        comment: comment || null
      },
      update: {
        status,
        comment: comment || null
      }
    }),
    prisma.eventActivity.create({
      data: {
        eventId: existingEvent.id,
        userId: auth.user.id,
        type: activityType,
        message: activityMessage
      }
    })
  ])

  // Get updated counts
  const [updatedCount, waitlistCount] = await Promise.all([
    prisma.rsvp.count({
      where: {
        eventId: existingEvent.id,
        status: 'IN'
      }
    }),
    prisma.rsvp.count({
      where: {
        eventId: existingEvent.id,
        status: 'WAITLIST'
      }
    })
  ])

  // Broadcast update to all connected clients
  const payload: RsvpUpdatePayload = {
    type: 'rsvp_update',
    eventSlug: slug,
    rsvp: {
      id: rsvp.id,
      userId: rsvp.userId,
      status: rsvp.status,
      comment: rsvp.comment,
      name: userName
    },
    counts: {
      rsvpCount: updatedCount,
      waitlistCount
    },
    activity: {
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt.toISOString()
    }
  }

  broadcastToEvent(slug, payload)

  return {
    rsvp: {
      id: rsvp.id,
      status: rsvp.status,
      comment: rsvp.comment
    },
    rsvpCount: updatedCount,
    waitlistCount
  }
})
