import prisma from '../../../utils/db'
import { getOrCreateMyPeopleGroup } from '../../../utils/my-people'
import { broadcastToUser } from '../../../utils/broadcast'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const code = getRouterParam(event, 'code')
  if (!code) {
    throw createError({ statusCode: 400, message: 'Invite code is required' })
  }

  const acceptorId = auth.user.id
  const acceptorName = auth.user.name
  const acceptorPhone = auth.user.phone

  // Try personal invite code first
  const inviteOwner = await prisma.user.findUnique({
    where: { inviteCode: code },
    select: { id: true, name: true }
  })

  if (inviteOwner) {
    // Self-invite check
    if (inviteOwner.id === acceptorId) {
      throw createError({ statusCode: 400, message: "You can't invite yourself" })
    }

    // Get/create owner's My People group
    const myPeopleGroup = await getOrCreateMyPeopleGroup(inviteOwner.id)
    const addedToGroups: string[] = []
    const addedGroupIds: string[] = []
    let alreadyMember = false

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_phone: { groupId: myPeopleGroup.id, phone: acceptorPhone } }
    })

    if (existing) {
      alreadyMember = true
    } else {
      await prisma.groupMember.create({
        data: {
          name: acceptorName,
          phone: acceptorPhone,
          groupId: myPeopleGroup.id,
          userId: acceptorId
        }
      })
      addedToGroups.push(myPeopleGroup.name)
      addedGroupIds.push(myPeopleGroup.id)
    }

    // Notify the owner
    broadcastToUser(inviteOwner.id, {
      type: 'invite_accepted',
      acceptorName,
      acceptorPhone,
      groupNames: addedToGroups,
      addedGroupIds
    })

    return { success: true, addedToGroups, alreadyMember }
  }

  // Try group invite code
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    include: { owner: { select: { id: true, name: true } } }
  })

  if (group) {
    // Self-invite check
    if (group.ownerId === acceptorId) {
      throw createError({ statusCode: 400, message: "You can't invite yourself" })
    }

    const addedToGroups: string[] = []
    const addedGroupIds: string[] = []
    let alreadyMember = false

    // Add to the target group
    const existingInGroup = await prisma.groupMember.findUnique({
      where: { groupId_phone: { groupId: group.id, phone: acceptorPhone } }
    })

    if (existingInGroup) {
      alreadyMember = true
    } else {
      await prisma.groupMember.create({
        data: {
          name: acceptorName,
          phone: acceptorPhone,
          groupId: group.id,
          userId: acceptorId
        }
      })
      addedToGroups.push(group.name)
      addedGroupIds.push(group.id)
    }

    // Also add to owner's My People group
    const myPeopleGroup = await getOrCreateMyPeopleGroup(group.ownerId)
    const existingInMyPeople = await prisma.groupMember.findUnique({
      where: { groupId_phone: { groupId: myPeopleGroup.id, phone: acceptorPhone } }
    })

    if (!existingInMyPeople) {
      await prisma.groupMember.create({
        data: {
          name: acceptorName,
          phone: acceptorPhone,
          groupId: myPeopleGroup.id,
          userId: acceptorId
        }
      })
      addedToGroups.push(myPeopleGroup.name)
      addedGroupIds.push(myPeopleGroup.id)
    }

    // Notify the owner
    broadcastToUser(group.ownerId, {
      type: 'invite_accepted',
      acceptorName,
      acceptorPhone,
      groupNames: addedToGroups,
      addedGroupIds
    })

    return { success: true, addedToGroups, alreadyMember }
  }

  throw createError({
    statusCode: 404,
    message: 'This invite link is no longer valid'
  })
})
