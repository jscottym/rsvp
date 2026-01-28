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
const showEditModal = ref(false)
const showSaveGroupModal = ref(false)
const showDeleteModal = ref(false)
const newGroupName = ref('')
const savingGroup = ref(false)
const deleting = ref(false)
const saving = ref(false)
const copied = ref(false)

const event = computed(() => eventsStore.currentEvent)
const rsvps = computed(() => eventsStore.rsvps)
const attendeesIn = computed(() => rsvps.value.filter(r => r.status === 'IN'))
const attendeesOut = computed(() => rsvps.value.filter(r => r.status === 'OUT'))
const attendeesMaybe = computed(() => rsvps.value.filter(r => r.status === 'MAYBE'))
const attendeesInIf = computed(() => rsvps.value.filter(r => r.status === 'IN_IF'))
const attendeesWaitlist = computed(() => rsvps.value.filter(r => r.status === 'WAITLIST'))
const phoneNumbersIn = computed(() =>
  attendeesIn.value.filter(r => r.phone).map(r => r.phone!)
)
const phoneNumbersWaitlist = computed(() =>
  attendeesWaitlist.value.filter(r => r.phone).map(r => r.phone!)
)
const notifyingWaitlist = ref(false)

const eventUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/e/${slug.value}`
  }
  return `/e/${slug.value}`
})

const editFormData = computed(() => {
  if (!event.value) return undefined
  const dt = new Date(event.value.datetime)
  const endDt = event.value.endDatetime ? new Date(event.value.endDatetime) : null

  // Calculate duration in minutes
  let duration = 120 // default 2 hours
  if (endDt) {
    duration = Math.round((endDt.getTime() - dt.getTime()) / (1000 * 60))
  }

  return {
    date: dt.toISOString().split('T')[0],
    startTime: dt.toTimeString().slice(0, 5),
    duration,
    maxPlayers: event.value.maxPlayers,
    location: event.value.location,
    description: event.value.description || '',
    allowSharing: event.value.allowSharing
  }
})

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

function formatSport(sport: string) {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

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

// Format time for share message (e.g., "6am", "6:30am", "11:00am")
function formatShareTime(datetime: string): string {
  const date = new Date(datetime)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  if (minutes === 0) {
    return `${hour12}${suffix}`
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${suffix}`
}

// Generate share message like "This Wed 6-8am? Looking for 3."
function generateShareMessage(): string {
  if (!event.value) return ''

  const eventDate = new Date(event.value.datetime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Format the day part
  let dayStr: string
  const isEvening = eventDate.getHours() >= 17

  if (diffDays === 0) {
    dayStr = isEvening ? 'Tonight' : 'Today'
  } else if (diffDays === 1) {
    dayStr = 'Tomorrow'
  } else if (diffDays > 1 && diffDays <= 6) {
    // This week: "This Wed"
    const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
    dayStr = `This ${weekday}`
  } else if (diffDays > 6 && diffDays <= 13) {
    // Next week: "Next Tue"
    const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
    dayStr = `Next ${weekday}`
  } else {
    // Further out: "Jan 15"
    dayStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format time range
  const startTime = formatShareTime(event.value.datetime)
  const endTime = event.value.endDatetime ? formatShareTime(event.value.endDatetime) : ''
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime

  // Calculate spots needed
  const spotsNeeded = event.value.maxPlayers - (event.value.rsvpCount || 0)

  return `${dayStr} ${timeStr}? Looking for ${spotsNeeded}.`
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

async function copyLink() {
  try {
    await navigator.clipboard.writeText(eventUrl.value)
    copied.value = true
    toast.add({ title: 'Link copied!', color: 'success' })
    setTimeout(() => { copied.value = false }, 2000)
  } catch (e) {
    toast.add({ title: 'Failed to copy', color: 'error' })
  }
}

async function copyPhones(phones: string[]) {
  try {
    await navigator.clipboard.writeText(phones.join(', '))
    toast.add({
      title: 'Phones copied!',
      description: `${phones.length} phone numbers copied`,
      color: 'success'
    })
  } catch (e) {
    toast.add({ title: 'Failed to copy', color: 'error' })
  }
}

function shareViaSms() {
  const message = generateShareMessage()
  const text = `${message}\n${eventUrl.value}`
  window.open(`sms:?body=${encodeURIComponent(text)}`)
}

function shareViaEmail() {
  const message = generateShareMessage()
  const subject = message
  const body = `${message}\n\n${eventUrl.value}`
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
}

async function notifyWaitlist() {
  notifyingWaitlist.value = true
  try {
    const data = await eventsStore.getWaitlistNotifyData(slug.value)
    if (data.phones.length > 0) {
      window.open(data.smsUrl, '_blank')
    } else {
      toast.add({
        title: 'No one on waitlist',
        description: 'There are no phone numbers to notify',
        color: 'warning'
      })
    }
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to get waitlist data',
      color: 'error'
    })
  } finally {
    notifyingWaitlist.value = false
  }
}

interface EventFormData {
  date: string
  startTime: string
  duration: number
  maxPlayers: number
  location: string
  description: string
  allowSharing: boolean
}

async function saveEvent(formData: EventFormData) {
  saving.value = true
  try {
    const datetime = new Date(`${formData.date}T${formData.startTime}`).toISOString()

    // Calculate end time from duration
    const [h, m] = formData.startTime.split(':').map(Number)
    const totalMinutes = h * 60 + m + formData.duration
    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
    const endDatetime = new Date(`${formData.date}T${endTime}`).toISOString()

    await eventsStore.updateEvent(slug.value, {
      location: formData.location,
      datetime,
      endDatetime,
      minPlayers: formData.maxPlayers,
      maxPlayers: formData.maxPlayers,
      description: formData.description || undefined,
      allowSharing: formData.allowSharing
    })

    toast.add({ title: 'Event updated!', color: 'success' })
    showEditModal.value = false
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update event',
      color: 'error'
    })
  } finally {
    saving.value = false
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
      description: `${attendeesIn.value.length} contacts saved`,
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
    toast.add({ title: 'Event deleted', color: 'success' })
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

<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
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
      <!-- Header with Edit -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UBadge :label="formatSport(event.sportType)" color="primary" variant="soft" size="sm" />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ event.title }}</h1>
          <p class="text-gray-500 mt-1">
            {{ formatDate(event.datetime) }} · {{ formatTimeRange(event.datetime, event.endDatetime) }}
          </p>
          <p class="text-gray-500 flex items-center gap-1 mt-1">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            {{ event.location }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="soft"
          icon="i-heroicons-pencil-square"
          @click="showEditModal = true"
        />
      </div>

      <!-- Share Card -->
      <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 mb-6 text-white">
        <p class="text-sm font-medium text-white/80 mb-2">Share with players</p>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-white/20 backdrop-blur rounded-lg px-3 py-2 text-sm truncate">
            {{ eventUrl }}
          </div>
          <UButton
            color="white"
            :variant="copied ? 'solid' : 'soft'"
            size="sm"
            :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
            :class="copied ? 'text-emerald-600' : 'text-emerald-700'"
            @click="copyLink"
          />
          <UButton
            color="white"
            variant="soft"
            size="sm"
            icon="i-heroicons-chat-bubble-left-ellipsis"
            class="text-emerald-700"
            @click="shareViaSms"
          />
          <UButton
            color="white"
            variant="soft"
            size="sm"
            icon="i-heroicons-envelope"
            class="text-emerald-700"
            @click="shareViaEmail"
          />
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-5 gap-2 mb-6">
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p class="text-2xl font-bold text-emerald-500">{{ attendeesIn.length }}</p>
          <p class="text-xs text-gray-500">In</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p class="text-2xl font-bold text-amber-500">{{ attendeesMaybe.length + attendeesInIf.length }}</p>
          <p class="text-xs text-gray-500">Maybe</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p class="text-2xl font-bold text-violet-500">{{ attendeesWaitlist.length }}</p>
          <p class="text-xs text-gray-500">Waitlist</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p class="text-2xl font-bold text-red-500">{{ attendeesOut.length }}</p>
          <p class="text-xs text-gray-500">Out</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ event.maxPlayers }}</p>
          <p class="text-xs text-gray-500">Max</p>
        </div>
      </div>

      <!-- Progress to minimum -->
      <div v-if="attendeesIn.length < event.minPlayers" class="mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600 dark:text-gray-400">Need {{ event.minPlayers - attendeesIn.length }} more to play</span>
          <span class="font-medium">{{ attendeesIn.length }}/{{ event.minPlayers }} min</span>
        </div>
        <UProgress :model-value="attendeesIn.length" :max="event.minPlayers" color="primary" size="sm" />
      </div>
      <div v-else class="mb-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 flex items-center gap-3">
        <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <UIcon name="i-heroicons-check-circle" class="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p class="font-medium text-emerald-900 dark:text-emerald-100">Game on!</p>
          <p class="text-sm text-emerald-700 dark:text-emerald-300">You have enough players</p>
        </div>
      </div>

      <!-- Players Section -->
      <div class="space-y-4">
        <!-- Players Going -->
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                Going ({{ attendeesIn.length }})
              </h3>
            </div>
            <UButton
              v-if="phoneNumbersIn.length > 0"
              color="primary"
              variant="soft"
              size="xs"
              icon="i-heroicons-clipboard-document"
              label="Copy Phones"
              @click="copyPhones(phoneNumbersIn)"
            />
          </div>

          <div v-if="attendeesIn.length === 0" class="p-6 text-center text-gray-500">
            <UIcon name="i-heroicons-user-group" class="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p class="text-sm">No RSVPs yet</p>
          </div>

          <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="rsvp in attendeesIn"
              :key="rsvp.id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                    {{ getInitials(rsvp.name) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ rsvp.name }}</p>
                  <p v-if="rsvp.phone" class="text-sm text-gray-500 truncate">{{ formatPhoneDisplay(rsvp.phone) }}</p>
                </div>
              </div>
              <p v-if="rsvp.comment" class="mt-2 ml-13 text-sm text-gray-500 italic">"{{ rsvp.comment }}"</p>
            </li>
          </ul>
        </div>

        <!-- Maybe -->
        <div v-if="attendeesMaybe.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <div class="w-2 h-2 bg-amber-500 rounded-full"></div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Maybe ({{ attendeesMaybe.length }})
            </h3>
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="rsvp in attendeesMaybe"
              :key="rsvp.id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-amber-600 dark:text-amber-400 font-medium text-sm">
                    {{ getInitials(rsvp.name) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ rsvp.name }}</p>
                  <p v-if="rsvp.phone" class="text-sm text-gray-500 truncate">{{ formatPhoneDisplay(rsvp.phone) }}</p>
                </div>
              </div>
              <p v-if="rsvp.comment" class="mt-2 ml-13 text-sm text-gray-500 italic">"{{ rsvp.comment }}"</p>
            </li>
          </ul>
        </div>

        <!-- In If -->
        <div v-if="attendeesInIf.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              In If... ({{ attendeesInIf.length }})
            </h3>
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="rsvp in attendeesInIf"
              :key="rsvp.id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-blue-600 dark:text-blue-400 font-medium text-sm">
                    {{ getInitials(rsvp.name) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ rsvp.name }}</p>
                  <p v-if="rsvp.phone" class="text-sm text-gray-500 truncate">{{ formatPhoneDisplay(rsvp.phone) }}</p>
                </div>
              </div>
              <p v-if="rsvp.comment" class="mt-2 ml-13 text-sm text-gray-500 italic">"{{ rsvp.comment }}"</p>
            </li>
          </ul>
        </div>

        <!-- Waitlist -->
        <div v-if="attendeesWaitlist.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 bg-violet-500 rounded-full"></div>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                Waitlist ({{ attendeesWaitlist.length }})
              </h3>
            </div>
            <UButton
              v-if="phoneNumbersWaitlist.length > 0"
              color="primary"
              variant="soft"
              size="xs"
              icon="i-heroicons-chat-bubble-left-ellipsis"
              label="Notify All"
              :loading="notifyingWaitlist"
              @click="notifyWaitlist"
            />
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="rsvp in attendeesWaitlist"
              :key="rsvp.id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-violet-600 dark:text-violet-400 font-medium text-sm">
                    {{ getInitials(rsvp.name) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ rsvp.name }}</p>
                  <p v-if="rsvp.phone" class="text-sm text-gray-500 truncate">{{ formatPhoneDisplay(rsvp.phone) }}</p>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Players Not Going -->
        <div v-if="attendeesOut.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Can't make it ({{ attendeesOut.length }})
            </h3>
          </div>

          <ul class="divide-y divide-gray-100 dark:divide-gray-800">
            <li
              v-for="rsvp in attendeesOut"
              :key="rsvp.id"
              class="px-4 py-3"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-red-600 dark:text-red-400 font-medium text-sm">
                    {{ getInitials(rsvp.name) }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-900 dark:text-white truncate">{{ rsvp.name }}</p>
                </div>
              </div>
              <p v-if="rsvp.comment" class="mt-2 ml-13 text-sm text-gray-500 italic">"{{ rsvp.comment }}"</p>
            </li>
          </ul>
        </div>
      </div>

      <!-- Actions -->
      <div class="mt-6 space-y-3">
        <UButton
          v-if="attendeesIn.length > 0"
          color="neutral"
          variant="outline"
          block
          icon="i-heroicons-user-plus"
          label="Save Players to Group"
          @click="showSaveGroupModal = true"
        />
        <UButton
          :to="`/e/${slug}`"
          color="neutral"
          variant="ghost"
          block
          icon="i-heroicons-eye"
          label="View Public Page"
        />
      </div>
    </template>

    <!-- Edit Event Slideover -->
    <USlideover v-model:open="showEditModal" title="Edit Event" side="right" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <div class="px-4 pt-4">
          <EventForm
            :initial-data="editFormData"
            :submitting="saving"
            submit-label="Save Changes"
            inline
            @submit="saveEvent"
            @cancel="showEditModal = false"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <UButton
            color="error"
            variant="ghost"
            label="Delete Event"
            @click="showDeleteModal = true; showEditModal = false"
          />
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showEditModal = false"
          />
        </div>
      </template>
    </USlideover>

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
            {{ attendeesIn.length }} contacts will be added to this group.
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
