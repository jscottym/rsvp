import prisma from './db'

export async function getOrCreateMyPeopleGroup(userId: string) {
  // Try to find existing My People group
  const existing = await prisma.group.findFirst({
    where: {
      ownerId: userId,
      type: 'MY_PEOPLE'
    }
  })

  if (existing) return existing

  // Create a new My People group
  return await prisma.group.create({
    data: {
      name: 'My People',
      type: 'MY_PEOPLE',
      visibility: 'PRIVATE',
      ownerId: userId
    }
  })
}
