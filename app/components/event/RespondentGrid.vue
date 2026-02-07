<script setup lang="ts">
const props = defineProps<{
  slug: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const toast = useToast()
const authStore = useAuthStore()

interface Respondent {
  rsvpId: string
  name: string
  phone: string | null
  status: string
  isUser: boolean
  groupIds: string[]
}

interface GridGroup {
  id: string
  name: string
  type: string
}

const loading = ref(true)
const saving = ref(false)
const respondents = ref<Respondent[]>([])
const groups = ref<GridGroup[]>([])

// Track checkbox state: Map<rsvpId, Set<groupId>>
const selections = ref<Map<string, Set<string>>>(new Map())
// Track original state for diff
const originalSelections = ref<Map<string, Set<string>>>(new Map())

const changeCount = computed(() => {
  let count = 0
  for (const [rsvpId, groupIds] of selections.value) {
    const original = originalSelections.value.get(rsvpId) || new Set()
    for (const gid of groupIds) {
      if (!original.has(gid)) count++
    }
    for (const gid of original) {
      if (!groupIds.has(gid)) count++
    }
  }
  return count
})

const statusColors: Record<string, string> = {
  IN: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  OUT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAYBE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_IF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WAITLIST: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
}

const statusLabels: Record<string, string> = {
  IN: 'In',
  OUT: 'Out',
  MAYBE: 'Maybe',
  IN_IF: 'If...',
  WAITLIST: 'Wait'
}

async function fetchGrid() {
  loading.value = true
  try {
    const token = await authStore.getIdToken()
    const data = await $fetch<{ respondents: Respondent[]; groups: GridGroup[] }>(
      `/api/events/${props.slug}/respondent-grid`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    )
    respondents.value = data.respondents
    groups.value = data.groups

    // Initialize selection state
    const sel = new Map<string, Set<string>>()
    const orig = new Map<string, Set<string>>()
    for (const r of data.respondents) {
      sel.set(r.rsvpId, new Set(r.groupIds))
      orig.set(r.rsvpId, new Set(r.groupIds))
    }
    selections.value = sel
    originalSelections.value = orig
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load respondent grid', color: 'error' })
  } finally {
    loading.value = false
  }
}

function isChecked(rsvpId: string, groupId: string): boolean {
  return selections.value.get(rsvpId)?.has(groupId) || false
}

function toggleCheck(rsvpId: string, groupId: string) {
  const respondent = respondents.value.find(r => r.rsvpId === rsvpId)
  if (!respondent?.phone) return // Can't assign guests without phone

  const set = selections.value.get(rsvpId)
  if (!set) return

  if (set.has(groupId)) {
    set.delete(groupId)
  } else {
    set.add(groupId)
  }
  // Trigger reactivity
  selections.value = new Map(selections.value)
}

async function saveChanges() {
  saving.value = true
  try {
    const changes: { name: string; phone: string; groupIds: string[] }[] = []

    for (const r of respondents.value) {
      if (!r.phone) continue
      const current = selections.value.get(r.rsvpId)
      const original = originalSelections.value.get(r.rsvpId)
      if (!current || !original) continue

      // Check if anything changed for this respondent
      const hasChange = current.size !== original.size ||
        [...current].some(gid => !original.has(gid)) ||
        [...original].some(gid => !current.has(gid))

      if (hasChange) {
        changes.push({
          name: r.name,
          phone: r.phone,
          groupIds: [...current]
        })
      }
    }

    if (changes.length === 0) return

    const token = await authStore.getIdToken()
    await $fetch(`/api/events/${props.slug}/respondent-grid`, {
      method: 'POST',
      body: { changes },
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    toast.add({ title: 'Changes saved!', color: 'success' })

    // Update original selections to match current
    const orig = new Map<string, Set<string>>()
    for (const [rsvpId, groupIds] of selections.value) {
      orig.set(rsvpId, new Set(groupIds))
    }
    originalSelections.value = orig
  } catch {
    toast.add({ title: 'Error', description: 'Failed to save changes', color: 'error' })
  } finally {
    saving.value = false
  }
}

// Fetch when opened
watch(() => props.open, (open) => {
  if (open) fetchGrid()
})
</script>

<template>
  <USlideover v-model:open="isOpen" title="Manage Respondents" side="right">
    <template #default>
      <slot />
    </template>

    <template #body>
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
      </div>

      <!-- Empty state -->
      <div v-else-if="respondents.length === 0" class="text-center py-12 text-gray-500">
        No RSVPs yet
      </div>

      <!-- Grid -->
      <div v-else class="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <table class="w-full min-w-max">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 bg-white dark:bg-gray-900 text-left py-2 pr-3 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                Player
              </th>
              <th
                v-for="group in groups"
                :key="group.id"
                class="text-center py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]"
              >
                <div class="flex flex-col items-center gap-0.5">
                  <UIcon
                    v-if="group.type === 'MY_PEOPLE'"
                    name="i-heroicons-heart"
                    class="w-3.5 h-3.5 text-teal-500"
                  />
                  <span class="truncate max-w-[60px]">{{ group.name }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="respondent in respondents"
              :key="respondent.rsvpId"
              class="border-t border-gray-100 dark:border-gray-800"
            >
              <!-- Sticky name + status column -->
              <td class="sticky left-0 z-10 bg-white dark:bg-gray-900 py-2.5 pr-3">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none"
                    :class="statusColors[respondent.status] || statusColors.WAITLIST"
                  >
                    {{ statusLabels[respondent.status] || respondent.status }}
                  </span>
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                    {{ respondent.name }}
                  </span>
                </div>
              </td>

              <!-- Group checkboxes -->
              <td
                v-for="group in groups"
                :key="group.id"
                class="text-center py-2.5 px-2"
              >
                <button
                  v-if="respondent.phone"
                  class="w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-150 active:scale-90"
                  :class="isChecked(respondent.rsvpId, group.id)
                    ? 'bg-teal-500 border-teal-500'
                    : 'border-gray-300 dark:border-gray-600 hover:border-teal-400'"
                  @click="toggleCheck(respondent.rsvpId, group.id)"
                >
                  <UIcon
                    v-if="isChecked(respondent.rsvpId, group.id)"
                    name="i-heroicons-check"
                    class="w-4 h-4 text-white"
                  />
                </button>
                <span
                  v-else
                  class="text-gray-300 dark:text-gray-600 text-xs"
                  title="No phone number"
                >
                  --
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #footer>
      <div v-if="changeCount > 0" class="w-full">
        <button
          class="w-full py-3 rounded-xl font-semibold text-white
                 bg-gradient-to-r from-teal-500 to-teal-600
                 shadow-lg shadow-teal-500/30
                 transition-all duration-200 active:scale-[0.98]
                 disabled:opacity-50"
          :disabled="saving"
          @click="saveChanges"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            Saving...
          </span>
          <span v-else>
            Save Changes ({{ changeCount }})
          </span>
        </button>
      </div>
    </template>
  </USlideover>
</template>
