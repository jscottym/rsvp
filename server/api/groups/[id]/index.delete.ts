import prisma from '../../../utils/db'

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

  // Verify user owns the group
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, type: true }
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
      message: 'Only the group owner can delete the group'
    })
  }

  if (group.type === 'MY_PEOPLE') {
    throw createError({
      statusCode: 403,
      message: 'The My People group cannot be deleted'
    })
  }

  // Delete all related data (members, join requests) and the group
  await prisma.$transaction([
    prisma.groupMember.deleteMany({ where: { groupId } }),
    prisma.groupJoinRequest.deleteMany({ where: { groupId } }),
    prisma.group.delete({ where: { id: groupId } })
  ])

  return { success: true }
})
