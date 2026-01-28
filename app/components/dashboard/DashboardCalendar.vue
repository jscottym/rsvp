<script setup lang="ts">
type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

interface DashboardEvent {
  datetime: string
  isOrganizer: boolean
  userRsvpStatus: RsvpStatus | null
}

interface Props {
  events: DashboardEvent[]
  selectedDate: Date | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'select', date: Date | null): void
}>()

interface CalendarDay {
  date: Date
  dayNum: number
  dayName: string
  monthName: string
  isToday: boolean
  isSelected: boolean
  isPast: boolean
  isFirstOfMonth: boolean
  indicators: {
    in: number
    maybe: number
    waitlist: number
    organizing: number
  }
}

const calendarDays = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: CalendarDay[] = []
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Start from beginning of current week (Sunday)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - today.getDay())

  // Generate 28 days (4 weeks)
  for (let i = 0; i < 28; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    date.setHours(0, 0, 0, 0)

    const dayOfWeek = date.getDay()
    const isFirstOfMonth = date.getDate() === 1

    // Count events for this day
    const indicators = { in: 0, maybe: 0, waitlist: 0, organizing: 0 }
    for (const event of props.events) {
      const eventDate = new Date(event.datetime)
      eventDate.setHours(0, 0, 0, 0)

      if (eventDate.getTime() === date.getTime()) {
        if (event.isOrganizer) {
          indicators.organizing++
        } else if (event.userRsvpStatus === 'IN') {
          indicators.in++
        } else if (event.userRsvpStatus === 'MAYBE' || event.userRsvpStatus === 'IN_IF') {
          indicators.maybe++
        } else if (event.userRsvpStatus === 'WAITLIST') {
          indicators.waitlist++
        }
      }
    }

    const isSelected = props.selectedDate
      ? date.getTime() === new Date(props.selectedDate).setHours(0, 0, 0, 0)
      : false

    days.push({
      date,
      dayNum: date.getDate(),
      dayName: dayNames[dayOfWeek]!,
      monthName: monthNames[date.getMonth()]!,
      isToday: date.getTime() === today.getTime(),
      isSelected,
      isPast: date.getTime() < today.getTime(),
      isFirstOfMonth,
      indicators
    })
  }

  return days
})

// Get the month name for display
const displayMonth = computed(() => {
  const today = new Date()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return monthNames[today.getMonth()]
})

function selectDay(day: CalendarDay) {
  if (day.isPast && !day.isToday) return

  // Toggle selection - if already selected, deselect
  if (day.isSelected) {
    emit('select', null)
  } else {
    emit('select', day.date)
  }
}

function hasAnyEvents(day: CalendarDay) {
  const { indicators } = day
  return indicators.in > 0 || indicators.maybe > 0 || indicators.waitlist > 0 || indicators.organizing > 0
}
</script>

<template>
  <div class="relative">
    <!-- Month header -->
    <div class="px-4 mb-2">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ displayMonth }}</p>
    </div>

    <!-- Calendar strip -->
    <div class="relative -mx-4">
      <!-- Fade edges -->
      <div class="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none"></div>
      <div class="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent z-10 pointer-events-none"></div>

      <!-- Scrollable days -->
      <div class="flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
        <button
          v-for="day in calendarDays"
          :key="day.date.toISOString()"
          @click="selectDay(day)"
          :disabled="day.isPast && !day.isToday"
          class="flex-shrink-0 flex flex-col items-center w-10 py-2 rounded-xl transition-all duration-200 snap-start"
          :class="[
            day.isSelected
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
              : day.isToday
                ? 'bg-gray-200 dark:bg-gray-700'
                : day.isPast
                  ? 'opacity-40'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95'
          ]"
        >
          <!-- Day name -->
          <span
            class="text-[10px] font-medium leading-tight"
            :class="[
              day.isSelected
                ? 'text-white/80'
                : day.isToday
                  ? 'text-gray-600 dark:text-gray-300'
                  : 'text-gray-500 dark:text-gray-400'
            ]"
          >
            {{ day.dayName }}
          </span>

          <!-- Day number -->
          <span
            class="text-sm font-semibold leading-tight"
            :class="[
              day.isSelected
                ? 'text-white'
                : day.isToday
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
            ]"
          >
            {{ day.dayNum }}
          </span>

          <!-- Month indicator for first of month -->
          <span
            v-if="day.isFirstOfMonth && !day.isSelected"
            class="text-[8px] font-medium text-primary-500 leading-tight"
          >
            {{ day.monthName }}
          </span>

          <!-- Event indicators (dots) -->
          <div v-if="hasAnyEvents(day) && !day.isFirstOfMonth" class="flex gap-0.5 mt-0.5">
            <!-- Organizing dot (crown-like) -->
            <span
              v-if="day.indicators.organizing > 0"
              class="w-1.5 h-1.5 rounded-full"
              :class="day.isSelected ? 'bg-white/80' : 'bg-amber-500'"
            ></span>
            <!-- In dot -->
            <span
              v-if="day.indicators.in > 0"
              class="w-1.5 h-1.5 rounded-full"
              :class="day.isSelected ? 'bg-white/80' : 'bg-emerald-500'"
            ></span>
            <!-- Maybe dot -->
            <span
              v-if="day.indicators.maybe > 0"
              class="w-1.5 h-1.5 rounded-full"
              :class="day.isSelected ? 'bg-white/80' : 'bg-amber-400'"
            ></span>
            <!-- Waitlist dot -->
            <span
              v-if="day.indicators.waitlist > 0"
              class="w-1.5 h-1.5 rounded-full"
              :class="day.isSelected ? 'bg-white/80' : 'bg-violet-500'"
            ></span>
          </div>
          <div v-else-if="!day.isFirstOfMonth" class="h-2 mt-0.5"></div>
        </button>
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
</style>
