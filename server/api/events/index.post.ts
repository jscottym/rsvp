import { z } from 'zod'
import prisma from '../../utils/db'
import { generateEventSlug } from '../../utils/slug'

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  sportType: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  location: z.string().min(1).max(500),
  datetime: z.string().transform(s => new Date(s)),
  endDatetime: z.string().transform(s => new Date(s)),
  minPlayers: z.number().int().min(1).default(2),
  maxPlayers: z.number().int().min(1),
  allowSharing: z.boolean().default(true),
  sharingNote: z.string().max(500).optional(),
  timezone: z.string().max(100).default('America/Denver')
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required to create events'
    })
  }

  const body = await readBody(event)
  const parsed = createEventSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const data = parsed.data

  // Validate min <= max
  if (data.minPlayers > data.maxPlayers) {
    throw createError({
      statusCode: 400,
      message: 'Minimum players cannot exceed maximum players'
    })
  }

  // Validate endDatetime > datetime
  if (data.endDatetime <= data.datetime) {
    throw createError({
      statusCode: 400,
      message: 'End time must be after start time'
    })
  }

  // Generate unique slug
  let slug = generateEventSlug(data.sportType)
  let attempts = 0

  while (attempts < 5) {
    const existing = await prisma.event.findUnique({ where: { slug } })
    if (!existing) break
    slug = generateEventSlug(data.sportType)
    attempts++
  }

  if (attempts >= 5) {
    throw createError({
      statusCode: 500,
      message: 'Failed to generate unique slug'
    })
  }

  // Create event and auto-RSVP the organizer as "IN"
  const newEvent = await prisma.event.create({
    data: {
      slug,
      title: data.title,
      sportType: data.sportType,
      description: data.description,
      location: data.location,
      datetime: data.datetime,
      endDatetime: data.endDatetime,
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      allowSharing: data.allowSharing,
      sharingNote: data.sharingNote,
      timezone: data.timezone,
      organizerId: auth.user.id,
      // Auto-RSVP the organizer
      rsvps: {
        create: {
          userId: auth.user.id,
          status: 'IN'
        }
      }
    }
  })

  return {
    event: {
      id: newEvent.id,
      slug: newEvent.slug,
      title: newEvent.title,
      sportType: newEvent.sportType,
      description: newEvent.description,
      location: newEvent.location,
      datetime: newEvent.datetime,
      endDatetime: newEvent.endDatetime,
      minPlayers: newEvent.minPlayers,
      maxPlayers: newEvent.maxPlayers,
      allowSharing: newEvent.allowSharing,
      sharingNote: newEvent.sharingNote
    }
  }
})
