import prisma from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  const groupId = getRouterParam(event, 'id')

  if (!groupId) {
    throw createError({
      statusCode: 400,
      message: 'Group ID is required'
    })
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      owner: {
        select: {
          id: true,
          name: true
        }
      },
      members: {
        orderBy: { name: 'asc' }
      },
      _count: {
        select: {
          joinRequests: {
            where: { status: 'PENDING' }
          }
        }
      }
    }
  })

  if (!group) {
    throw createError({
      statusCode: 404,
      message: 'Group not found'
    })
  }

  const isOwner = auth?.user?.id === group.ownerId

  // Only owner can see private groups
  if (group.visibility === 'PRIVATE' && !isOwner) {
    throw createError({
      statusCode: 403,
      message: 'This is a private group'
    })
  }

  // Only owner or approved members can see member list
  let members: any[] = []
  if (isOwner) {
    members = group.members.map(m => ({
      id: m.id,
      name: m.name,
      phone: m.phone
    }))
  } else if (group.visibility === 'PUBLIC') {
    // Check if user is an approved member
    const isMember = auth?.user && group.members.some(m => m.userId === auth.user!.id)
    if (isMember) {
      members = group.members.map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone
      }))
    }
  }

  return {
    group: {
      id: group.id,
      name: group.name,
      description: group.description,
      type: group.type,
      visibility: group.visibility,
      owner: group.owner,
      isOwner,
      memberCount: group.members.length,
      members,
      pendingRequestCount: isOwner ? group._count.joinRequests : 0
    }
  }
})
