<script setup lang="ts">
import { formatRelativeDay } from '~/utils/dateFormat';
import { getRsvpStatusConfig, type RsvpStatus } from '~/utils/rsvpStatus';

interface Props {
  open: boolean;
  slug: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  close: [];
}>();

const router = useRouter();
const eventsStore = useEventsStore();
const authStore = useAuthStore();
const toast = useToast();

const loading = ref(true);
const error = ref<string | null>(null);
const showAuthModal = ref(false);
const pendingRsvpStatus = ref<RsvpStatus | null>(null);
const rsvpLoading = ref(false);
const selectedStatus = ref<RsvpStatus | null>(null);
const showDropOutModal = ref(false);
const droppingOut = ref(false);

// Event data
const event = ref<any>(null);

// Fetch event when modal opens
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.slug) {
      loading.value = true;
      error.value = null;
      try {
        await eventsStore.fetchEvent(props.slug);
        event.value = eventsStore.currentEvent;

        // Initialize from existing RSVP
        if (event.value?.userRsvp) {
          selectedStatus.value = event.value.userRsvp.status;
        }
      } catch (e: any) {
        error.value = e.data?.message || 'Failed to load event';
      } finally {
        loading.value = false;
      }
    }
  },
  { immediate: true }
);

// Computed values
const isFull = computed(() => {
  if (!event.value) return false;
  return (event.value.rsvpCount ?? 0) >= event.value.maxPlayers;
});

const isConfirmed = computed(() => event.value?.userRsvp?.status === 'IN');
const isOnWaitlist = computed(() => event.value?.userRsvp?.status === 'WAITLIST');
const hasWaitlist = computed(() => (event.value?.waitlistCount ?? 0) > 0);
const spotOpenedUp = computed(() => isOnWaitlist.value && !isFull.value);

const rsvpsIn = computed(() =>
  event.value?.rsvps?.filter((r: any) => r.status === 'IN') || []
);

function formatTime(datetime: string, endDatetime?: string) {
  const start = new Date(datetime);
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const startPeriod = startHour >= 12 ? 'pm' : 'am';
  const startHour12 = startHour % 12 || 12;
  const startTimeStr =
    startMinute === 0
      ? `${startHour12}`
      : `${startHour12}:${startMinute.toString().padStart(2, '0')}`;

  if (endDatetime) {
    const end = new Date(endDatetime);
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    const endPeriod = endHour >= 12 ? 'pm' : 'am';
    const endHour12 = endHour % 12 || 12;
    const endTimeStr =
      endMinute === 0
        ? `${endHour12}`
        : `${endHour12}:${endMinute.toString().padStart(2, '0')}`;

    if (startPeriod === endPeriod) {
      return `${startTimeStr}-${endTimeStr}${endPeriod}`;
    }
    return `${startTimeStr}${startPeriod}-${endTimeStr}${endPeriod}`;
  }
  return `${startTimeStr}${startPeriod}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function close() {
  emit('update:open', false);
  emit('close');
}

function viewFullDetails() {
  close();
  router.push(`/e/${props.slug}`);
}

async function selectStatus(status: RsvpStatus) {
  selectedStatus.value = status;
  await autoSave();
}

async function autoSave() {
  if (!selectedStatus.value) return;

  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = selectedStatus.value;
    showAuthModal.value = true;
    return;
  }

  await submitRsvp();
}

async function submitPendingRsvp() {
  if (pendingRsvpStatus.value) {
    selectedStatus.value = pendingRsvpStatus.value;
    await submitRsvp();
    pendingRsvpStatus.value = null;
  }
}

async function submitRsvp() {
  if (!selectedStatus.value) return;
  rsvpLoading.value = true;

  try {
    await eventsStore.submitRsvp(props.slug, selectedStatus.value);

    // Refresh event data
    await eventsStore.fetchEvent(props.slug);
    event.value = eventsStore.currentEvent;

    const messages: Record<RsvpStatus, { title: string; description: string }> = {
      IN: { title: "You're in!", description: 'See you there!' },
      OUT: { title: 'Got it', description: "We'll miss you!" },
      MAYBE: { title: 'Response saved', description: "We'll hope to see you!" },
      IN_IF: { title: 'Response saved', description: 'Fingers crossed!' },
      WAITLIST: { title: "You're on the waitlist!", description: 'If someone drops out, you can join.' },
    };

    toast.add({
      title: messages[selectedStatus.value].title,
      description: messages[selectedStatus.value].description,
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to submit RSVP',
      color: 'error',
    });
  } finally {
    rsvpLoading.value = false;
  }
}

async function handleJoinWaitlist() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'WAITLIST';
    showAuthModal.value = true;
    return;
  }

  selectedStatus.value = 'WAITLIST';
  await submitRsvp();
}

async function handleClaimSpot() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'IN';
    showAuthModal.value = true;
    return;
  }

  rsvpLoading.value = true;
  try {
    await eventsStore.submitRsvp(props.slug, 'IN');
    selectedStatus.value = 'IN';

    // Refresh event data
    await eventsStore.fetchEvent(props.slug);
    event.value = eventsStore.currentEvent;

    toast.add({
      title: "You're in!",
      description: 'You claimed the spot!',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to claim spot',
      color: 'error',
    });
  } finally {
    rsvpLoading.value = false;
  }
}

async function handleDropOut() {
  droppingOut.value = true;
  try {
    await eventsStore.submitRsvp(props.slug, 'OUT');
    selectedStatus.value = 'OUT';

    // Refresh event data
    await eventsStore.fetchEvent(props.slug);
    event.value = eventsStore.currentEvent;

    toast.add({
      title: 'Dropped out',
      description: "You've been removed from the confirmed list",
      color: 'success',
    });
    showDropOutModal.value = false;
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to drop out',
      color: 'error',
    });
  } finally {
    droppingOut.value = false;
  }
}
</script>

<template>
  <UModal
    :open="open"
    fullscreen
    :ui="{
      content: 'bg-gray-50 dark:bg-gray-950',
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            class="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            @click="close"
          >
            <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
            <span class="text-sm font-medium">Back</span>
          </button>
          <button
            class="text-sm font-medium text-primary-600 dark:text-primary-400"
            @click="viewFullDetails"
          >
            Full Details
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center h-64">
            <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
          </div>

          <!-- Error -->
          <div v-else-if="error" class="p-6 text-center">
            <UIcon name="i-heroicons-exclamation-circle" class="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p class="text-gray-600 dark:text-gray-400">{{ error }}</p>
          </div>

          <!-- Event Content -->
          <div v-else-if="event" class="p-4">
            <!-- Event Info -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-4">
              <!-- Location & Time -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-2 min-w-0">
                  <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-gray-400 shrink-0" />
                  <span class="font-semibold text-gray-900 dark:text-white truncate">
                    {{ event.location }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                <span class="font-medium text-primary-600 dark:text-primary-400">
                  {{ formatRelativeDay(event.datetime) }}
                </span>
                <span>·</span>
                <span>{{ formatTime(event.datetime, event.endDatetime) }}</span>
              </div>

              <!-- Player Count -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-users" class="w-4 h-4 text-gray-400" />
                  <span class="text-sm text-gray-600 dark:text-gray-400">Players</span>
                </div>
                <div>
                  <span class="text-xl font-bold text-primary-600">{{ event.rsvpCount ?? 0 }}</span>
                  <span class="text-gray-400">/{{ event.maxPlayers }}</span>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 transition-all duration-300"
                  :style="{ width: `${Math.min(100, ((event.rsvpCount ?? 0) / event.maxPlayers) * 100)}%` }"
                />
              </div>
            </div>

            <!-- RSVP Section -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-4">
              <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
                {{ isConfirmed ? "You're in!" : 'Are you in?' }}
              </h3>

              <!-- Confirmed State -->
              <div
                v-if="isConfirmed"
                class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle-solid" class="h-5 w-5 text-emerald-500" />
                  <span class="font-medium text-emerald-700 dark:text-emerald-300">Confirmed</span>
                </div>
                <UButton
                  color="error"
                  variant="outline"
                  size="sm"
                  @click="showDropOutModal = true"
                >
                  Drop out
                </UButton>
              </div>

              <!-- Spot Opened Up -->
              <div
                v-else-if="spotOpenedUp"
                class="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 dark:bg-emerald-900/20"
              >
                <div class="mb-3 flex items-center gap-3">
                  <UIcon name="i-heroicons-sparkles" class="h-6 w-6 text-emerald-600" />
                  <div>
                    <p class="font-semibold text-emerald-900 dark:text-emerald-100">A spot opened up!</p>
                    <p class="text-sm text-emerald-700 dark:text-emerald-300">Claim it now</p>
                  </div>
                </div>
                <UButton
                  color="primary"
                  size="lg"
                  block
                  :loading="rsvpLoading"
                  @click="handleClaimSpot"
                >
                  Claim This Spot
                </UButton>
              </div>

              <!-- Response Buttons -->
              <div v-else class="flex gap-2">
                <!-- I'm In / Join Waitlist -->
                <button
                  :class="[
                    'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all active:scale-95',
                    isFull
                      ? 'bg-violet-100 dark:bg-violet-900/30'
                      : selectedStatus === 'IN'
                        ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/30'
                        : 'bg-gray-50 dark:bg-gray-800/50',
                  ]"
                  @click="isFull ? handleJoinWaitlist() : selectStatus('IN')"
                >
                  <UIcon
                    :name="isFull ? 'i-heroicons-clock' : 'i-heroicons-check-circle'"
                    :class="['h-6 w-6', isFull ? 'text-violet-500' : selectedStatus === 'IN' ? 'text-emerald-500' : 'text-gray-400']"
                  />
                  <span :class="['text-xs font-medium', isFull ? 'text-violet-700 dark:text-violet-300' : selectedStatus === 'IN' ? 'text-emerald-700' : 'text-gray-600']">
                    {{ isFull ? 'Waitlist' : "I'm In" }}
                  </span>
                </button>

                <!-- Out -->
                <button
                  :class="[
                    'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all active:scale-95',
                    selectedStatus === 'OUT'
                      ? 'bg-red-100 ring-2 ring-red-500 dark:bg-red-900/30'
                      : 'bg-gray-50 dark:bg-gray-800/50',
                  ]"
                  @click="selectStatus('OUT')"
                >
                  <UIcon
                    name="i-heroicons-x-circle"
                    :class="['h-6 w-6', selectedStatus === 'OUT' ? 'text-red-500' : 'text-gray-400']"
                  />
                  <span :class="['text-xs font-medium', selectedStatus === 'OUT' ? 'text-red-700' : 'text-gray-600']">
                    Out
                  </span>
                </button>

                <!-- Maybe -->
                <button
                  :class="[
                    'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all active:scale-95',
                    selectedStatus === 'MAYBE'
                      ? 'bg-amber-100 ring-2 ring-amber-500 dark:bg-amber-900/30'
                      : 'bg-gray-50 dark:bg-gray-800/50',
                  ]"
                  @click="selectStatus('MAYBE')"
                >
                  <UIcon
                    name="i-heroicons-question-mark-circle"
                    :class="['h-6 w-6', selectedStatus === 'MAYBE' ? 'text-amber-500' : 'text-gray-400']"
                  />
                  <span :class="['text-xs font-medium', selectedStatus === 'MAYBE' ? 'text-amber-700' : 'text-gray-600']">
                    Maybe
                  </span>
                </button>
              </div>
            </div>

            <!-- Attendees Preview -->
            <div v-if="rsvpsIn.length > 0" class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-900 dark:text-white">Who's In</h3>
                <span class="text-sm text-gray-500">{{ rsvpsIn.length }} confirmed</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="rsvp in rsvpsIn.slice(0, 8)"
                  :key="rsvp.id"
                  class="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full"
                >
                  <span class="w-5 h-5 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    {{ getInitials(rsvp.name) }}
                  </span>
                  <span class="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {{ rsvp.name.split(' ')[0] }}
                  </span>
                </div>
                <span v-if="rsvpsIn.length > 8" class="text-xs text-gray-400 self-center">
                  +{{ rsvpsIn.length - 8 }} more
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- View Full Details Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <UButton
            color="neutral"
            variant="soft"
            size="lg"
            block
            @click="viewFullDetails"
          >
            View Full Details
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Auth Modal -->
  <AuthModal
    v-model:open="showAuthModal"
    @authenticated="submitPendingRsvp"
  />

  <!-- Drop Out Modal -->
  <UModal v-model:open="showDropOutModal">
    <template #body>
      <div class="text-center py-2">
        <div class="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-arrow-right-start-on-rectangle" class="w-8 h-8 text-red-500" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Drop out?</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">
          Let the group know so someone else can take your spot.
        </p>
        <div class="space-y-3">
          <UButton
            color="error"
            size="lg"
            block
            :loading="droppingOut"
            @click="handleDropOut"
          >
            Drop Out
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="lg"
            block
            @click="showDropOutModal = false"
          >
            Cancel
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
