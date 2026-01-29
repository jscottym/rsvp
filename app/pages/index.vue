<script setup lang="ts">
const authStore = useAuthStore();
const eventsStore = useEventsStore();

const loading = ref(true);
const showPastEvents = ref(false);

type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST';

interface DashboardEvent {
  id: string;
  slug: string;
  title: string;
  sportType: string;
  location: string;
  datetime: string;
  endDatetime: string | null;
  maxPlayers: number;
  rsvpCount: number;
  isOrganizer: boolean;
  userRsvpStatus: RsvpStatus | null;
  organizer: { id: string; name: string | null };
  attendees?: {
    id: string;
    status: RsvpStatus;
    name: string;
    userId: string | null;
  }[];
}

// Computed list of all event slugs for WebSocket subscription
const allEventSlugs = computed(() => {
  const upcoming = eventsStore.dashboardUpcoming.map((e) => e.slug);
  const past = eventsStore.dashboardPast.map((e) => e.slug);
  return [...upcoming, ...past];
});

// Set up WebSocket for real-time updates
const { isConnected } = useDashboardWebSocket(allEventSlugs, {
  onRsvpUpdate: (payload) => {
    eventsStore.applyDashboardRsvpUpdate(payload);
  },
  onEventUpdate: (payload) => {
    eventsStore.applyDashboardEventUpdate(payload);
  },
});

const toast = useToast();

// Handle claiming a spot from the dashboard
async function handleClaimSpot(slug: string) {
  try {
    const token = await authStore.getIdToken();
    if (!token) return;

    await $fetch(`/api/events/${slug}/rsvp`, {
      method: 'POST',
      body: { status: 'IN' },
      headers: { Authorization: `Bearer ${token}` },
    });

    // Refresh dashboard to get updated data
    await eventsStore.fetchDashboardEvents();

    toast.add({
      title: "You're in!",
      description: 'Spot claimed successfully',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Could not claim spot',
      description: error.data?.message || 'Someone may have claimed it first',
      color: 'error',
    });
    // Refresh to get current state
    await eventsStore.fetchDashboardEvents();
  }
}

// Fetch dashboard events when authenticated
watch(
  () => authStore.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      try {
        await eventsStore.fetchDashboardEvents();
      } finally {
        loading.value = false;
      }
    } else {
      loading.value = false;
    }
  },
  { immediate: true }
);

// Computed: upcoming events from store (sorted by datetime)
const upcomingEvents = computed(
  () => eventsStore.dashboardUpcoming as DashboardEvent[]
);
const pastEvents = computed(
  () => eventsStore.dashboardPast as DashboardEvent[]
);

useSeoMeta({
  title: 'Create and Join Events',
  description:
    'Create events people can RSVP to, or RSVP to events others created.',
});
</script>

<template>
  <!-- Landing page for unauthenticated users -->
  <div
    v-if="!authStore.isAuthenticated"
    class="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center py-12"
  >
    <p
      class="text-center text-lg text-gray-600 dark:text-gray-400 max-w-md mb-12"
    >
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
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-gray-400"
      />
    </div>

    <div v-else class="pb-24 pt-4">
      <!-- Events list -->
      <div class="px-4 space-y-3">
        <!-- Empty state -->
        <div
          v-if="upcomingEvents.length === 0"
          class="text-center py-12"
        >
          <UIcon
            name="i-heroicons-calendar-days"
            class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
          />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No events yet
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Create your first event or RSVP to one!
          </p>
        </div>

        <!-- Event cards -->
        <NuxtLink
          v-for="event in upcomingEvents"
          :key="event.id"
          :to="`/e/${event.slug}`"
          class="block"
        >
          <DashboardEventCard
            :event="event"
            @claim-spot="handleClaimSpot"
          />
        </NuxtLink>
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
            :name="
              showPastEvents
                ? 'i-heroicons-chevron-down'
                : 'i-heroicons-chevron-right'
            "
            class="w-4 h-4"
          />
          <span>Past Events ({{ pastEvents.length }})</span>
        </button>

        <div v-if="showPastEvents" class="mt-3 space-y-3">
          <NuxtLink
            v-for="event in pastEvents"
            :key="event.id"
            :to="`/e/${event.slug}`"
            class="block opacity-60"
          >
            <DashboardEventCard
              :event="event"
              @claim-spot="handleClaimSpot"
            />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
