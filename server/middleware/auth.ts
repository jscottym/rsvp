import { verifyFirebaseToken } from '../utils/firebase-admin'
import prisma from '../utils/db'

export default defineEventHandler(async (event) => {
  // Skip auth for non-authenticated routes
  const path = getRequestURL(event).pathname

  // Public routes that don't need auth
  const publicPaths = [
    '/api/auth/firebase-login',
    '/api/auth/dev-login',
    '/api/events' // GET events by slug is public
  ]

  const isPublicPath = publicPaths.some(p => path.startsWith(p))

  // Get authorization header
  const authHeader = getHeader(event, 'authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    // Dev mode: accept "dev-{firebaseUid}" tokens
    if (token.startsWith('dev-') && import.meta.dev) {
      const firebaseUid = token.slice(4) // Remove "dev-" prefix
      const user = await prisma.user.findUnique({
        where: { firebaseUid }
      })

      if (user) {
        event.context.auth = {
          firebaseUid: user.firebaseUid,
          phone: user.phone,
          user
        }
        return
      }
    }

    // Normal Firebase token verification
    const decodedToken = await verifyFirebaseToken(token)

    if (decodedToken) {
      // Find user in database
      const user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid }
      })

      // Attach user to event context
      event.context.auth = {
        firebaseUid: decodedToken.uid,
        phone: decodedToken.phone_number,
        user
      }
    }
  }

  // For non-public paths that require auth, we'll let individual handlers check
  // This middleware just extracts and validates the token
})
