<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">My Events</h1>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        label="Create Event"
        to="/create"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Empty State -->
    <div v-else-if="events.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-calendar-days" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events yet</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-6">Create your first event and start organizing games!</p>
      <UButton color="primary" to="/create" icon="i-heroicons-plus">
        Create Event
      </UButton>
    </div>

    <!-- Events List -->
    <div v-else class="space-y-4">
      <NuxtLink
        v-for="event in events"
        :key="event.id"
        :to="`/e/${event.slug}/manage`"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-primary-500 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <UBadge :label="formatSport(event.sportType)" color="primary" variant="soft" size="sm" />
              <UBadge
                v-if="isPast(event.datetime)"
                label="Past"
                color="neutral"
                variant="soft"
                size="sm"
              />
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ event.title }}</h3>
            <p class="text-sm text-gray-500">
              {{ formatDate(event.datetime) }} · {{ formatTimeRange(event.datetime, event.endDatetime) }}
            </p>
            <p class="text-sm text-gray-500">{{ event.location }}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-primary-500">{{ event.rsvpCount }}</p>
            <p class="text-xs text-gray-500">/ {{ event.maxPlayers }}</p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const eventsStore = useEventsStore()

const loading = ref(true)
const events = computed(() => eventsStore.events)

onMounted(async () => {
  try {
    await eventsStore.fetchMyEvents()
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

function isPast(datetime: string) {
  return new Date(datetime) < new Date()
}

useSeoMeta({
  title: 'My Events - Pickup Sports'
})
</script>
