<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="!group" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Group Not Found</h2>
      <UButton to="/groups" color="primary" variant="soft">Back to Groups</UButton>
    </div>

    <!-- Group Content -->
    <template v-else>
      <!-- Header -->
      <div class="mb-6">
        <NuxtLink to="/groups" class="text-sm text-primary-500 hover:underline mb-1 inline-flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Groups
        </NuxtLink>
        <div class="flex items-start justify-between mt-2">
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ group.name }}</h1>
              <UBadge
                :label="group.visibility === 'PUBLIC' ? 'Public' : 'Private'"
                :color="group.visibility === 'PUBLIC' ? 'info' : 'neutral'"
                variant="soft"
              />
            </div>
            <p v-if="group.description" class="text-gray-500 mt-1">{{ group.description }}</p>
            <p v-if="!group.isOwner" class="text-sm text-gray-500 mt-1">
              Owned by {{ group.owner?.name }}
            </p>
          </div>
          <UDropdown v-if="group.isOwner" :items="menuItems">
            <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" />
          </UDropdown>
        </div>
      </div>

      <!-- Pending Requests Banner -->
      <UAlert
        v-if="group.isOwner && group.pendingRequestCount && group.pendingRequestCount > 0"
        color="warning"
        variant="soft"
        class="mb-6"
        icon="i-heroicons-user-plus"
      >
        <template #title>{{ group.pendingRequestCount }} pending join request(s)</template>
        <template #actions>
          <UButton color="warning" variant="soft" size="sm" @click="showRequestsModal = true">
            Review
          </UButton>
        </template>
      </UAlert>

      <!-- Stats -->
      <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-3xl font-bold text-primary-500">{{ group.memberCount }}</p>
            <p class="text-gray-500">contacts</p>
          </div>
          <UButton
            v-if="group.isOwner && group.members && group.members.length > 0"
            color="primary"
            variant="soft"
            icon="i-heroicons-clipboard-document"
            label="Copy All Phones"
            @click="copyPhones"
          />
        </div>
      </div>

      <!-- Members List -->
      <div v-if="group.members && group.members.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 class="font-semibold text-gray-900 dark:text-white">Members</h3>
        </div>
        <ul class="divide-y divide-gray-200 dark:divide-gray-800">
          <li
            v-for="member in group.members"
            :key="member.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <span class="text-primary-600 dark:text-primary-400 font-medium">
                  {{ getInitials(member.name) }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ member.name }}</p>
                <p class="text-sm text-gray-500">{{ formatPhone(member.phone) }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <UIcon name="i-heroicons-user-group" class="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p class="text-gray-500">No members yet</p>
      </div>
    </template>

    <!-- Pending Requests Modal -->
    <UModal v-model:open="showRequestsModal" title="Pending Join Requests">
      <template #body>
        <div v-if="pendingRequests.length === 0" class="text-center py-4 text-gray-500">
          No pending requests
        </div>
        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800 -mx-4">
          <li
            v-for="request in pendingRequests"
            :key="request.id"
            class="px-4 py-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ request.user.name }}</p>
                <p class="text-sm text-gray-500">{{ formatPhone(request.user.phone) }}</p>
                <p v-if="request.message" class="text-sm text-gray-600 mt-1 italic">
                  "{{ request.message }}"
                </p>
              </div>
              <div class="flex gap-2">
                <UButton
                  color="success"
                  variant="soft"
                  size="sm"
                  icon="i-heroicons-check"
                  :loading="processingId === request.id"
                  @click="handleRequest(request.id, 'approve')"
                />
                <UButton
                  color="error"
                  variant="soft"
                  size="sm"
                  icon="i-heroicons-x-mark"
                  :loading="processingId === request.id"
                  @click="handleRequest(request.id, 'reject')"
                />
              </div>
            </div>
          </li>
        </ul>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const groupsStore = useGroupsStore()
const toast = useToast()

const groupId = computed(() => route.params.id as string)
const loading = ref(true)
const showRequestsModal = ref(false)
const processingId = ref<string | null>(null)

const group = computed(() => groupsStore.currentGroup)
const pendingRequests = computed(() => groupsStore.pendingRequests)

const menuItems = [
  [{
    label: 'Edit Group',
    icon: 'i-heroicons-pencil-square',
    click: () => {
      toast.add({ title: 'Coming soon!', color: 'info' })
    }
  }]
]

onMounted(async () => {
  try {
    await groupsStore.fetchGroup(groupId.value)
    if (group.value?.isOwner && group.value.pendingRequestCount && group.value.pendingRequestCount > 0) {
      await groupsStore.fetchPendingRequests(groupId.value)
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  groupsStore.clearCurrentGroup()
})

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

async function copyPhones() {
  if (!group.value?.members) return

  const phones = group.value.members.map(m => m.phone).join(', ')
  try {
    await navigator.clipboard.writeText(phones)
    toast.add({
      title: 'Phones copied!',
      description: `${group.value.members.length} phone numbers copied`,
      color: 'success'
    })
  } catch (e) {
    toast.add({ title: 'Failed to copy', color: 'error' })
  }
}

async function handleRequest(requestId: string, action: 'approve' | 'reject') {
  processingId.value = requestId
  try {
    await groupsStore.handleRequest(groupId.value, requestId, action)
    toast.add({
      title: action === 'approve' ? 'Request approved!' : 'Request rejected',
      color: action === 'approve' ? 'success' : 'neutral'
    })

    // Refresh group data if approved
    if (action === 'approve') {
      await groupsStore.fetchGroup(groupId.value)
    }
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to process request',
      color: 'error'
    })
  } finally {
    processingId.value = null
  }
}

useSeoMeta({
  title: () => group.value ? `${group.value.name} - Groups` : 'Group'
})
</script>
