import { z } from 'zod'
import prisma from '../../utils/db'

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE')
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
  const parsed = createGroupSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const data = parsed.data

  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      visibility: data.visibility,
      ownerId: auth.user.id
    }
  })

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      visibility: group.visibility,
      memberCount: 0
    }
  }
})
