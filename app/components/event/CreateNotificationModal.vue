<script setup lang="ts">
interface Props {
  eventDatetime: string;
  confirmedCount: number;
}

const props = defineProps<Props>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{
  (e: 'create', data: { scheduleType: string; relativeMinutes?: number }): void;
}>();

type ScheduleType = 'DAY_BEFORE' | 'MORNING_OF' | 'MINUTES_BEFORE';

const scheduleType = ref<ScheduleType>('DAY_BEFORE');
const relativeMinutes = ref(60); // Default 1 hour

const minutesOptions = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

const scheduleOptions = [
  {
    value: 'DAY_BEFORE' as ScheduleType,
    label: 'Day Before',
    description: '6 PM the day before',
    icon: 'i-heroicons-calendar',
  },
  {
    value: 'MORNING_OF' as ScheduleType,
    label: 'Morning Of',
    description: '9 AM event day',
    icon: 'i-heroicons-sun',
  },
  {
    value: 'MINUTES_BEFORE' as ScheduleType,
    label: 'Before Event',
    description: 'Choose time before',
    icon: 'i-heroicons-clock',
  },
];

function calculateSendTime(): Date {
  const eventDate = new Date(props.eventDatetime);

  switch (scheduleType.value) {
    case 'DAY_BEFORE': {
      const dayBefore = new Date(eventDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(18, 0, 0, 0);
      return dayBefore;
    }
    case 'MORNING_OF': {
      const morningOf = new Date(eventDate);
      morningOf.setHours(9, 0, 0, 0);
      return morningOf;
    }
    case 'MINUTES_BEFORE': {
      const before = new Date(eventDate);
      before.setMinutes(before.getMinutes() - relativeMinutes.value);
      return before;
    }
    default:
      return eventDate;
  }
}

const scheduledTime = computed(() => calculateSendTime());

const isScheduleValid = computed(() => {
  const sendTime = calculateSendTime();
  const now = new Date();
  const eventDate = new Date(props.eventDatetime);

  return sendTime > now && sendTime < eventDate;
});

const scheduleError = computed(() => {
  const sendTime = calculateSendTime();
  const now = new Date();
  const eventDate = new Date(props.eventDatetime);

  if (sendTime <= now) {
    return 'This time has already passed';
  }
  if (sendTime >= eventDate) {
    return 'Must be before the event starts';
  }
  return null;
});

function formatScheduledTime(date: Date): string {
  const dayStr = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dayStr} at ${timeStr}`;
}

function handleCreate() {
  if (!isScheduleValid.value) return;

  emit('create', {
    scheduleType: scheduleType.value,
    relativeMinutes:
      scheduleType.value === 'MINUTES_BEFORE' ? relativeMinutes.value : undefined,
  });
}

// Reset when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    scheduleType.value = 'DAY_BEFORE';
    relativeMinutes.value = 60;
  }
});
</script>

<template>
  <UModal v-model:open="open" :ui="{ width: 'sm:max-w-md' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-bell"
            class="w-5 h-5 text-blue-600 dark:text-blue-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Schedule SMS Reminder
          </h3>
          <p class="text-sm text-gray-500">Send to {{ confirmedCount }} confirmed players</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <!-- Schedule Type Selection -->
        <div>
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide"
          >
            When to send
          </p>
          <div class="space-y-2">
            <button
              v-for="option in scheduleOptions"
              :key="option.value"
              class="w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
              :class="[
                scheduleType === option.value
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                  : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800',
              ]"
              @click="scheduleType = option.value"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                :class="[
                  scheduleType === option.value
                    ? 'bg-blue-100 dark:bg-blue-800'
                    : 'bg-gray-200 dark:bg-gray-700',
                ]"
              >
                <UIcon
                  :name="option.icon"
                  class="w-5 h-5"
                  :class="[
                    scheduleType === option.value
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400',
                  ]"
                />
              </div>
              <div class="flex-1 text-left">
                <p
                  class="font-medium"
                  :class="[
                    scheduleType === option.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-900 dark:text-white',
                  ]"
                >
                  {{ option.label }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ option.description }}
                </p>
              </div>
              <div
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="[
                  scheduleType === option.value
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 dark:border-gray-600',
                ]"
              >
                <UIcon
                  v-if="scheduleType === option.value"
                  name="i-heroicons-check"
                  class="w-3 h-3 text-white"
                />
              </div>
            </button>
          </div>
        </div>

        <!-- Minutes selector (only for MINUTES_BEFORE) -->
        <div v-if="scheduleType === 'MINUTES_BEFORE'">
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide"
          >
            How long before
          </p>
          <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              v-for="option in minutesOptions"
              :key="option.value"
              class="flex-shrink-0 px-4 py-2.5 rounded-xl font-medium text-sm transition-all active:scale-95"
              :class="[
                relativeMinutes === option.value
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              ]"
              @click="relativeMinutes = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div>
          <p
            class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide"
          >
            Send time
          </p>
          <div
            class="p-4 rounded-xl"
            :class="[
              isScheduleValid
                ? 'bg-teal-50 dark:bg-teal-900/20'
                : 'bg-red-50 dark:bg-red-900/20',
            ]"
          >
            <div class="flex items-center gap-2">
              <UIcon
                :name="isScheduleValid ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-circle'"
                class="w-5 h-5"
                :class="[
                  isScheduleValid
                    ? 'text-teal-500'
                    : 'text-red-500',
                ]"
              />
              <span
                class="font-medium"
                :class="[
                  isScheduleValid
                    ? 'text-teal-700 dark:text-teal-300'
                    : 'text-red-700 dark:text-red-300',
                ]"
              >
                {{ isScheduleValid ? formatScheduledTime(scheduledTime) : scheduleError }}
              </span>
            </div>
            <p v-if="isScheduleValid" class="text-sm text-teal-600 dark:text-teal-400 mt-1 ml-7">
              Will send to {{ confirmedCount }} {{ confirmedCount === 1 ? 'player' : 'players' }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="soft"
          class="flex-1"
          size="lg"
          label="Cancel"
          @click="open = false"
        />
        <UButton
          color="primary"
          class="flex-1"
          size="lg"
          icon="i-heroicons-bell"
          label="Schedule"
          :disabled="!isScheduleValid"
          @click="handleCreate"
        />
      </div>
    </template>
  </UModal>
</template>
