import { z } from 'zod'
import prisma from '../../utils/db'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nickname: z.string().max(50).optional().nullable()
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
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: parsed.error.flatten()
    })
  }

  const { name, nickname } = parsed.data

  // Build update object with only provided fields
  const updateData: { name?: string; nickname?: string | null } = {}
  if (name !== undefined) updateData.name = name
  if (nickname !== undefined) updateData.nickname = nickname || null

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: updateData
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      phone: user.phone
    }
  }
})
