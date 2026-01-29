import prisma from '../../../../utils/db'

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
      message: 'Only the group owner can remove members'
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

  await prisma.groupMember.delete({
    where: { id: memberId }
  })

  return { success: true }
})
