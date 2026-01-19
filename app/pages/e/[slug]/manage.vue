<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Not Organizer -->
    <div v-else-if="event && !event.isOrganizer" class="text-center py-12">
      <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Only the organizer can manage this event.</p>
      <UButton :to="`/e/${slug}`" color="primary" variant="soft">View Event</UButton>
    </div>

    <!-- Dashboard Content -->
    <template v-else-if="event">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <NuxtLink :to="`/e/${slug}`" class="text-sm text-primary-500 hover:underline mb-1 inline-flex items-center gap-1">
            <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
            View public page
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ event.title }}</h1>
          <p class="text-gray-500">{{ formatDate(event.datetime) }} · {{ formatTimeRange(event.datetime, event.endDatetime) }}</p>
        </div>
        <UDropdown :items="moreMenuItems">
          <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" />
        </UDropdown>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p class="text-3xl font-bold text-primary-500">{{ attendees.length }}</p>
          <p class="text-sm text-gray-500">Going</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ event.minPlayers }}</p>
          <p class="text-sm text-gray-500">Min needed</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
          <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ event.maxPlayers }}</p>
          <p class="text-sm text-gray-500">Max spots</p>
        </div>
      </div>

      <!-- Share Link -->
      <ShareLinkCard :slug="slug" class="mb-8" />

      <!-- Attendee List with Phones -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Players ({{ attendees.length }})
          </h3>
          <UButton
            v-if="phoneNumbers.length > 0"
            color="primary"
            variant="soft"
            size="sm"
            icon="i-heroicons-clipboard-document"
            label="Copy Phones"
            @click="copyPhones"
          />
        </div>

        <div v-if="attendees.length === 0" class="p-8 text-center text-gray-500">
          <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No RSVPs yet. Share the link to get players!</p>
        </div>

        <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
          <li
            v-for="rsvp in attendees"
            :key="rsvp.id"
            class="px-4 py-3 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <span class="text-primary-600 dark:text-primary-400 font-medium">
                  {{ getInitials(rsvp.name) }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ rsvp.name }}</p>
                <p v-if="rsvp.phone" class="text-sm text-gray-500">{{ formatPhoneDisplay(rsvp.phone) }}</p>
              </div>
            </div>
            <UBadge
              :color="rsvp.status === 'IN' ? 'success' : 'error'"
              variant="soft"
              :label="rsvp.status === 'IN' ? 'Going' : 'Out'"
            />
          </li>
        </ul>
      </div>

      <!-- Save to Group -->
      <div v-if="attendees.length > 0" class="mt-6">
        <UButton
          color="neutral"
          variant="outline"
          block
          icon="i-heroicons-user-plus"
          label="Save Attendees to Group"
          @click="showSaveGroupModal = true"
        />
      </div>
    </template>

    <!-- Save to Group Modal -->
    <UModal v-model:open="showSaveGroupModal" title="Save to Group">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Group Name">
            <UInput
              v-model="newGroupName"
              placeholder="e.g., Sunday Hoopers"
              size="lg"
            />
          </UFormField>
          <p class="text-sm text-gray-500">
            {{ attendees.length }} contacts will be added to this group.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showSaveGroupModal = false"
          />
          <UButton
            color="primary"
            label="Create Group"
            :loading="savingGroup"
            :disabled="!newGroupName.trim()"
            @click="saveToGroup"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal v-model:open="showDeleteModal" title="Delete Event">
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this event? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showDeleteModal = false"
          />
          <UButton
            color="error"
            label="Delete Event"
            :loading="deleting"
            @click="deleteEvent"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const loading = ref(true)
const showSaveGroupModal = ref(false)
const showDeleteModal = ref(false)
const newGroupName = ref('')
const savingGroup = ref(false)
const deleting = ref(false)

const event = computed(() => eventsStore.currentEvent)
const rsvps = computed(() => eventsStore.rsvps)
const attendees = computed(() => eventsStore.attendees)
const phoneNumbers = computed(() => eventsStore.phoneNumbers)

const moreMenuItems = [
  [{
    label: 'Edit Event',
    icon: 'i-heroicons-pencil-square',
    click: () => {
      // TODO: Implement edit modal
      toast.add({ title: 'Coming soon!', color: 'info' })
    }
  }],
  [{
    label: 'Delete Event',
    icon: 'i-heroicons-trash',
    click: () => {
      showDeleteModal.value = true
    }
  }]
]

onMounted(async () => {
  try {
    await eventsStore.fetchEvent(slug.value)
    if (event.value?.isOrganizer) {
      await eventsStore.fetchRsvps(slug.value)
    }
  } finally {
    loading.value = false
  }
})

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function formatTimeRange(start: string, end?: string) {
  const startTime = formatTime(start)
  if (!end) return startTime
  const endTime = formatTime(end)
  return `${startTime} – ${endTime}`
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatPhoneDisplay(phone: string) {
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
  try {
    const phones = phoneNumbers.value.join(', ')
    await navigator.clipboard.writeText(phones)
    toast.add({
      title: 'Phones copied!',
      description: `${phoneNumbers.value.length} phone numbers copied to clipboard`,
      color: 'success'
    })
  } catch (e) {
    toast.add({
      title: 'Failed to copy',
      color: 'error'
    })
  }
}

async function saveToGroup() {
  savingGroup.value = true
  try {
    const authStore = useAuthStore()
    const token = await authStore.getIdToken()

    await $fetch('/api/groups/from-event', {
      method: 'POST',
      body: {
        eventSlug: slug.value,
        groupName: newGroupName.value.trim()
      },
      headers: { Authorization: `Bearer ${token}` }
    })

    toast.add({
      title: 'Group created!',
      description: `${attendees.value.length} contacts saved`,
      color: 'success'
    })

    showSaveGroupModal.value = false
    newGroupName.value = ''
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to create group',
      color: 'error'
    })
  } finally {
    savingGroup.value = false
  }
}

async function deleteEvent() {
  deleting.value = true
  try {
    await eventsStore.deleteEvent(slug.value)
    toast.add({
      title: 'Event deleted',
      color: 'success'
    })
    router.push('/my-events')
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to delete event',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

useSeoMeta({
  title: () => event.value ? `Manage: ${event.value.title}` : 'Manage Event'
})
</script>
