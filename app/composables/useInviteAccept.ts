interface ResolvedInvite {
  type: 'personal' | 'group'
  ownerName: string
  ownerId: string
  groupName?: string
  groupId?: string
}

interface AcceptResult {
  success: boolean
  addedToGroups: string[]
  alreadyMember: boolean
}

export function useInviteAccept(code: Ref<string> | string) {
  const codeRef = typeof code === 'string' ? ref(code) : code
  const authStore = useAuthStore()
  const toast = useToast()
  const router = useRouter()

  const invite = ref<ResolvedInvite | null>(null)
  const resolving = ref(true)
  const resolveError = ref<string | null>(null)
  const accepting = ref(false)
  const accepted = ref(false)
  const showAuthModal = ref(false)

  async function resolve() {
    resolving.value = true
    resolveError.value = null

    try {
      const data = await $fetch<ResolvedInvite>(`/api/invite/resolve/${codeRef.value}`)
      invite.value = data
    } catch (e: any) {
      resolveError.value = e.data?.message || 'This invite link is no longer valid'
    } finally {
      resolving.value = false
    }
  }

  async function accept() {
    if (!authStore.isAuthenticated) {
      showAuthModal.value = true
      return
    }

    accepting.value = true
    try {
      const token = await authStore.getIdToken()
      const result = await $fetch<AcceptResult>(`/api/invite/accept/${codeRef.value}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      accepted.value = true

      if (result.alreadyMember) {
        toast.add({
          title: 'Already connected!',
          description: `You're already in ${invite.value?.ownerName}'s contacts`,
          color: 'info'
        })
      }

      // Redirect to groups page after a brief delay
      setTimeout(() => {
        router.push('/groups')
      }, 1500)
    } catch (e: any) {
      toast.add({
        title: 'Error',
        description: e.data?.message || 'Failed to accept invite',
        color: 'error'
      })
    } finally {
      accepting.value = false
    }
  }

  async function onAuthenticated() {
    showAuthModal.value = false
    // Auto-accept after authentication
    await accept()
  }

  // Resolve on creation
  resolve()

  return {
    invite,
    resolving,
    resolveError,
    accepting,
    accepted,
    showAuthModal,
    accept,
    onAuthenticated
  }
}
