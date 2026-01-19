import prisma from '../../../utils/db'

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
      message: 'Only the owner can view join requests'
    })
  }

  const requests = await prisma.groupJoinRequest.findMany({
    where: {
      groupId,
      status: 'PENDING'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  return {
    requests: requests.map(r => ({
      id: r.id,
      message: r.message,
      createdAt: r.createdAt,
      user: r.user
    }))
  }
})
