import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let app: App | null = null
let auth: Auth | null = null

export function getFirebaseAdmin() {
  if (!app) {
    const config = useRuntimeConfig()

    const existingApps = getApps()
    if (existingApps.length > 0) {
      app = existingApps[0]
    } else {
      app = initializeApp({
        credential: cert({
          projectId: config.firebaseAdminProjectId,
          clientEmail: config.firebaseAdminClientEmail,
          privateKey: config.firebaseAdminPrivateKey?.replace(/\\n/g, '\n')
        })
      })
    }
  }

  if (!auth) {
    auth = getAuth(app)
  }

  return { app, auth }
}

export async function verifyFirebaseToken(idToken: string) {
  const { auth } = getFirebaseAdmin()
  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error('Error verifying Firebase token:', error)
    return null
  }
}
