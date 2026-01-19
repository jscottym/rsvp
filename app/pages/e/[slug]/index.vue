<template>
  <div class="max-w-xl mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Event Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">This event may have been deleted or the link is incorrect.</p>
      <UButton to="/" color="primary" variant="soft">Back to Home</UButton>
    </div>

    <!-- Event Content -->
    <template v-else-if="event">
      <!-- Sharing Note Banner -->
      <UAlert
        v-if="event.sharingNote"
        color="warning"
        variant="soft"
        class="mb-6"
        icon="i-heroicons-information-circle"
      >
        <template #title>Note from organizer</template>
        <template #description>{{ event.sharingNote }}</template>
      </UAlert>

      <!-- Event Header -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-2">
          <UBadge :label="formatSport(event.sportType)" color="primary" variant="soft" />
          <span class="text-sm text-gray-500">by {{ event.organizer.name }}</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ event.title }}</h1>
      </div>

      <!-- Event Details -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6 space-y-4">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-calendar-days" class="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(event.datetime) }}</p>
            <p class="text-sm text-gray-500">{{ formatTimeRange(event.datetime, event.endDatetime) }}</p>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-map-pin" class="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ event.location }}</p>
          </div>
        </div>

        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-user-group" class="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ event.rsvpCount }} / {{ event.maxPlayers }} players
            </p>
            <p class="text-sm text-gray-500">
              Need {{ event.minPlayers }} minimum
            </p>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="event.description" class="mb-6">
        <h3 class="font-medium text-gray-900 dark:text-white mb-2">Details</h3>
        <p class="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ event.description }}</p>
      </div>

      <!-- RSVP Buttons -->
      <div v-if="!event.isOrganizer" class="mb-6">
        <RsvpButtons
          :status="event.userRsvp"
          :full="event.rsvpCount >= event.maxPlayers"
          :loading="rsvpLoading"
          @rsvp="handleRsvp"
        />
      </div>

      <!-- Organizer Actions -->
      <div v-else class="mb-6">
        <UButton
          to="`/e/${event.slug}/manage`"
          color="primary"
          size="lg"
          block
          icon="i-heroicons-cog-6-tooth"
        >
          Manage Event
        </UButton>
      </div>

      <!-- Attendee List -->
      <div v-if="event.attendees && event.attendees.length > 0">
        <h3 class="font-medium text-gray-900 dark:text-white mb-3">
          Who's In ({{ event.attendees.length }})
        </h3>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="attendee in event.attendees"
            :key="attendee.id"
            :label="attendee.name"
            color="neutral"
            variant="soft"
            size="lg"
          />
        </div>
      </div>

      <!-- Share Section -->
      <div v-if="event.allowSharing" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        <ShareLinkCard :slug="event.slug" />
      </div>
    </template>

    <!-- Auth Modal -->
    <AuthModal
      v-model:open="showAuthModal"
      @authenticated="submitPendingRsvp"
    />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const eventsStore = useEventsStore()
const authStore = useAuthStore()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const showAuthModal = ref(false)
const pendingRsvpStatus = ref<'IN' | 'OUT' | null>(null)
const rsvpLoading = ref(false)

const { data: eventData, pending, error, refresh } = await useAsyncData(
  `event-${slug.value}`,
  () => eventsStore.fetchEvent(slug.value),
  { watch: [slug] }
)

const event = computed(() => eventsStore.currentEvent)

async function handleRsvp(status: 'IN' | 'OUT') {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = status
    showAuthModal.value = true
    return
  }

  await submitRsvp(status)
}

async function submitPendingRsvp() {
  if (pendingRsvpStatus.value) {
    await submitRsvp(pendingRsvpStatus.value)
    pendingRsvpStatus.value = null
  }
}

async function submitRsvp(status: 'IN' | 'OUT') {
  rsvpLoading.value = true

  try {
    await eventsStore.submitRsvp(slug.value, status)
    toast.add({
      title: status === 'IN' ? "You're in!" : 'RSVP updated',
      description: status === 'IN' ? 'See you there!' : "We'll miss you!",
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to submit RSVP',
      color: 'error'
    })
  } finally {
    rsvpLoading.value = false
  }
}

function formatSport(sport: string) {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
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
  return `${startTime} → ${endTime}`
}

useSeoMeta({
  title: () => event.value ? `${event.value.title} - Pickup Sports` : 'Event - Pickup Sports',
  description: () => event.value ? `Join ${event.value.title} at ${event.value.location}` : 'View event details'
})
</script>
