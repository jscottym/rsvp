import prisma from '../../utils/db'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth

  const groups = await prisma.group.findMany({
    where: {
      visibility: 'PUBLIC',
      // Exclude groups owned by the current user
      ...(auth?.user && { ownerId: { not: auth.user.id } })
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          members: true
        }
      },
      // Include user's join request status if authenticated
      ...(auth?.user && {
        joinRequests: {
          where: {
            userId: auth.user.id
          },
          select: {
            id: true,
            status: true
          }
        }
      })
    }
  })

  return {
    groups: groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      owner: g.owner,
      memberCount: g._count.members,
      joinRequestStatus: (g as any).joinRequests?.[0]?.status || null
    }))
  }
})
