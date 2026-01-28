<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const groupsStore = useGroupsStore()
const toast = useToast()

const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const groups = computed(() => groupsStore.groups)

const newGroup = reactive({
  name: '',
  description: '',
  visibility: 'PRIVATE' as 'PRIVATE' | 'PUBLIC'
})

const visibilityOptions = [
  { value: 'PRIVATE', label: 'Private', description: 'Only you can see and manage this group' },
  { value: 'PUBLIC', label: 'Public', description: 'Others can discover and request to join' }
]

onMounted(async () => {
  try {
    await groupsStore.fetchMyGroups()
  } finally {
    loading.value = false
  }
})

async function createGroup() {
  creating.value = true
  try {
    await groupsStore.createGroup({
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || undefined,
      visibility: newGroup.visibility
    })

    toast.add({
      title: 'Group created!',
      color: 'success'
    })

    showCreateModal.value = false
    newGroup.name = ''
    newGroup.description = ''
    newGroup.visibility = 'PRIVATE'
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to create group',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

useSeoMeta({
  title: 'My Groups - Pickup Sports'
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Groups</h1>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-globe-alt"
          label="Discover"
          to="/groups/discover"
        />
        <UButton
          color="primary"
          icon="i-heroicons-plus"
          label="New Group"
          @click="showCreateModal = true"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="groups.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-user-group" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No groups yet</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">Create a group to save contacts from your events!</p>
      <UButton color="primary" icon="i-heroicons-plus" @click="showCreateModal = true">
        Create Group
      </UButton>
    </div>

    <!-- Groups List -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="group in groups"
        :key="group.id"
        :to="`/groups/${group.id}`"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ group.name }}</h3>
              <UBadge
                :label="group.visibility === 'PUBLIC' ? 'Public' : 'Private'"
                :color="group.visibility === 'PUBLIC' ? 'info' : 'neutral'"
                variant="soft"
                size="sm"
              />
            </div>
            <p v-if="group.description" class="text-sm text-gray-500 line-clamp-1">
              {{ group.description }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-primary-500">{{ group.memberCount }}</p>
            <p class="text-xs text-gray-500">contacts</p>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Create Group Modal -->
    <UModal v-model:open="showCreateModal" title="Create Group">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Group Name" required>
            <UInput
              v-model="newGroup.name"
              placeholder="e.g., Sunday Hoopers"
              size="lg"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="newGroup.description"
              placeholder="What's this group about?"
              :rows="2"
            />
          </UFormField>

          <UFormField label="Visibility">
            <URadioGroup v-model="newGroup.visibility" :items="visibilityOptions" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showCreateModal = false"
          />
          <UButton
            color="primary"
            label="Create"
            :loading="creating"
            :disabled="!newGroup.name.trim()"
            @click="createGroup"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
