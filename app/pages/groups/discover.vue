<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <NuxtLink to="/groups" class="text-sm text-primary-500 hover:underline mb-1 inline-flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to My Groups
        </NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Discover Groups</h1>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="publicGroups.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-globe-alt" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No public groups yet</h2>
      <p class="text-gray-600 dark:text-gray-400">Be the first to create a public group!</p>
    </div>

    <!-- Public Groups List -->
    <div v-else class="space-y-4">
      <div
        v-for="group in publicGroups"
        :key="group.id"
        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ group.name }}</h3>
            <p v-if="group.description" class="text-sm text-gray-500 mt-1">
              {{ group.description }}
            </p>
            <div class="flex items-center gap-3 mt-2 text-sm text-gray-500">
              <span>by {{ group.owner?.name }}</span>
              <span>{{ group.memberCount }} members</span>
            </div>
          </div>

          <div class="ml-4">
            <UBadge
              v-if="group.joinRequestStatus === 'PENDING'"
              label="Requested"
              color="warning"
              variant="soft"
            />
            <UBadge
              v-else-if="group.joinRequestStatus === 'APPROVED'"
              label="Member"
              color="success"
              variant="soft"
            />
            <UButton
              v-else
              color="primary"
              variant="soft"
              size="sm"
              label="Join"
              :loading="joiningId === group.id"
              @click="requestJoin(group.id)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const groupsStore = useGroupsStore()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const joiningId = ref<string | null>(null)
const showAuthModal = ref(false)
const pendingJoinGroupId = ref<string | null>(null)

const publicGroups = computed(() => groupsStore.publicGroups)

onMounted(async () => {
  try {
    await groupsStore.fetchPublicGroups()
  } finally {
    loading.value = false
  }
})

async function requestJoin(groupId: string) {
  if (!authStore.isAuthenticated) {
    pendingJoinGroupId.value = groupId
    showAuthModal.value = true
    return
  }

  joiningId.value = groupId
  try {
    await groupsStore.requestToJoin(groupId)
    toast.add({
      title: 'Request sent!',
      description: 'The group owner will review your request.',
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to send request',
      color: 'error'
    })
  } finally {
    joiningId.value = null
  }
}

useSeoMeta({
  title: 'Discover Groups - Pickup Sports'
})
</script>
