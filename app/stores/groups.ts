import { defineStore } from 'pinia'

interface GroupMember {
  id: string
  name: string
  phone: string
}

interface Group {
  id: string
  name: string
  description?: string
  visibility: 'PRIVATE' | 'PUBLIC'
  owner?: {
    id: string
    name: string
  }
  isOwner?: boolean
  memberCount: number
  members?: GroupMember[]
  pendingRequestCount?: number
  joinRequestStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}

interface JoinRequest {
  id: string
  message?: string
  createdAt: string
  user: {
    id: string
    name: string
    phone: string
  }
}

interface GroupsState {
  groups: Group[]
  publicGroups: Group[]
  currentGroup: Group | null
  pendingRequests: JoinRequest[]
  loading: boolean
}

export const useGroupsStore = defineStore('groups', {
  state: (): GroupsState => ({
    groups: [],
    publicGroups: [],
    currentGroup: null,
    pendingRequests: [],
    loading: false
  }),

  actions: {
    async fetchMyGroups() {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        const response = await $fetch<{ groups: Group[] }>('/api/groups', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        this.groups = response.groups
      } catch (error) {
        console.error('Failed to fetch groups:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchPublicGroups() {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        const response = await $fetch<{ groups: Group[] }>('/api/groups/public', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        this.publicGroups = response.groups
      } catch (error) {
        console.error('Failed to fetch public groups:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchGroup(id: string) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        const response = await $fetch<{ group: Group }>(`/api/groups/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        this.currentGroup = response.group
        return response.group
      } catch (error) {
        console.error('Failed to fetch group:', error)
        return null
      } finally {
        this.loading = false
      }
    },

    async createGroup(data: { name: string; description?: string; visibility: 'PRIVATE' | 'PUBLIC' }) {
      const authStore = useAuthStore()
      this.loading = true

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ group: Group }>('/api/groups', {
          method: 'POST',
          body: data,
          headers: { Authorization: `Bearer ${token}` }
        })

        this.groups.unshift(response.group)
        return response.group
      } catch (error) {
        console.error('Failed to create group:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateGroup(id: string, data: Partial<Group>) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ group: Group }>(`/api/groups/${id}`, {
          method: 'PATCH',
          body: data,
          headers: { Authorization: `Bearer ${token}` }
        })

        if (this.currentGroup?.id === id) {
          this.currentGroup = { ...this.currentGroup, ...response.group }
        }

        const idx = this.groups.findIndex(g => g.id === id)
        if (idx !== -1) {
          this.groups[idx] = { ...this.groups[idx], ...response.group }
        }

        return response.group
      } catch (error) {
        console.error('Failed to update group:', error)
        throw error
      }
    },

    async requestToJoin(groupId: string, message?: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ request: { id: string; status: string } }>(`/api/groups/${groupId}/join`, {
          method: 'POST',
          body: { message },
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update public groups list
        const idx = this.publicGroups.findIndex(g => g.id === groupId)
        if (idx !== -1) {
          this.publicGroups[idx].joinRequestStatus = 'PENDING'
        }

        return response.request
      } catch (error) {
        console.error('Failed to request join:', error)
        throw error
      }
    },

    async fetchPendingRequests(groupId: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ requests: JoinRequest[] }>(`/api/groups/${groupId}/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        this.pendingRequests = response.requests
        return response.requests
      } catch (error) {
        console.error('Failed to fetch requests:', error)
        throw error
      }
    },

    async handleRequest(groupId: string, requestId: string, action: 'approve' | 'reject') {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch(`/api/groups/${groupId}/requests/${requestId}`, {
          method: 'PATCH',
          body: { action },
          headers: { Authorization: `Bearer ${token}` }
        })

        // Remove from pending list
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== requestId)

        // Update member count if approved
        if (action === 'approve' && this.currentGroup?.id === groupId) {
          this.currentGroup.memberCount++
          this.currentGroup.pendingRequestCount = (this.currentGroup.pendingRequestCount || 1) - 1
        }
      } catch (error) {
        console.error('Failed to handle request:', error)
        throw error
      }
    },

    clearCurrentGroup() {
      this.currentGroup = null
      this.pendingRequests = []
    }
  }
})
