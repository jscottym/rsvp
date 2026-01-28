<script setup lang="ts">
const authStore = useAuthStore()
const eventsStore = useEventsStore()

const loading = ref(true)
const selectedDate = ref<Date | null>(null)
const activeFilter = ref('all')
const showPastEvents = ref(false)

type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

interface DashboardEvent {
  id: string
  slug: string
  title: string
  sportType: string
  location: string
  datetime: string
  endDatetime: string | null
  maxPlayers: number
  rsvpCount: number
  isOrganizer: boolean
  userRsvpStatus: RsvpStatus | null
  organizer: { id: string; name: string | null }
}

// Fetch dashboard events when authenticated
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    try {
      await eventsStore.fetchDashboardEvents()
    } finally {
      loading.value = false
    }
  } else {
    loading.value = false
  }
}, { immediate: true })

// Computed: upcoming events from store
const upcomingEvents = computed(() => eventsStore.dashboardUpcoming as DashboardEvent[])
const pastEvents = computed(() => eventsStore.dashboardPast as DashboardEvent[])

// Filter tabs
const filterTabs = computed(() => {
  const all = upcomingEvents.value.length
  const inCount = upcomingEvents.value.filter(e => e.userRsvpStatus === 'IN' || e.isOrganizer).length
  const waitlistCount = upcomingEvents.value.filter(e => e.userRsvpStatus === 'WAITLIST').length
  const maybeCount = upcomingEvents.value.filter(e => e.userRsvpStatus === 'MAYBE' || e.userRsvpStatus === 'IN_IF').length
  const organizingCount = upcomingEvents.value.filter(e => e.isOrganizer).length

  const tabs = [
    { label: 'All', value: 'all', badge: all > 0 ? all : undefined }
  ]

  if (inCount > 0) {
    tabs.push({ label: 'In', value: 'in', badge: inCount })
  }
  if (waitlistCount > 0) {
    tabs.push({ label: 'Waitlist', value: 'waitlist', badge: waitlistCount })
  }
  if (maybeCount > 0) {
    tabs.push({ label: 'Maybe', value: 'maybe', badge: maybeCount })
  }
  if (organizingCount > 0) {
    tabs.push({ label: 'Organizing', value: 'organizing', badge: organizingCount })
  }

  return tabs
})

// Filtered events based on selected date and filter tab
const filteredEvents = computed(() => {
  let events = [...upcomingEvents.value]

  // Filter by selected date
  if (selectedDate.value) {
    const selectedDay = new Date(selectedDate.value)
    selectedDay.setHours(0, 0, 0, 0)

    events = events.filter(e => {
      const eventDate = new Date(e.datetime)
      eventDate.setHours(0, 0, 0, 0)
      return eventDate.getTime() === selectedDay.getTime()
    })
  }

  // Filter by tab
  switch (activeFilter.value) {
    case 'in':
      events = events.filter(e => e.userRsvpStatus === 'IN' || e.isOrganizer)
      break
    case 'waitlist':
      events = events.filter(e => e.userRsvpStatus === 'WAITLIST')
      break
    case 'maybe':
      events = events.filter(e => e.userRsvpStatus === 'MAYBE' || e.userRsvpStatus === 'IN_IF')
      break
    case 'organizing':
      events = events.filter(e => e.isOrganizer)
      break
  }

  return events
})

// Format selected date for display
const selectedDateDisplay = computed(() => {
  if (!selectedDate.value) return null

  const date = new Date(selectedDate.value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  if (date.getTime() === today.getTime()) {
    return 'Today'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
})

function clearDateFilter() {
  selectedDate.value = null
}

useSeoMeta({
  title: 'RSVP - Create and Join Events',
  description: 'Create events people can RSVP to, or RSVP to events others created.'
})
</script>

<template>
  <!-- Landing page for unauthenticated users -->
  <div v-if="!authStore.isAuthenticated" class="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center py-12">
    <p class="text-center text-lg text-gray-600 dark:text-gray-400 max-w-md mb-12">
      Create events people can RSVP to, or RSVP to events others created.
    </p>

    <NuxtLink
      to="/create"
      class="group relative px-16 py-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 active:scale-100"
    >
      <span class="text-3xl sm:text-4xl font-bold text-white">
        Create Game
      </span>
    </NuxtLink>
  </div>

  <!-- Dashboard for authenticated users -->
  <div v-else class="min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-gray-950">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else class="pb-24">
      <!-- Calendar -->
      <div class="pt-4 pb-2 bg-gray-50 dark:bg-gray-950">
        <DashboardCalendar
          :events="upcomingEvents"
          :selected-date="selectedDate"
          @select="selectedDate = $event"
        />
      </div>

      <!-- Date filter indicator + Show All -->
      <div class="flex items-center justify-between px-4 py-2">
        <div class="flex items-center gap-2">
          <p v-if="selectedDateDisplay" class="text-sm font-medium text-gray-900 dark:text-white">
            {{ selectedDateDisplay }}
          </p>
          <p v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">
            All upcoming events
          </p>
        </div>
        <button
          v-if="selectedDate"
          @click="clearDateFilter"
          class="text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          Show All
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="px-4 pb-3 overflow-x-auto">
        <UTabs
          v-model="activeFilter"
          :items="filterTabs"
          :content="false"
          variant="pill"
          color="neutral"
          size="sm"
        />
      </div>

      <!-- Events list -->
      <div class="px-4 space-y-3">
        <!-- Empty state -->
        <div v-if="filteredEvents.length === 0 && upcomingEvents.length === 0" class="text-center py-12">
          <UIcon name="i-heroicons-calendar-days" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events yet</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">Create your first event or RSVP to one!</p>
        </div>

        <!-- No events for filter -->
        <div v-else-if="filteredEvents.length === 0" class="text-center py-8">
          <p class="text-gray-500 dark:text-gray-400">
            No events
            <span v-if="selectedDateDisplay">on {{ selectedDateDisplay }}</span>
            <span v-if="activeFilter !== 'all'"> with this filter</span>
          </p>
        </div>

        <!-- Event cards -->
        <DashboardEventCard
          v-for="event in filteredEvents"
          :key="event.id"
          :event="event"
        />
      </div>

      <!-- Create Event button -->
      <div class="px-4 mt-6">
        <NuxtLink
          to="/create"
          class="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-200 active:scale-[0.98]"
        >
          <UIcon name="i-heroicons-plus" class="w-6 h-6 text-white" />
          <span class="text-lg font-bold text-white">Create Event</span>
        </NuxtLink>
      </div>

      <!-- Past events (collapsible) -->
      <div v-if="pastEvents.length > 0" class="px-4 mt-8">
        <button
          @click="showPastEvents = !showPastEvents"
          class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <UIcon
            :name="showPastEvents ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="w-4 h-4"
          />
          <span>Past Events ({{ pastEvents.length }})</span>
        </button>

        <div v-if="showPastEvents" class="mt-3 space-y-3">
          <DashboardEventCard
            v-for="event in pastEvents"
            :key="event.id"
            :event="event"
            class="opacity-60"
          />
        </div>
      </div>
    </div>
  </div>
</template>
