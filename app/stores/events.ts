import { defineStore } from 'pinia'

interface Event {
  id: string
  slug: string
  title: string
  sportType: string
  description?: string
  location: string
  datetime: string
  endDatetime?: string
  minPlayers: number
  maxPlayers: number
  allowSharing: boolean
  sharingNote?: string
  organizer?: {
    id: string
    name: string
  }
  rsvpCount?: number
  attendees?: Array<{
    id: string
    name: string
    isUser: boolean
  }>
  isOrganizer?: boolean
  userRsvp?: 'IN' | 'OUT' | null
}

interface RsvpDetail {
  id: string
  status: 'IN' | 'OUT'
  name: string
  phone: string | null
  isUser: boolean
  createdAt: string
}

interface EventsState {
  events: Event[]
  currentEvent: Event | null
  rsvps: RsvpDetail[]
  loading: boolean
}

export const useEventsStore = defineStore('events', {
  state: (): EventsState => ({
    events: [],
    currentEvent: null,
    rsvps: [],
    loading: false
  }),

  getters: {
    attendees: (state) => state.rsvps.filter(r => r.status === 'IN'),
    declinedCount: (state) => state.rsvps.filter(r => r.status === 'OUT').length,
    phoneNumbers: (state) => {
      return state.rsvps
        .filter(r => r.status === 'IN' && r.phone)
        .map(r => r.phone!)
    }
  },

  actions: {
    async fetchMyEvents() {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        const response = await $fetch<{ events: Event[] }>('/api/events', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        this.events = response.events
      } catch (error) {
        console.error('Failed to fetch events:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchEvent(slug: string) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        const response = await $fetch<{ event: Event }>(`/api/events/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        this.currentEvent = response.event
        return response.event
      } catch (error) {
        console.error('Failed to fetch event:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    async createEvent(data: Omit<Event, 'id' | 'slug'>) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ event: Event }>('/api/events', {
          method: 'POST',
          body: data,
          headers: { Authorization: `Bearer ${token}` }
        })

        this.events.unshift(response.event)
        return response.event
      } catch (error: any) {
        console.error('Failed to create event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateEvent(slug: string, data: Partial<Event>) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ event: Event }>(`/api/events/${slug}`, {
          method: 'PATCH',
          body: data,
          headers: { Authorization: `Bearer ${token}` }
        })

        if (this.currentEvent?.slug === slug) {
          this.currentEvent = { ...this.currentEvent, ...response.event }
        }

        const idx = this.events.findIndex(e => e.slug === slug)
        if (idx !== -1) {
          this.events[idx] = { ...this.events[idx], ...response.event }
        }

        return response.event
      } catch (error) {
        console.error('Failed to update event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteEvent(slug: string) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch(`/api/events/${slug}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        this.events = this.events.filter(e => e.slug !== slug)
        if (this.currentEvent?.slug === slug) {
          this.currentEvent = null
        }
      } catch (error) {
        console.error('Failed to delete event:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async submitRsvp(slug: string, status: 'IN' | 'OUT') {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ rsvp: { status: string }, rsvpCount: number }>(`/api/events/${slug}/rsvp`, {
          method: 'POST',
          body: { status },
          headers: { Authorization: `Bearer ${token}` }
        })

        if (this.currentEvent?.slug === slug) {
          this.currentEvent.userRsvp = status
          this.currentEvent.rsvpCount = response.rsvpCount
        }

        return response
      } catch (error) {
        console.error('Failed to submit RSVP:', error)
        throw error
      }
    },

    async fetchRsvps(slug: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ rsvps: RsvpDetail[] }>(`/api/events/${slug}/rsvps`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        this.rsvps = response.rsvps
        return response.rsvps
      } catch (error) {
        console.error('Failed to fetch RSVPs:', error)
        throw error
      }
    },

    clearCurrentEvent() {
      this.currentEvent = null
      this.rsvps = []
    }
  }
})
