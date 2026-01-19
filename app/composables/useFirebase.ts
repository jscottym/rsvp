import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type ConfirmationResult,
  type User as FirebaseUser
} from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null

export function useFirebase() {
  const config = useRuntimeConfig()

  const getFirebaseApp = () => {
    if (!app) {
      const existingApps = getApps()
      if (existingApps.length > 0) {
        app = existingApps[0]
      } else {
        app = initializeApp({
          apiKey: config.public.firebaseApiKey,
          authDomain: config.public.firebaseAuthDomain,
          projectId: config.public.firebaseProjectId,
          appId: config.public.firebaseAppId
        })
      }
    }
    return app
  }

  const getFirebaseAuth = () => {
    if (!auth) {
      auth = getAuth(getFirebaseApp())
    }
    return auth
  }

  return {
    getFirebaseApp,
    getFirebaseAuth
  }
}

export function usePhoneAuth() {
  const { getFirebaseAuth } = useFirebase()

  const recaptchaVerifier = ref<RecaptchaVerifier | null>(null)
  const confirmationResult = ref<ConfirmationResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const setupRecaptcha = (containerId: string) => {
    const auth = getFirebaseAuth()
    recaptchaVerifier.value = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      }
    })
  }

  const sendVerificationCode = async (phoneNumber: string) => {
    loading.value = true
    error.value = null

    try {
      const auth = getFirebaseAuth()
      if (!recaptchaVerifier.value) {
        throw new Error('Recaptcha not initialized')
      }

      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

      confirmationResult.value = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier.value
      )

      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to send verification code'
      console.error('Phone auth error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  const verifyCode = async (code: string): Promise<FirebaseUser | null> => {
    loading.value = true
    error.value = null

    try {
      if (!confirmationResult.value) {
        throw new Error('No confirmation result')
      }

      const result = await confirmationResult.value.confirm(code)
      return result.user
    } catch (e: any) {
      error.value = e.message || 'Invalid verification code'
      console.error('Verification error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  const signOut = async () => {
    const auth = getFirebaseAuth()
    await firebaseSignOut(auth)
  }

  const getCurrentUser = (): Promise<FirebaseUser | null> => {
    const auth = getFirebaseAuth()
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  const getIdToken = async (): Promise<string | null> => {
    const user = await getCurrentUser()
    if (!user) return null
    return user.getIdToken()
  }

  return {
    recaptchaVerifier,
    confirmationResult,
    loading,
    error,
    setupRecaptcha,
    sendVerificationCode,
    verifyCode,
    signOut,
    getCurrentUser,
    getIdToken
  }
}
