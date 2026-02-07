import prisma from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    })
  }

  const groups = await prisma.group.findMany({
    where: {
      ownerId: auth.user.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      _count: {
        select: {
          members: true
        }
      },
      members: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      }
    }
  })

  return {
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      type: g.type,
      visibility: g.visibility,
      memberCount: g._count.members,
      members: g.members,
      createdAt: g.createdAt
    }))
  }
})
