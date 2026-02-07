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
  type?: 'STANDARD' | 'MY_PEOPLE'
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

  getters: {
    myPeopleGroup(): Group | undefined {
      return this.groups.find(g => g.type === 'MY_PEOPLE')
    },
    sortedGroups(): Group[] {
      // My People first, then the rest by creation order
      const myPeople = this.groups.filter(g => g.type === 'MY_PEOPLE')
      const standard = this.groups.filter(g => g.type !== 'MY_PEOPLE')
      return [...myPeople, ...standard]
    }
  },

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
    },

    async addMember(groupId: string, name: string, phone: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ member: GroupMember }>(`/api/groups/${groupId}/members`, {
          method: 'POST',
          body: { name, phone },
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update local state
        const group = this.groups.find(g => g.id === groupId)
        if (group) {
          if (!group.members) group.members = []
          group.members.push(response.member)
          group.memberCount++
        }

        return response.member
      } catch (error) {
        console.error('Failed to add member:', error)
        throw error
      }
    },

    async updateMember(groupId: string, memberId: string, name: string, phone: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        const response = await $fetch<{ member: GroupMember }>(`/api/groups/${groupId}/members/${memberId}`, {
          method: 'PATCH',
          body: { name, phone },
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update local state
        const group = this.groups.find(g => g.id === groupId)
        if (group?.members) {
          const idx = group.members.findIndex(m => m.id === memberId)
          if (idx !== -1) {
            group.members[idx] = response.member
          }
        }

        return response.member
      } catch (error) {
        console.error('Failed to update member:', error)
        throw error
      }
    },

    async removeMember(groupId: string, memberId: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch(`/api/groups/${groupId}/members/${memberId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update local state
        const group = this.groups.find(g => g.id === groupId)
        if (group?.members) {
          group.members = group.members.filter(m => m.id !== memberId)
          group.memberCount--
        }
      } catch (error) {
        console.error('Failed to remove member:', error)
        throw error
      }
    },

    async deleteGroup(groupId: string) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch(`/api/groups/${groupId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })

        // Update local state
        this.groups = this.groups.filter(g => g.id !== groupId)
      } catch (error) {
        console.error('Failed to delete group:', error)
        throw error
      }
    },

    async syncMemberGroups(name: string, phone: string, groupIds: string[]) {
      const authStore = useAuthStore()

      try {
        const token = await authStore.getIdToken()
        if (!token) throw new Error('Not authenticated')

        await $fetch('/api/groups/member-sync', {
          method: 'POST',
          body: { name, phone, groupIds },
          headers: { Authorization: `Bearer ${token}` }
        })

        // Refresh groups to get updated member lists
        await this.fetchMyGroups()
      } catch (error) {
        console.error('Failed to sync member groups:', error)
        throw error
      }
    },

    getGroupsForPhone(phone: string): string[] {
      return this.groups
        .filter(g => g.members?.some(m => m.phone === phone))
        .map(g => g.id)
    }
  }
})
