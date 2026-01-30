<script setup lang="ts">
interface EventFormData {
  date: string;
  startTime: string;
  duration: number;
  maxPlayers: number;
  location: string;
  description: string;
  allowSharing: boolean;
  timezone: string;
}

const props = defineProps<{
  initialData?: Partial<EventFormData>;
  submitLabel?: string;
  submitting?: boolean;
  inline?: boolean; // When true, button is inline (for slideover); when false, fixed at bottom (for full page)
}>();

const emit = defineEmits<{
  submit: [data: EventFormData];
  cancel: [];
}>();

// Player count options
const playerCounts = [
  { value: 4, label: 'doubles' },
  { value: 8, label: 'rotate' },
  { value: 12, label: 'party' },
];

// Format date as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string as local date (not UTC)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Generate next 15 days
const nextDays = computed(() => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    days.push({
      value: formatLocalDate(date),
      dayName:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tmrw'
            : date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    });
  }

  return days;
});

// Duration options
const durationOptions = [
  { value: 90, label: '1.5 hrs' },
  { value: 120, label: '2 hrs' },
  { value: 150, label: '2.5 hrs' },
  { value: 180, label: '3 hrs' },
];

// Start time slots: 5:30 AM to 9:00 PM (:00 and :30 intervals)
const startTimeSlots = computed(() => {
  const slots: { value: string; label: string }[] = [];

  // 5:30 AM
  slots.push({ value: '05:30', label: '5:30 AM' });

  // 6:00 AM to 9:00 PM at :00 and :30
  for (let h = 6; h <= 21; h++) {
    const hour12 = h === 12 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h >= 12 ? 'PM' : 'AM';

    slots.push({
      value: `${h.toString().padStart(2, '0')}:00`,
      label: `${hour12} ${suffix}`,
    });

    if (h < 21) {
      slots.push({
        value: `${h.toString().padStart(2, '0')}:30`,
        label: `${hour12}:30 ${suffix}`,
      });
    }
  }

  return slots;
});

// Auto-detect browser timezone
const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Form with smart defaults for pickleball
const form = reactive<EventFormData>({
  date: props.initialData?.date || nextDays.value[0]?.value || '',
  startTime: props.initialData?.startTime || '06:00',
  duration: props.initialData?.duration || 120,
  maxPlayers: props.initialData?.maxPlayers || 4,
  location: props.initialData?.location || '',
  description: props.initialData?.description || '',
  allowSharing: props.initialData?.allowSharing ?? true,
  timezone: props.initialData?.timezone || detectedTimezone || 'America/Denver',
});

// Watch for initialData changes (for edit mode)
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      if (newData.date) form.date = newData.date;
      if (newData.startTime) form.startTime = newData.startTime;
      if (newData.duration) form.duration = newData.duration;
      if (newData.maxPlayers) form.maxPlayers = newData.maxPlayers;
      if (newData.location) form.location = newData.location;
      if (newData.description !== undefined)
        form.description = newData.description;
      if (newData.allowSharing !== undefined)
        form.allowSharing = newData.allowSharing;
      if (newData.timezone) form.timezone = newData.timezone;
    }
  },
  { deep: true }
);

// Computed end time based on start + duration
const endTime = computed(() => {
  const [h, m] = form.startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + form.duration;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
});

// Format time range for summary (e.g., "8-10am" or "11am-12:30pm")
function formatTimeRangeSummary(start: string, end: string): string {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startHour12 = startH === 0 ? 12 : startH > 12 ? startH - 12 : startH;
  const endHour12 = endH === 0 ? 12 : endH > 12 ? endH - 12 : endH;
  const startSuffix = startH >= 12 ? 'pm' : 'am';
  const endSuffix = endH >= 12 ? 'pm' : 'am';

  if (startSuffix === endSuffix) {
    const startStr =
      startM === 0
        ? `${startHour12}`
        : `${startHour12}:${startM.toString().padStart(2, '0')}`;
    const endStr =
      endM === 0
        ? `${endHour12}${endSuffix}`
        : `${endHour12}:${endM.toString().padStart(2, '0')}${endSuffix}`;
    return `${startStr}-${endStr}`;
  } else {
    const startStr =
      startM === 0
        ? `${startHour12}${startSuffix}`
        : `${startHour12}:${startM.toString().padStart(2, '0')}${startSuffix}`;
    const endStr =
      endM === 0
        ? `${endHour12}${endSuffix}`
        : `${endHour12}:${endM.toString().padStart(2, '0')}${endSuffix}`;
    return `${startStr}-${endStr}`;
  }
}

// Abbreviate location
function abbreviateLocation(loc: string): string {
  return loc
    .replace(/\s*-\s*/g, ' ')
    .replace(/\bCourt\b/gi, 'C')
    .replace(/\s+/g, ' ')
    .trim();
}

// Format date for display (abbreviated)
function formatDateDisplay(dateString: string): string {
  const date = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tmrw';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
}

// Event details summary for button
const eventDetailsSummary = computed(() => {
  if (!isValid.value) return '';

  const locationStr = abbreviateLocation(form.location);
  const dateStr = formatDateDisplay(form.date);
  const timeStr = formatTimeRangeSummary(form.startTime, endTime.value);

  return `${locationStr} • ${dateStr} ${timeStr}`;
});

const isValid = computed(() => {
  return !!(form.date && form.startTime && form.location.trim());
});

function handleSubmit() {
  if (!isValid.value) return;
  emit('submit', { ...form });
}

// Expose form data and validation for parent components
defineExpose({
  form,
  isValid,
  endTime,
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex-1 overflow-y-auto"
      :class="{ 'pb-24': !inline, 'pb-4': inline }"
    >
      <!-- Location -->
      <section class="mb-6">
        <label
          class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block"
          >Where</label
        >
        <div class="relative">
          <UInput
            v-model="form.location"
            placeholder="Picklr Lehi"
            size="xl"
            icon="i-heroicons-map-pin"
            class="w-full"
            :ui="{
              base: 'rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm',
            }"
            autofocus
          />
        </div>
      </section>

      <!-- Date Selection -->
      <section class="mb-8">
        <label
          class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block"
          >When</label
        >
        <div class="relative -mx-4">
          <div class="scroll-fade-left"></div>
          <div class="scroll-fade-right"></div>
          <div class="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
            <button
              v-for="day in nextDays"
              :key="day.value"
              @click="form.date = day.value"
              class="flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-all duration-200 active:scale-95"
              :class="[
                form.date === day.value
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                  : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700',
              ]"
            >
              <span
                class="text-xs font-medium"
                :class="
                  form.date === day.value ? 'text-emerald-100' : 'text-gray-500'
                "
              >
                {{ day.dayName }}
              </span>
              <span
                class="text-2xl font-bold"
                :class="
                  form.date === day.value
                    ? 'text-white'
                    : 'text-gray-900 dark:text-white'
                "
              >
                {{ day.dayNum }}
              </span>
              <span
                class="text-xs"
                :class="
                  form.date === day.value ? 'text-emerald-100' : 'text-gray-500'
                "
              >
                {{ day.month }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Start Time Selection -->
      <section class="mb-6">
        <label
          class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block"
          >Start Time</label
        >
        <div class="relative -mx-4">
          <div class="scroll-fade-left"></div>
          <div class="scroll-fade-right"></div>
          <div class="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
            <button
              v-for="time in startTimeSlots"
              :key="time.value"
              @click="form.startTime = time.value"
              class="flex-shrink-0 py-3 px-4 rounded-xl text-center transition-all duration-200 active:scale-95"
              :class="[
                form.startTime === time.value
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                  : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700',
              ]"
            >
              <span
                class="text-sm font-semibold whitespace-nowrap"
                :class="
                  form.startTime === time.value
                    ? 'text-white'
                    : 'text-gray-900 dark:text-white'
                "
              >
                {{ time.label }}
              </span>
            </button>
          </div>
        </div>
      </section>

      <!-- Duration Selection -->
      <section class="mb-6">
        <label
          class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block"
          >Length</label
        >
        <div class="grid grid-cols-4 gap-2 pb-1">
          <button
            v-for="dur in durationOptions"
            :key="dur.value"
            @click="form.duration = dur.value"
            class="py-3 px-2 rounded-xl text-center transition-all duration-200 active:scale-95"
            :class="[
              form.duration === dur.value
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700',
            ]"
          >
            <span
              class="text-sm font-semibold"
              :class="
                form.duration === dur.value
                  ? 'text-white'
                  : 'text-gray-900 dark:text-white'
              "
            >
              {{ dur.label }}
            </span>
          </button>
        </div>
      </section>

      <!-- Player Count -->
      <section class="mb-8">
        <label
          class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block"
          >Players</label
        >
        <div class="grid grid-cols-3 gap-3 pb-2">
          <button
            v-for="count in playerCounts"
            :key="count.value"
            @click="form.maxPlayers = count.value"
            class="relative py-5 rounded-2xl text-center transition-all duration-200 active:scale-95"
            :class="[
              form.maxPlayers === count.value
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                : 'bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700',
            ]"
          >
            <span
              class="text-3xl font-bold block"
              :class="
                form.maxPlayers === count.value
                  ? 'text-white'
                  : 'text-gray-900 dark:text-white'
              "
            >
              {{ count.value }}
            </span>
          </button>
        </div>
      </section>
    </div>

    <!-- CTA Button -->
    <div
      :class="[
        inline
          ? 'mt-4 px-4'
          : 'fixed bottom-0 left-0 right-0 px-4 pb-6 bg-gradient-to-t from-gray-50 via-gray-50 dark:from-gray-950 dark:via-gray-950 to-transparent pt-8 z-40',
      ]"
    >
      <div :class="{ 'max-w-lg mx-auto': !inline }">
        <UButton
          size="xl"
          block
          :loading="submitting"
          :disabled="!isValid"
          :class="[
            inline
              ? 'h-14 text-lg font-bold rounded-xl'
              : 'h-20 flex flex-col items-center justify-center gap-1 text-xl font-bold rounded-2xl shadow-xl shadow-emerald-500/30',
          ]"
          class="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 active:scale-[0.98]"
          @click="handleSubmit"
        >
          <template v-if="inline">
            {{ submitLabel || 'Save Changes' }}
          </template>
          <template v-else>
            <span>{{
              submitLabel || `Create ${form.maxPlayers}-player Game`
            }}</span>
            <span v-if="isValid" class="text-sm font-normal opacity-90">{{
              eventDetailsSummary
            }}</span>
          </template>
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scroll-fade-left,
.scroll-fade-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1rem;
  pointer-events: none;
  z-index: 10;
}

.scroll-fade-left {
  left: 0;
  background: linear-gradient(to right, rgb(249 250 251) 0%, transparent 100%);
}

.scroll-fade-right {
  right: 0;
  background: linear-gradient(to left, rgb(249 250 251) 0%, transparent 100%);
}

.dark .scroll-fade-left {
  background: linear-gradient(to right, rgb(3 7 18) 0%, transparent 100%);
}

.dark .scroll-fade-right {
  background: linear-gradient(to left, rgb(3 7 18) 0%, transparent 100%);
}
</style>
