import { z } from 'zod'
import prisma from '../../../../utils/db'

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(20)
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  const groupId = getRouterParam(event, 'id')
  if (!groupId) {
    throw createError({
      statusCode: 400,
      message: 'Group ID is required'
    })
  }

  const body = await readBody(event)
  const { name, phone } = bodySchema.parse(body)

  // Verify user owns the group
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true }
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
      message: 'Only the group owner can add members'
    })
  }

  // Check if phone already exists in group
  const existing = await prisma.groupMember.findUnique({
    where: {
      groupId_phone: { groupId, phone }
    }
  })

  if (existing) {
    throw createError({
      statusCode: 400,
      message: 'A member with this phone already exists in the group'
    })
  }

  // Check if there's a user with this phone number
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true }
  })

  const member = await prisma.groupMember.create({
    data: {
      name,
      phone,
      groupId,
      userId: existingUser?.id
    }
  })

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone
    }
  }
})
