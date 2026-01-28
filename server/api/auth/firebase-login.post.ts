import { z } from 'zod'
import { verifyFirebaseToken } from '../../utils/firebase-admin'
import prisma from '../../utils/db'

const loginSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(1).max(100).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body'
    })
  }

  const { idToken, name } = parsed.data

  // Verify the Firebase token
  const decodedToken = await verifyFirebaseToken(idToken)

  if (!decodedToken) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or expired token'
    })
  }

  const firebaseUid = decodedToken.uid
  const phone = decodedToken.phone_number

  if (!phone) {
    throw createError({
      statusCode: 400,
      message: 'Phone number not found in token'
    })
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { firebaseUid }
  })

  if (!user) {
    // Create new user - name is required for new users
    if (!name) {
      throw createError({
        statusCode: 400,
        message: 'Name is required for new users'
      })
    }

    user = await prisma.user.create({
      data: {
        firebaseUid,
        phone,
        name
      }
    })
  } else if (name && name !== user.name) {
    // Update name if provided and different
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name }
    })
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      phone: user.phone
    }
  }
})
