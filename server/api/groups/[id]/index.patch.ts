import { z } from 'zod'
import prisma from '../../../utils/db'

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).optional()
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const groupId = getRouterParam(event, 'id')

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  if (!groupId) {
    throw createError({
      statusCode: 400,
      message: 'Group ID is required'
    })
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId }
  })

  if (!group) {
    throw createError({
      statusCode: 404,
      message: 'Group not found'
    })
  }

  if (group.ownerId !== auth.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Only the owner can update this group'
    })
  }

  const body = await readBody(event)
  const parsed = updateGroupSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const data = parsed.data

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.visibility && { visibility: data.visibility })
    }
  })

  return {
    group: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      visibility: updated.visibility
    }
  }
})
