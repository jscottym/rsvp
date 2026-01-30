import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

interface User {
  id: string
  name: string
  nickname: string | null
  phone: string
}

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
}

// Cache user in localStorage for instant loading
const cachedUser = useLocalStorage<User | null>('pickup-sports-user', null, {
  serializer: {
    read: (v) => v ? JSON.parse(v) : null,
    write: (v) => JSON.stringify(v)
  }
})

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: cachedUser.value,
    loading: false,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user
  },

  actions: {
    async initialize() {
      if (this.initialized) return

      const { getCurrentUser, getIdToken } = usePhoneAuth()
      this.loading = true

      try {
        const firebaseUser = await getCurrentUser()

        if (firebaseUser) {
          const token = await firebaseUser.getIdToken()
          await this.fetchUser(token)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        this.loading = false
        this.initialized = true
      }
    },

    async login(idToken: string, name?: string, smsConsent?: boolean) {
      this.loading = true

      try {
        const response = await $fetch<{ user: User }>('/api/auth/firebase-login', {
          method: 'POST',
          body: { idToken, name, smsConsent }
        })

        this.user = response.user
        cachedUser.value = response.user
        return { success: true }
      } catch (error: any) {
        console.error('Login error:', error)
        return {
          success: false,
          error: error.data?.message || 'Login failed',
          needsName: error.data?.message === 'Name is required for new users'
        }
      } finally {
        this.loading = false
      }
    },

    async fetchUser(token: string) {
      try {
        const response = await $fetch<{ user: User }>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        this.user = response.user
        cachedUser.value = response.user
      } catch (error) {
        // User not found in DB, they'll need to complete registration
        this.user = null
        cachedUser.value = null
      }
    },

    async logout() {
      const { signOut } = usePhoneAuth()

      try {
        await signOut()
        await $fetch('/api/auth/logout', { method: 'POST' })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.user = null
        cachedUser.value = null
      }
    },

    async getIdToken(): Promise<string | null> {
      const { getIdToken } = usePhoneAuth()
      return getIdToken()
    },

    async updateProfile(data: { name?: string; nickname?: string }) {
      const token = await this.getIdToken()
      if (!token) return { success: false, error: 'Not authenticated' }

      try {
        const response = await $fetch<{ user: User }>('/api/auth/profile', {
          method: 'PATCH',
          body: data,
          headers: { Authorization: `Bearer ${token}` }
        })

        this.user = response.user
        cachedUser.value = response.user
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          error: error.data?.message || 'Failed to update profile'
        }
      }
    }
  }
})
