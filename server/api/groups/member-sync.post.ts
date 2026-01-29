import { z } from 'zod'
import prisma from '../../utils/db'

const bodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  groupIds: z.array(z.string())
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required'
    })
  }

  const body = await readBody(event)
  const { name, phone, groupIds } = bodySchema.parse(body)

  // Get all groups owned by this user
  const userGroups = await prisma.group.findMany({
    where: { ownerId: auth.user.id },
    include: {
      members: {
        where: { phone },
        select: { id: true }
      }
    }
  })

  // Check if there's a user with this phone
  const existingUser = await prisma.user.findUnique({
    where: { phone },
    select: { id: true }
  })

  const results: { groupId: string; added: boolean; removed: boolean }[] = []

  for (const group of userGroups) {
    const isCurrentlyMember = group.members.length > 0
    const shouldBeMember = groupIds.includes(group.id)

    if (shouldBeMember && !isCurrentlyMember) {
      // Add to group
      await prisma.groupMember.create({
        data: {
          name,
          phone,
          groupId: group.id,
          userId: existingUser?.id
        }
      })
      results.push({ groupId: group.id, added: true, removed: false })
    } else if (!shouldBeMember && isCurrentlyMember) {
      // Remove from group
      await prisma.groupMember.deleteMany({
        where: {
          groupId: group.id,
          phone
        }
      })
      results.push({ groupId: group.id, added: false, removed: true })
    }
  }

  return {
    success: true,
    results
  }
})
