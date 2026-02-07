import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw createError({ statusCode: 400, message: 'Invite code is required' })
  }

  // Check if it's a personal invite code (User.inviteCode)
  const user = await prisma.user.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true }
  })

  if (user) {
    return {
      type: 'personal' as const,
      ownerName: user.name,
      ownerId: user.id
    }
  }

  // Check if it's a group invite code (Group.inviteCode)
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: {
      owner: { select: { id: true, name: true } }
    }
  })

  if (group) {
    return {
      type: 'group' as const,
      ownerName: group.owner.name,
      ownerId: group.owner.id,
      groupName: group.name,
      groupId: group.id
    }
  }

  throw createError({
    statusCode: 404,
    message: 'This invite link is no longer valid'
  })
})
