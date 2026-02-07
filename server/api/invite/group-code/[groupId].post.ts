import prisma from '../../../utils/db'
import { generateInviteCode } from '../../../utils/invite'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const groupId = getRouterParam(event, 'groupId')
  if (!groupId) {
    throw createError({ statusCode: 400, message: 'Group ID is required' })
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, type: true }
  })

  if (!group) {
    throw createError({ statusCode: 404, message: 'Group not found' })
  }

  if (group.ownerId !== auth.user.id) {
    throw createError({ statusCode: 403, message: 'Only the group owner can manage invite links' })
  }

  if (group.type === 'MY_PEOPLE') {
    throw createError({ statusCode: 400, message: 'Use your personal invite link for My People' })
  }

  const code = generateInviteCode()
  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { inviteCode: code }
  })

  return { inviteCode: updated.inviteCode }
})
