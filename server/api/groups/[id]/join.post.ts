import { z } from 'zod'
import prisma from '../../../utils/db'

const joinSchema = z.object({
  message: z.string().max(500).optional()
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

  if (group.visibility !== 'PUBLIC') {
    throw createError({
      statusCode: 403,
      message: 'This group is not accepting join requests'
    })
  }

  if (group.ownerId === auth.user.id) {
    throw createError({
      statusCode: 400,
      message: 'You already own this group'
    })
  }

  // Check if already a member
  const existingMember = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId: auth.user.id
    }
  })

  if (existingMember) {
    throw createError({
      statusCode: 400,
      message: 'You are already a member of this group'
    })
  }

  // Check for existing request
  const existingRequest = await prisma.groupJoinRequest.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: auth.user.id
      }
    }
  })

  if (existingRequest) {
    if (existingRequest.status === 'PENDING') {
      throw createError({
        statusCode: 400,
        message: 'You already have a pending request'
      })
    }
    if (existingRequest.status === 'REJECTED') {
      throw createError({
        statusCode: 400,
        message: 'Your previous request was rejected'
      })
    }
  }

  const body = await readBody(event)
  const parsed = joinSchema.safeParse(body)
  const { message } = parsed.success ? parsed.data : { message: undefined }

  const request = await prisma.groupJoinRequest.create({
    data: {
      groupId,
      userId: auth.user.id,
      message
    }
  })

  return {
    request: {
      id: request.id,
      status: request.status
    }
  }
})
