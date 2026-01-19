import { z } from 'zod'
import prisma from '../../../../utils/db'

const actionSchema = z.object({
  action: z.enum(['approve', 'reject'])
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const groupId = getRouterParam(event, 'id')
  const reqId = getRouterParam(event, 'reqId')

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  if (!groupId || !reqId) {
    throw createError({
      statusCode: 400,
      message: 'Group ID and request ID are required'
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
      message: 'Only the owner can manage join requests'
    })
  }

  const request = await prisma.groupJoinRequest.findUnique({
    where: { id: reqId },
    include: {
      user: true
    }
  })

  if (!request || request.groupId !== groupId) {
    throw createError({
      statusCode: 404,
      message: 'Request not found'
    })
  }

  if (request.status !== 'PENDING') {
    throw createError({
      statusCode: 400,
      message: 'Request has already been processed'
    })
  }

  const body = await readBody(event)
  const parsed = actionSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const { action } = parsed.data

  if (action === 'approve') {
    // Update request status and add member in transaction
    await prisma.$transaction([
      prisma.groupJoinRequest.update({
        where: { id: reqId },
        data: { status: 'APPROVED' }
      }),
      prisma.groupMember.create({
        data: {
          groupId,
          userId: request.userId,
          name: request.user.name,
          phone: request.user.phone
        }
      })
    ])
  } else {
    await prisma.groupJoinRequest.update({
      where: { id: reqId },
      data: { status: 'REJECTED' }
    })
  }

  return {
    success: true,
    action
  }
})
