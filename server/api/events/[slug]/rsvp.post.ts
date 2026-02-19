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

function getActivityMessage(name: string, status: RsvpStatus, comment?: string): string {
  const baseMessages: Record<RsvpStatus, string> = {
    IN: `${name} is in`,
    OUT: `${name} dropped out`,
    MAYBE: `${name} might come`,
    IN_IF: `${name} is in if...`,
    WAITLIST: `${name} joined the waitlist`
  }
  return baseMessages[status]
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

  // Fetch existing RSVP once for capacity check and status-change detection
  const existingRsvp = await prisma.rsvp.findUnique({
    where: {
      eventId_userId: {
        eventId: existingEvent.id,
        userId: auth.user.id
      }
    }
  })

  const statusChanged = !existingRsvp || existingRsvp.status !== status

  // Check capacity if RSVPing IN (skip for WAITLIST - it's for full events)
  if (status === 'IN' && statusChanged) {
    if (existingEvent._count.rsvps >= existingEvent.maxPlayers) {
      throw createError({
        statusCode: 400,
        message: 'Event is at full capacity'
      })
    }
  }
  const userName = auth.user.nickname || auth.user.name

  // Upsert the RSVP, only create activity if status actually changed
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
      status,
      comment: comment || null
    },
    update: {
      status,
      comment: comment || null
    }
  })

  // Create activity records for status changes and note updates
  const activities = []

  if (statusChanged) {
    activities.push(
      await prisma.eventActivity.create({
        data: {
          eventId: existingEvent.id,
          userId: auth.user.id,
          type: getActivityType(status),
          message: getActivityMessage(userName, status)
        }
      })
    )
  }

  // Create a note activity when comment changes (added or changed, not cleared)
  const oldComment = existingRsvp?.comment || null
  const newComment = comment || null
  if (newComment && newComment !== oldComment) {
    activities.push(
      await prisma.eventActivity.create({
        data: {
          eventId: existingEvent.id,
          userId: auth.user.id,
          type: 'NOTE_UPDATED',
          message: `${userName} added a note`,
          comment: newComment
        }
      })
    )
  }

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
    activities: activities.map(a => ({
      id: a.id,
      type: a.type,
      message: a.message,
      comment: a.comment,
      createdAt: a.createdAt.toISOString()
    }))
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
