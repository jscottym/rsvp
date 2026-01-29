import { z } from 'zod'
import prisma from '../../../utils/db'
import { broadcastToEvent, type EventUpdatePayload } from '../../../utils/broadcast'

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  location: z.string().min(1).max(500).optional(),
  datetime: z.string().transform(s => new Date(s)).optional(),
  endDatetime: z.string().transform(s => new Date(s)).optional(),
  minPlayers: z.number().int().min(1).optional(),
  maxPlayers: z.number().int().min(1).optional(),
  allowSharing: z.boolean().optional(),
  sharingNote: z.string().max(500).optional().nullable()
})

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
      message: 'Only the organizer can update this event'
    })
  }

  const body = await readBody(event)
  const parsed = updateEventSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const data = parsed.data

  // Validate min <= max if both provided
  const minPlayers = data.minPlayers ?? existingEvent.minPlayers
  const maxPlayers = data.maxPlayers ?? existingEvent.maxPlayers

  if (minPlayers > maxPlayers) {
    throw createError({
      statusCode: 400,
      message: 'Minimum players cannot exceed maximum players'
    })
  }

  // Validate endDatetime > datetime if either is being updated
  const effectiveStart = data.datetime ?? existingEvent.datetime
  const effectiveEnd = data.endDatetime ?? existingEvent.endDatetime
  if (effectiveEnd <= effectiveStart) {
    throw createError({
      statusCode: 400,
      message: 'End time must be after start time'
    })
  }

  // Build the changes summary for activity log
  const changes: string[] = []
  let newDatetime: Date | null = null

  if (data.location && data.location !== existingEvent.location) {
    changes.push(`location to ${data.location}`)
  }
  if (data.datetime) {
    const newDate = new Date(data.datetime)
    const oldDate = existingEvent.datetime
    if (newDate.getTime() !== oldDate.getTime()) {
      changes.push('time')
      newDatetime = newDate
    }
  }
  if (data.maxPlayers !== undefined && data.maxPlayers !== existingEvent.maxPlayers) {
    changes.push(`max players to ${data.maxPlayers}`)
  }
  if (data.title && data.title !== existingEvent.title) {
    changes.push(`title to "${data.title}"`)
  }

  const updated = await prisma.event.update({
    where: { slug },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.location && { location: data.location }),
      ...(data.datetime && { datetime: data.datetime }),
      ...(data.endDatetime && { endDatetime: data.endDatetime }),
      ...(data.minPlayers !== undefined && { minPlayers: data.minPlayers }),
      ...(data.maxPlayers !== undefined && { maxPlayers: data.maxPlayers }),
      ...(data.allowSharing !== undefined && { allowSharing: data.allowSharing }),
      ...(data.sharingNote !== undefined && { sharingNote: data.sharingNote })
    }
  })

  // Create activity record if there were meaningful changes
  let activity = null
  if (changes.length > 0) {
    const userName = auth.user.nickname || auth.user.name
    const activityMessage = `${userName} changed ${changes.join(', ')}`
    const activityComment = newDatetime 
      ? JSON.stringify({ datetime: newDatetime.toISOString() })
      : null

    activity = await prisma.eventActivity.create({
      data: {
        eventId: existingEvent.id,
        userId: auth.user.id,
        type: 'EVENT_EDITED',
        message: activityMessage,
        comment: activityComment
      }
    })
  }

  // Always broadcast the updated event to all connected clients
  const payload: EventUpdatePayload = {
    type: 'event_update',
    eventSlug: slug,
    event: {
      location: updated.location,
      datetime: updated.datetime.toISOString(),
      endDatetime: updated.endDatetime.toISOString(),
      minPlayers: updated.minPlayers,
      maxPlayers: updated.maxPlayers,
      description: updated.description,
      allowSharing: updated.allowSharing
    },
    activity: activity ? {
      id: activity.id,
      type: activity.type,
      message: activity.message,
      comment: activity.comment,
      createdAt: activity.createdAt.toISOString()
    } : null as any
  }

  broadcastToEvent(slug, payload)

  return {
    event: {
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      sportType: updated.sportType,
      description: updated.description,
      location: updated.location,
      datetime: updated.datetime,
      endDatetime: updated.endDatetime,
      minPlayers: updated.minPlayers,
      maxPlayers: updated.maxPlayers,
      allowSharing: updated.allowSharing,
      sharingNote: updated.sharingNote
    }
  }
})
