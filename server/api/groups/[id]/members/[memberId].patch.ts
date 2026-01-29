import { z } from 'zod'
import prisma from '../../../../utils/db'

const bodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(1).max(20).optional()
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
  const memberId = getRouterParam(event, 'memberId')

  if (!groupId || !memberId) {
    throw createError({
      statusCode: 400,
      message: 'Group ID and Member ID are required'
    })
  }

  const body = await readBody(event)
  const updates = bodySchema.parse(body)

  if (!updates.name && !updates.phone) {
    throw createError({
      statusCode: 400,
      message: 'At least one field to update is required'
    })
  }

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
      message: 'Only the group owner can edit members'
    })
  }

  // Verify member exists in this group
  const existingMember = await prisma.groupMember.findFirst({
    where: { id: memberId, groupId }
  })

  if (!existingMember) {
    throw createError({
      statusCode: 404,
      message: 'Member not found'
    })
  }

  // If changing phone, check for duplicates
  if (updates.phone && updates.phone !== existingMember.phone) {
    const duplicate = await prisma.groupMember.findUnique({
      where: {
        groupId_phone: { groupId, phone: updates.phone }
      }
    })

    if (duplicate) {
      throw createError({
        statusCode: 400,
        message: 'A member with this phone already exists in the group'
      })
    }

    // Check if there's a user with the new phone number
    const existingUser = await prisma.user.findUnique({
      where: { phone: updates.phone },
      select: { id: true }
    })

    // Update with potential user link
    const member = await prisma.groupMember.update({
      where: { id: memberId },
      data: {
        ...updates,
        userId: existingUser?.id || null
      }
    })

    return {
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone
      }
    }
  }

  const member = await prisma.groupMember.update({
    where: { id: memberId },
    data: updates
  })

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone
    }
  }
})
