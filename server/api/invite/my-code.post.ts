import prisma from '../../utils/db'
import { generateInviteCode } from '../../utils/invite'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth?.user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  const code = generateInviteCode()
  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data: { inviteCode: code }
  })

  return { inviteCode: updated.inviteCode }
})
