<script setup lang="ts">
type ScheduleType = 'NONE' | 'DAY_BEFORE' | 'HOURS_BEFORE';

interface Recipient {
  name: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt: string | null;
}

interface Reminder {
  id: string;
  scheduleType: ScheduleType;
  hoursBeforeValue?: number;
  scheduledFor: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED' | 'CANCELLED';
  processedAt?: string | null;
  recipients?: Recipient[];
}

interface Props {
  slug: string;
  eventDatetime: string;
  eventTimezone: string;
  isOrganizer: boolean;
  confirmedCount: number;
}

const props = defineProps<Props>();

const authStore = useAuthStore();
const toast = useToast();

const reminder = ref<Reminder | null>(null);
const loading = ref(false);
const saving = ref(false);
const expanded = ref(false);

// Local state for selection
const selectedType = ref<ScheduleType>('DAY_BEFORE');
const hoursValue = ref(2);

const scheduleOptions: Array<{ value: ScheduleType; label: string; description: string }> = [
  { value: 'NONE', label: 'No Reminder', description: 'Don\'t send a reminder' },
  { value: 'DAY_BEFORE', label: 'Night Before', description: '6 PM day before' },
  { value: 'HOURS_BEFORE', label: 'Hours Before', description: 'Choose time' },
];

const hoursOptions = [1, 2, 3, 4];

async function fetchReminder() {
  loading.value = true;
  try {
    const token = await authStore.getIdToken();
    const response = await $fetch<{ reminder: Reminder | null }>(`/api/events/${props.slug}/notifications`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    reminder.value = response.reminder;

    // Sync local state with fetched data
    if (response.reminder) {
      selectedType.value = response.reminder.scheduleType;
      if (response.reminder.hoursBeforeValue) {
        hoursValue.value = response.reminder.hoursBeforeValue;
      }
    } else {
      selectedType.value = 'NONE';
    }
  } catch (e) {
    console.error('Failed to fetch reminder:', e);
  } finally {
    loading.value = false;
  }
}

async function updateReminder(type: ScheduleType, hours?: number) {
  saving.value = true;
  try {
    const token = await authStore.getIdToken();
    const body: { scheduleType: ScheduleType; hoursBeforeValue?: number } = {
      scheduleType: type,
    };
    if (type === 'HOURS_BEFORE' && hours) {
      body.hoursBeforeValue = hours;
    }

    const response = await $fetch<{ reminder: Reminder | null }>(`/api/events/${props.slug}/notifications`, {
      method: 'PUT',
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    reminder.value = response.reminder;

    if (type === 'NONE') {
      toast.add({
        title: 'Reminder removed',
        color: 'neutral',
      });
    } else {
      toast.add({
        title: 'Reminder updated',
        description: `SMS will be sent ${formatScheduleDescription(type, hours)}`,
        color: 'success',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update reminder',
      color: 'error',
    });
    // Reset local state on error
    if (reminder.value) {
      selectedType.value = reminder.value.scheduleType;
      if (reminder.value.hoursBeforeValue) {
        hoursValue.value = reminder.value.hoursBeforeValue;
      }
    }
  } finally {
    saving.value = false;
  }
}

function selectScheduleType(type: ScheduleType) {
  if (!props.isOrganizer || isPastOrProcessed.value) return;

  selectedType.value = type;

  // For HOURS_BEFORE, don't save immediately - wait for hours selection
  if (type === 'HOURS_BEFORE') {
    return;
  }

  updateReminder(type);
}

function selectHours(hours: number) {
  if (!props.isOrganizer || isPastOrProcessed.value) return;

  hoursValue.value = hours;
  updateReminder('HOURS_BEFORE', hours);
}

function formatScheduleDescription(type: ScheduleType, hours?: number): string {
  switch (type) {
    case 'NONE':
      return '';
    case 'DAY_BEFORE':
      return 'at 6 PM the night before';
    case 'HOURS_BEFORE':
      return `${hours || hoursValue.value} hour${(hours || hoursValue.value) === 1 ? '' : 's'} before the event`;
    default:
      return '';
  }
}

function formatScheduledTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatSentTime(datetime: string | null): string {
  if (!datetime) return '';
  const date = new Date(datetime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const isPastOrProcessed = computed(() => {
  if (!reminder.value) return false;
  return reminder.value.status !== 'PENDING';
});

const isCompleted = computed(() => {
  return reminder.value?.status === 'COMPLETED' || reminder.value?.status === 'PARTIALLY_FAILED';
});

const sentCount = computed(() => {
  if (!reminder.value?.recipients) return 0;
  return reminder.value.recipients.filter(r => r.status === 'SENT' || r.status === 'DELIVERED').length;
});

const failedCount = computed(() => {
  if (!reminder.value?.recipients) return 0;
  return reminder.value.recipients.filter(r => r.status === 'FAILED').length;
});

onMounted(() => {
  fetchReminder();
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-3">
      <UIcon name="i-heroicons-bell" class="w-5 h-5 text-teal-500" />
      <h3 class="font-semibold text-gray-900 dark:text-white">SMS Reminder</h3>
      <UIcon
        v-if="saving"
        name="i-heroicons-arrow-path"
        class="w-4 h-4 text-gray-400 animate-spin ml-auto"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <!-- Completed state: Show "Reminder Sent" with expandable recipient list -->
    <div v-else-if="isCompleted && reminder">
      <button
        class="w-full flex items-center gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 transition-colors hover:bg-teal-100 dark:hover:bg-teal-900/30"
        @click="expanded = !expanded"
      >
        <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-teal-500 flex-shrink-0" />
        <div class="flex-1 text-left">
          <span class="font-medium text-teal-700 dark:text-teal-300">
            Reminder Sent
          </span>
          <span class="text-sm text-teal-600 dark:text-teal-400 ml-1">
            · {{ formatScheduledTime(reminder.processedAt || reminder.scheduledFor) }}
          </span>
        </div>
        <UIcon
          :name="expanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
          class="w-5 h-5 text-teal-500 flex-shrink-0"
        />
      </button>

      <!-- Expandable recipient list -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-96"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-96"
        leave-to-class="opacity-0 max-h-0"
      >
        <div v-if="expanded && reminder.recipients" class="mt-2 overflow-hidden">
          <div class="space-y-1 pt-2 border-t border-teal-100 dark:border-teal-800">
            <div
              v-for="(recipient, idx) in reminder.recipients"
              :key="idx"
              class="flex items-center gap-2 py-1.5 px-1 text-sm"
            >
              <UIcon
                :name="recipient.status === 'FAILED' ? 'i-heroicons-x-mark' : 'i-heroicons-check'"
                :class="[
                  'w-4 h-4 flex-shrink-0',
                  recipient.status === 'FAILED' ? 'text-red-500' : 'text-teal-500'
                ]"
              />
              <span class="flex-1 text-gray-700 dark:text-gray-300 truncate">
                {{ recipient.name }}
              </span>
              <span class="text-xs text-gray-400 flex-shrink-0">
                {{ recipient.status === 'FAILED' ? 'Failed' : formatSentTime(recipient.sentAt) }}
              </span>
            </div>
          </div>

          <!-- Summary -->
          <div v-if="failedCount > 0" class="mt-2 pt-2 border-t border-teal-100 dark:border-teal-800">
            <p class="text-xs text-gray-500">
              {{ sentCount }} sent, {{ failedCount }} failed
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Pending/No reminder state -->
    <template v-else>
      <!-- Organizer: Editable options -->
      <div v-if="isOrganizer" class="space-y-3">
        <!-- Schedule type pills -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <button
            v-for="option in scheduleOptions"
            :key="option.value"
            class="flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
            :class="[
              selectedType === option.value
                ? option.value === 'NONE'
                  ? 'bg-gray-500 text-white shadow-lg shadow-gray-500/30'
                  : 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              isPastOrProcessed && 'opacity-50 cursor-not-allowed',
            ]"
            :disabled="isPastOrProcessed || saving"
            @click="selectScheduleType(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- Hours selector (when HOURS_BEFORE selected) -->
        <div v-if="selectedType === 'HOURS_BEFORE'" class="space-y-2">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            How long before
          </p>
          <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            <button
              v-for="hours in hoursOptions"
              :key="hours"
              class="flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
              :class="[
                hoursValue === hours
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
                isPastOrProcessed && 'opacity-50 cursor-not-allowed',
              ]"
              :disabled="isPastOrProcessed || saving"
              @click="selectHours(hours)"
            >
              {{ hours }} {{ hours === 1 ? 'hour' : 'hours' }}
            </button>
          </div>
        </div>

        <!-- Preview/info when a reminder is set -->
        <div v-if="reminder && selectedType !== 'NONE'" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-1">
          <UIcon name="i-heroicons-clock" class="w-4 h-4" />
          <span>{{ formatScheduledTime(reminder.scheduledFor) }}</span>
          <span class="text-gray-400">·</span>
          <span>{{ confirmedCount }} {{ confirmedCount === 1 ? 'player' : 'players' }}</span>
        </div>
      </div>

      <!-- Non-organizer: View only -->
      <div v-else class="text-sm">
        <div v-if="reminder" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <UIcon name="i-heroicons-clock" class="w-4 h-4 text-teal-500" />
          <span>
            Reminder set for {{ formatScheduledTime(reminder.scheduledFor) }}
          </span>
        </div>
        <div v-else class="text-gray-500 dark:text-gray-400">
          No reminder set for this event
        </div>
      </div>
    </template>
  </div>
</template>
