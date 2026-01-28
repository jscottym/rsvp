import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  type Auth,
  type ConfirmationResult,
  type User as FirebaseUser
} from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let globalRecaptchaVerifier: RecaptchaVerifier | null = null
let globalConfirmationResult: ConfirmationResult | null = null

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
      // Ensure session persists across browser restarts
      setPersistence(auth, browserLocalPersistence).catch(console.error)
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

  const loading = ref(false)
  const error = ref<string | null>(null)

  const clearRecaptcha = () => {
    if (globalRecaptchaVerifier) {
      try {
        globalRecaptchaVerifier.clear()
      } catch (e) {
        // Ignore errors when clearing
      }
      globalRecaptchaVerifier = null
    }
  }

  const setupRecaptcha = async (containerId: string) => {
    const auth = getFirebaseAuth()

    // Always clear existing verifier first
    clearRecaptcha()

    // Wait a tick for DOM cleanup
    await new Promise(resolve => setTimeout(resolve, 100))

    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container #${containerId} not found`)
    }

    // Clear any existing reCAPTCHA widgets in the container
    container.innerHTML = ''

    globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        // Reset reCAPTCHA on expiry
        console.log('reCAPTCHA expired, resetting...')
        clearRecaptcha()
      }
    })

    // Pre-render the reCAPTCHA widget
    await globalRecaptchaVerifier.render()
  }

  const sendVerificationCode = async (phoneNumber: string) => {
    loading.value = true
    error.value = null

    try {
      const auth = getFirebaseAuth()
      if (!globalRecaptchaVerifier) {
        throw new Error('Recaptcha not initialized')
      }

      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`

      globalConfirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        globalRecaptchaVerifier
      )

      return true
    } catch (e: any) {
      // Reset reCAPTCHA on error so user can try again
      clearRecaptcha()
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
      if (!globalConfirmationResult) {
        throw new Error('No confirmation result')
      }

      const result = await globalConfirmationResult.confirm(code)
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

  const resetState = () => {
    clearRecaptcha()
    globalConfirmationResult = null
    error.value = null
  }

  return {
    loading,
    error,
    setupRecaptcha,
    sendVerificationCode,
    verifyCode,
    signOut,
    getCurrentUser,
    getIdToken,
    resetState
  }
}
