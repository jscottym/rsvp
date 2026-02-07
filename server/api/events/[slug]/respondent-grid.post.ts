import { z } from 'zod'
import prisma from '../../../utils/db'

const bodySchema = z.object({
  changes: z.array(z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    groupIds: z.array(z.string())
  }))
})

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Event slug is required' })
  }

  const existingEvent = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, organizerId: true }
  })

  if (!existingEvent) {
    throw createError({ statusCode: 404, message: 'Event not found' })
  }

  if (existingEvent.organizerId !== auth.user.id) {
    throw createError({ statusCode: 403, message: 'Only the organizer can update the respondent grid' })
  }

  const body = await readBody(event)
  const { changes } = bodySchema.parse(body)

  // Get all groups owned by this user
  const userGroups = await prisma.group.findMany({
    where: { ownerId: auth.user.id },
    include: {
      members: {
        select: { id: true, phone: true }
      }
    }
  })

  const operations: any[] = []

  for (const change of changes) {
    const { name, phone, groupIds } = change

    // Look up if there's a registered user with this phone
    const existingUser = await prisma.user.findUnique({
      where: { phone },
      select: { id: true }
    })

    for (const group of userGroups) {
      const isCurrentlyMember = group.members.some(m => m.phone === phone)
      const shouldBeMember = groupIds.includes(group.id)

      if (shouldBeMember && !isCurrentlyMember) {
        operations.push(
          prisma.groupMember.create({
            data: {
              name,
              phone,
              groupId: group.id,
              userId: existingUser?.id
            }
          })
        )
      } else if (!shouldBeMember && isCurrentlyMember) {
        operations.push(
          prisma.groupMember.deleteMany({
            where: { groupId: group.id, phone }
          })
        )
      }
    }
  }

  if (operations.length > 0) {
    await prisma.$transaction(operations)
  }

  return { success: true, changeCount: operations.length }
})
