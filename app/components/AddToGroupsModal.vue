<script setup lang="ts">
const props = defineProps<{
  open: boolean
  acceptorName: string
  acceptorPhone: string
  addedGroupIds: string[]
  memberGroupIds: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const toast = useToast()
const groupsStore = useGroupsStore()
const saving = ref(false)

// Selected group IDs — initialized from addedGroupIds when modal opens
const selectedGroupIds = ref<Set<string>>(new Set())

// Fetch groups and initialize selections when modal opens
watch(() => props.open, async (open) => {
  if (open) {
    if (groupsStore.groups.length === 0) {
      await groupsStore.fetchMyGroups()
    }
    selectedGroupIds.value = new Set(props.memberGroupIds)
  }
})

function isAutoAdded(groupId: string): boolean {
  return props.addedGroupIds.includes(groupId)
}

function isAlreadyMember(groupId: string): boolean {
  return props.memberGroupIds.includes(groupId)
}

function toggleGroup(groupId: string) {
  // Don't allow unchecking groups the person is already in
  if (isAlreadyMember(groupId)) return

  const next = new Set(selectedGroupIds.value)
  if (next.has(groupId)) {
    next.delete(groupId)
  } else {
    next.add(groupId)
  }
  selectedGroupIds.value = next
}

const hasNewSelections = computed(() => {
  return [...selectedGroupIds.value].some(id => !props.memberGroupIds.includes(id))
})

async function save() {
  saving.value = true
  try {
    await groupsStore.syncMemberGroups(
      props.acceptorName,
      props.acceptorPhone,
      [...selectedGroupIds.value]
    )
    isOpen.value = false
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to update groups',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function skip() {
  if (props.addedGroupIds.length > 0) {
    const groupNames = groupsStore.sortedGroups
      .filter(g => props.addedGroupIds.includes(g.id))
      .map(g => g.name)
  }
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :dismissible="false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40">
          <UIcon name="i-heroicons-user-plus-solid" class="w-5 h-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ acceptorName }} joined!</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Add them to your groups</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-1.5">
        <button
          v-for="group in groupsStore.sortedGroups"
          :key="group.id"
          class="flex items-center gap-3 w-full p-3.5 rounded-xl transition-all duration-150 active:scale-[0.98]"
          :class="selectedGroupIds.has(group.id)
            ? 'bg-teal-50 dark:bg-teal-900/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
          @click="toggleGroup(group.id)"
        >
          <!-- Checkbox -->
          <div
            class="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150"
            :class="selectedGroupIds.has(group.id)
              ? 'bg-teal-500 border-teal-500'
              : 'border-gray-300 dark:border-gray-600'"
          >
            <UIcon
              v-if="selectedGroupIds.has(group.id)"
              name="i-heroicons-check"
              class="w-4 h-4 text-white"
            />
          </div>

          <!-- Group info -->
          <div class="flex-1 text-left min-w-0">
            <div class="flex items-center gap-2">
              <UIcon
                v-if="group.type === 'MY_PEOPLE'"
                name="i-heroicons-heart-solid"
                class="w-4 h-4 text-teal-500 flex-shrink-0"
              />
              <span class="font-medium text-gray-900 dark:text-white truncate">{{ group.name }}</span>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ group.memberCount }} {{ group.memberCount === 1 ? 'member' : 'members' }}
            </span>
          </div>

          <!-- Membership badge -->
          <span
            v-if="isAutoAdded(group.id)"
            class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400 flex-shrink-0"
          >
            Auto-added
          </span>
          <span
            v-else-if="isAlreadyMember(group.id)"
            class="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0"
          >
            Member
          </span>
        </button>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          label="Skip"
          class="flex-shrink-0"
          @click="skip"
        />
        <button
          class="flex-1 py-2.5 rounded-xl font-semibold text-white
                 bg-gradient-to-r from-teal-500 to-teal-600
                 shadow-lg shadow-teal-500/30
                 transition-all duration-200 active:scale-[0.98]
                 disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            Saving...
          </span>
          <span v-else>
            {{ hasNewSelections ? 'Save Groups' : 'Done' }}
          </span>
        </button>
      </div>
    </template>
  </UModal>
</template>
