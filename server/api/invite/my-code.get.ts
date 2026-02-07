import prisma from '../../utils/db'
import { generateInviteCode } from '../../utils/invite'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  let { inviteCode } = auth.user

  // Generate if user doesn't have one yet
  if (!inviteCode) {
    const code = generateInviteCode()
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: { inviteCode: code }
    })
    inviteCode = updated.inviteCode
  }

  return { inviteCode }
})
