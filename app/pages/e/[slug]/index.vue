<script setup lang="ts">
type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

const route = useRoute()
const eventsStore = useEventsStore()
const authStore = useAuthStore()
const toast = useToast()

const slug = computed(() => route.params.slug as string)
const showAuthModal = ref(false)
const pendingRsvpStatus = ref<RsvpStatus | null>(null)
const rsvpLoading = ref(false)
const comment = ref('')
const selectedStatus = ref<RsvpStatus | null>(null)
const showDropOutModal = ref(false)
const droppingOut = ref(false)
const showSavedIndicator = ref(false)
const savedAnimationKey = ref(0)
const activeResponseTab = ref('in')
const isEditingNote = ref(false)
const noteInputRef = ref<HTMLInputElement | null>(null)

const { data: eventData, pending, error } = await useAsyncData(
  `event-${slug.value}`,
  () => eventsStore.fetchEvent(slug.value),
  { watch: [slug] }
)

const event = computed(() => eventsStore.currentEvent)

// Initialize from existing RSVP
watch(event, (e) => {
  if (e?.userRsvp) {
    selectedStatus.value = e.userRsvp.status
    comment.value = e.userRsvp.comment || ''
  }
}, { immediate: true })

const rsvpsIn = computed(() => event.value?.rsvps?.filter(r => r.status === 'IN') || [])
const rsvpsOut = computed(() => event.value?.rsvps?.filter(r => r.status === 'OUT') || [])
const rsvpsMaybe = computed(() => event.value?.rsvps?.filter(r => r.status === 'MAYBE' || r.status === 'IN_IF') || [])
const rsvpsWaitlist = computed(() => event.value?.rsvps?.filter(r => r.status === 'WAITLIST') || [])

// Active list based on tab
const activeRsvpList = computed(() => {
  switch (activeResponseTab.value) {
    case 'in': return rsvpsIn.value
    case 'out': return rsvpsOut.value
    case 'maybe': return rsvpsMaybe.value
    case 'waitlist': return rsvpsWaitlist.value
    default: return rsvpsIn.value
  }
})

const activeTabColor = computed(() => {
  switch (activeResponseTab.value) {
    case 'in': return 'emerald'
    case 'out': return 'red'
    case 'maybe': return 'amber'
    case 'waitlist': return 'violet'
    default: return 'emerald'
  }
})

const responseTabs = computed(() => {
  const tabs = [
    { label: 'In', value: 'in', badge: {
      label: rsvpsIn.value.length, variant: 'soft' as const, color: 'primary' as const } },
    { label: 'Out', value: 'out', badge: {
      label: rsvpsOut.value.length, variant: 'soft' as const, color: 'error' as const } },
    { label: 'Maybe', value: 'maybe', badge: {
      label: rsvpsMaybe.value.length, variant: 'soft' as const, color: 'warning' as const } }
  ]
  if (rsvpsWaitlist.value.length > 0) {
    tabs.push({ label: 'Waitlist', value: 'waitlist', badge: {
      label: rsvpsWaitlist.value.length, variant: 'soft' as const, color: 'primary' as const } })
  }
  return tabs
})

const isFull = computed(() => {
  if (!event.value) return false
  return (event.value.rsvpCount ?? 0) >= event.value.maxPlayers
})

const isConfirmed = computed(() => event.value?.userRsvp?.status === 'IN')
const isOnWaitlist = computed(() => event.value?.userRsvp?.status === 'WAITLIST')
const hasWaitlist = computed(() => (event.value?.waitlistCount ?? 0) > 0)

// Grace period: if user RSVP'd within last 60 seconds and no waitlist, they can silently drop out
const isWithinGracePeriod = computed(() => {
  if (!event.value?.userRsvp?.updatedAt) return false
  const updatedAt = new Date(event.value.userRsvp.updatedAt).getTime()
  const now = Date.now()
  return (now - updatedAt) < 60000
})

const canSilentDropOut = computed(() => isWithinGracePeriod.value && !hasWaitlist.value)
const spotOpenedUp = computed(() => isOnWaitlist.value && !isFull.value)

const canSubmit = computed(() => {
  if (!selectedStatus.value) return false
  if (selectedStatus.value === 'IN_IF' && !comment.value.trim()) return false
  return true
})

async function selectStatus(status: RsvpStatus) {
  const previousStatus = selectedStatus.value
  selectedStatus.value = status

  if (status !== 'IN_IF') {
    await autoSave()
  } else if (previousStatus !== 'IN_IF' && comment.value.trim()) {
    await autoSave()
  }
}

async function autoSave() {
  if (!selectedStatus.value) return
  if (selectedStatus.value === 'IN_IF' && !comment.value.trim()) return

  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = selectedStatus.value
    showAuthModal.value = true
    return
  }

  await submitRsvp(true)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = selectedStatus.value
    showAuthModal.value = true
    return
  }

  await submitRsvp()
}

async function submitPendingRsvp() {
  if (pendingRsvpStatus.value) {
    selectedStatus.value = pendingRsvpStatus.value
    await submitRsvp()
    pendingRsvpStatus.value = null
  }
}

async function submitRsvp(isAutoSave = false) {
  if (!selectedStatus.value) return
  rsvpLoading.value = true

  try {
    await eventsStore.submitRsvp(slug.value, selectedStatus.value, comment.value || undefined)

    if (isAutoSave) {
      showSavedIndicator.value = true
      savedAnimationKey.value++
    } else {
      const messages: Record<RsvpStatus, { title: string; description: string }> = {
        IN: { title: "You're in!", description: 'See you there!' },
        OUT: { title: 'Got it', description: "We'll miss you!" },
        MAYBE: { title: 'Response saved', description: "We'll hope to see you!" },
        IN_IF: { title: 'Response saved', description: 'Fingers crossed!' },
        WAITLIST: { title: "You're on the waitlist!", description: "We'll let you know if a spot opens." }
      }

      toast.add({
        title: messages[selectedStatus.value].title,
        description: messages[selectedStatus.value].description,
        color: 'success'
      })
    }
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

async function handleJoinWaitlist() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'WAITLIST'
    showAuthModal.value = true
    return
  }

  selectedStatus.value = 'WAITLIST'
  await submitRsvp()
}

async function handleDropOut(sendNotification: boolean) {
  droppingOut.value = true

  try {
    let smsUrl: string | null = null
    if (sendNotification) {
      try {
        const data = await eventsStore.getDropOutMessageData(slug.value)
        if (data.phones.length > 0) {
          smsUrl = data.smsUrl
        }
      } catch (e) {
        console.error('Failed to get drop out message:', e)
      }
    }

    await eventsStore.submitRsvp(slug.value, 'OUT')
    selectedStatus.value = 'OUT'

    toast.add({
      title: 'Dropped out',
      description: "You've been removed from the confirmed list",
      color: 'success'
    })

    if (smsUrl) {
      window.open(smsUrl, '_blank')
    }

    showDropOutModal.value = false
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to drop out',
      color: 'error'
    })
  } finally {
    droppingOut.value = false
  }
}

async function handleSilentDropOut() {
  droppingOut.value = true
  try {
    await eventsStore.submitRsvp(slug.value, 'OUT')
    selectedStatus.value = 'OUT'
    toast.add({
      title: 'Dropped out',
      description: "You've been removed from the confirmed list",
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to drop out',
      color: 'error'
    })
  } finally {
    droppingOut.value = false
  }
}

async function handleClaimSpot() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'IN'
    showAuthModal.value = true
    return
  }

  rsvpLoading.value = true
  try {
    await eventsStore.submitRsvp(slug.value, 'IN')
    selectedStatus.value = 'IN'
    toast.add({
      title: "You're in!",
      description: 'You claimed the spot!',
      color: 'success'
    })
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to claim spot',
      color: 'error'
    })
  } finally {
    rsvpLoading.value = false
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function startEditingNote() {
  isEditingNote.value = true
  nextTick(() => {
    noteInputRef.value?.focus()
  })
}

function saveNote() {
  isEditingNote.value = false
  if (comment.value !== (event.value?.userRsvp?.comment || '')) {
    autoSave()
  }
}

function handleNoteKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveNote()
  }
  if (e.key === 'Escape') {
    isEditingNote.value = false
    comment.value = event.value?.userRsvp?.comment || ''
  }
}

const hasUnsavedNote = computed(() => {
  return comment.value !== (event.value?.userRsvp?.comment || '')
})

function formatTime(datetime: string, endDatetime?: string) {
  const start = new Date(datetime)
  const startHour = start.getHours()
  const startMinute = start.getMinutes()
  const startPeriod = startHour >= 12 ? 'pm' : 'am'
  const startHour12 = startHour % 12 || 12
  const startTimeStr = startMinute === 0 ? `${startHour12}` : `${startHour12}:${startMinute.toString().padStart(2, '0')}`

  if (endDatetime) {
    const end = new Date(endDatetime)
    const endHour = end.getHours()
    const endMinute = end.getMinutes()
    const endPeriod = endHour >= 12 ? 'pm' : 'am'
    const endHour12 = endHour % 12 || 12
    const endTimeStr = endMinute === 0 ? `${endHour12}` : `${endHour12}:${endMinute.toString().padStart(2, '0')}`

    if (startPeriod === endPeriod) {
      return `${startTimeStr}-${endTimeStr}${endPeriod}`
    }
    return `${startTimeStr}${startPeriod}-${endTimeStr}${endPeriod}`
  }
  return `${startTimeStr}${startPeriod}`
}

function formatRelativeDay(datetime: string) {
  const eventDate = new Date(datetime)
  eventDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' })

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1 && diffDays <= 7) return `This ${dayName}`
  if (diffDays > 7 && diffDays <= 14) return `Next ${dayName}`
  return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface CalendarDay {
  date: Date
  dayNum: number
  dayName: string
  isToday: boolean
  isEventDay: boolean
  isWeekend: boolean
  isPast: boolean
}

const weekCalendar = computed(() => {
  if (!event.value) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(event.value.datetime)
  eventDate.setHours(0, 0, 0, 0)

  // Get Sunday of this week (week starts on Sunday)
  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - today.getDay())

  // Get Sunday of next week
  const nextSunday = new Date(thisSunday)
  nextSunday.setDate(thisSunday.getDate() + 7)

  // Get Sunday of event's week
  const eventSunday = new Date(eventDate)
  eventSunday.setDate(eventDate.getDate() - eventDate.getDay())

  function generateWeek(sunday: Date, weekLabel: string): { label: string; days: CalendarDay[] } {
    const days: CalendarDay[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + i)
      const dayOfWeek = date.getDay()
      days.push({
        date,
        dayNum: date.getDate(),
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        isToday: date.getTime() === today.getTime(),
        isEventDay: date.getTime() === eventDate.getTime(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isPast: date.getTime() < today.getTime()
      })
    }
    return { label: weekLabel, days }
  }

  const isThisWeek = eventSunday.getTime() === thisSunday.getTime()
  const isNextWeek = eventSunday.getTime() === nextSunday.getTime()

  if (isThisWeek) {
    return {
      showNextWeek: false,
      weeks: [generateWeek(thisSunday, 'This Week')]
    }
  } else if (isNextWeek) {
    return {
      showNextWeek: true,
      weeks: [
        generateWeek(thisSunday, 'This Week'),
        generateWeek(nextSunday, 'Next Week')
      ]
    }
  }

  // Event is further out - just show the event's week
  const eventWeekLabel = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return {
    showNextWeek: false,
    weeks: [generateWeek(eventSunday, `Week of ${eventWeekLabel}`)]
  }
})

useSeoMeta({
  title: () => event.value ? `${event.value.title} - RSVP` : 'Event - RSVP',
  description: () => event.value ? `Join ${event.value.title} at ${event.value.location}` : 'View event details'
})
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error -->
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
        class="mb-4"
        icon="i-heroicons-information-circle"
        :title="event.sharingNote"
      />

      <!-- Streamlined Header -->
      <div class="mb-6">
        <!-- Location and Time -->
        <p class="text-gray-600 dark:text-gray-400 mb-3 text-md flex justify-between items-center">
          <span class="font-bold text-gray-900 dark:text-white">{{ event.location }}</span>
          <span><span class="text-primary-500 font-medium">{{ formatRelativeDay(event.datetime) }}</span> · {{ formatTime(event.datetime, event.endDatetime) }}</span>
        </p>

        

        <p v-if="event.description" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {{ event.description }}
        </p>

        <!-- Week Calendar -->
        <div v-if="weekCalendar" class="mt-4">
          <div v-for="(week, weekIndex) in weekCalendar.weeks" :key="weekIndex" class="mb-2">
            <p v-if="weekCalendar.showNextWeek" class="text-xs text-gray-500 mb-1 font-medium">{{ week.label }}</p>
            <div class="flex gap-1">
              <div
                v-for="day in week.days"
                :key="day.dayNum"
                :class="[
                  'flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs transition-all',
                  day.isEventDay
                    ? 'bg-primary-500 text-white font-bold ring-2 ring-primary-300 ring-offset-1'
                    : day.isToday
                      ? 'bg-gray-300 dark:bg-gray-600 font-semibold'
                      : day.isWeekend
                        ? 'bg-gray-50 dark:bg-gray-800/40 text-gray-400'
                        : day.isPast
                          ? 'text-gray-400 dark:text-gray-600'
                          : 'text-gray-700 dark:text-gray-300'
                ]"
              >
                <span class="text-[10px] leading-tight" :class="day.isEventDay ? 'text-white/80' : ''">{{ day.dayName }}</span>
                <span class="text-sm leading-tight">{{ day.dayNum }}</span>
                <span v-if="day.isEventDay" class="text-[9px] leading-tight text-white/90 font-medium">Event</span>
                <span v-else-if="day.isToday" class="text-[9px] leading-tight text-primary-500 font-medium">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      <!-- Waitlist Status Section -->
      <div v-if="!event.isOrganizer && isOnWaitlist" class="mb-6">
        <div v-if="spotOpenedUp" class="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 border-2 border-emerald-500">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-emerald-600" />
            </div>
            <div class="flex-1">
              <p class="font-semibold text-emerald-900 dark:text-emerald-100">A spot opened up!</p>
              <p class="text-sm text-emerald-700 dark:text-emerald-300">Claim it before someone else does</p>
            </div>
          </div>
          <UButton color="primary" size="lg" block :loading="rsvpLoading" @click="handleClaimSpot">
            Claim This Spot
          </UButton>
        </div>
        <div v-else class="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 border-2 border-violet-500">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-violet-600" />
            </div>
            <div class="flex-1">
              <p class="font-semibold text-violet-900 dark:text-violet-100">You're on the waitlist</p>
              <p class="text-sm text-violet-700 dark:text-violet-300">We'll let you know if a spot opens</p>
            </div>
          </div>
        </div>
      </div>

      <!-- RSVP Section -->
      <div v-else-if="!event.isOrganizer && !isOnWaitlist" class="space-y-4 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isConfirmed ? "See you there!" : "Are you in?" }}
        </h2>

        <!-- Full Event - Join Waitlist -->
        <div v-if="isFull && !isConfirmed" class="space-y-3">
          <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-500" />
            <span class="text-sm text-amber-700 dark:text-amber-300">This event is full</span>
          </div>
          <button
            type="button"
            class="w-full relative p-5 rounded-2xl border-2 transition-all text-left border-violet-500 bg-violet-50 dark:bg-violet-900/20 hover:border-violet-600"
            @click="handleJoinWaitlist"
          >
            <UIcon name="i-heroicons-clock" class="w-8 h-8 mb-2 text-violet-500" />
            <p class="font-semibold text-violet-700 dark:text-violet-300">Join Waitlist</p>
            <p class="text-sm text-violet-600 dark:text-violet-400 mt-1">Get notified if a spot opens</p>
          </button>
          <p v-if="event.waitlistCount" class="text-center text-sm text-gray-500">
            {{ event.waitlistCount }} {{ event.waitlistCount === 1 ? 'person' : 'people' }} on waitlist
          </p>
        </div>

        <!-- Normal RSVP Buttons -->
        <template v-else>
          <div class="grid grid-cols-2 gap-3">
            <div
              :class="[
                'relative p-5 rounded-2xl border-2 transition-all text-left',
                selectedStatus === 'IN' || isConfirmed
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300',
                !isConfirmed && 'cursor-pointer'
              ]"
              @click="!isConfirmed && selectStatus('IN')"
            >
              <UIcon :name="isConfirmed ? 'i-heroicons-check-circle-solid' : 'i-heroicons-check-circle'" :class="['w-8 h-8 mb-2', selectedStatus === 'IN' || isConfirmed ? 'text-emerald-500' : 'text-gray-400']" />
              <p :class="['font-semibold', selectedStatus === 'IN' || isConfirmed ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white']">{{ isConfirmed ? "You're In" : "I'm In" }}</p>
              <div v-if="selectedStatus === 'IN' || isConfirmed" class="absolute top-3 right-3">
                <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-emerald-500" />
              </div>
              <UButton
                v-if="isConfirmed"
                color="error"
                variant="outline"
                size="xs"
                class="mt-2"
                :loading="droppingOut"
                @click.stop="canSilentDropOut ? handleSilentDropOut() : showDropOutModal = true"
                icon="i-heroicons-x-mark"
              >
                Drop Out
              </UButton>
            </div>

            <button
              type="button"
              :disabled="isConfirmed"
              :class="[
                'relative p-5 rounded-2xl border-2 transition-all text-left',
                selectedStatus === 'OUT'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : isConfirmed
                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
              ]"
              @click="selectStatus('OUT')"
            >
              <UIcon name="i-heroicons-x-circle" :class="['w-8 h-8 mb-2', selectedStatus === 'OUT' ? 'text-red-500' : 'text-gray-400']" />
              <p :class="['font-semibold', selectedStatus === 'OUT' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white']">Can't Make It</p>
              <div v-if="selectedStatus === 'OUT'" class="absolute top-3 right-3">
                <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-red-500" />
              </div>
            </button>

            <button
              type="button"
              :disabled="isConfirmed"
              :class="[
                'relative p-5 rounded-2xl border-2 transition-all text-left',
                selectedStatus === 'MAYBE'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : isConfirmed
                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
              ]"
              @click="selectStatus('MAYBE')"
            >
              <UIcon name="i-heroicons-question-mark-circle" :class="['w-8 h-8 mb-2', selectedStatus === 'MAYBE' ? 'text-amber-500' : 'text-gray-400']" />
              <p :class="['font-semibold', selectedStatus === 'MAYBE' ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white']">Maybe</p>
              <div v-if="selectedStatus === 'MAYBE'" class="absolute top-3 right-3">
                <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-amber-500" />
              </div>
            </button>

            <button
              type="button"
              :disabled="isConfirmed"
              :class="[
                'relative p-5 rounded-2xl border-2 transition-all text-left',
                selectedStatus === 'IN_IF'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : isConfirmed
                    ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              ]"
              @click="selectStatus('IN_IF')"
            >
              <UIcon name="i-heroicons-chat-bubble-bottom-center-text" :class="['w-8 h-8 mb-2', selectedStatus === 'IN_IF' ? 'text-blue-500' : 'text-gray-400']" />
              <p :class="['font-semibold', selectedStatus === 'IN_IF' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white']">In If...</p>
              <div v-if="selectedStatus === 'IN_IF'" class="absolute top-3 right-3">
                <UIcon name="i-heroicons-check-circle-solid" class="w-5 h-5 text-blue-500" />
              </div>
            </button>
          </div>

          <!-- Streamlined Note Field -->
          <div v-if="selectedStatus || isConfirmed" class="mt-1">
            <!-- Editing state -->
            <div v-if="isEditingNote || selectedStatus === 'IN_IF'" class="relative">
              <input
                ref="noteInputRef"
                v-model="comment"
                type="text"
                :placeholder="selectedStatus === 'IN_IF' ? 'What needs to happen?' : 'Add a note...'"
                class="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary-500 focus:ring-0 focus:outline-none transition-colors"
                @keydown="handleNoteKeydown"
                @blur="selectedStatus !== 'IN_IF' && saveNote()"
              />
              <button
                v-if="comment.trim()"
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors"
                :class="hasUnsavedNote ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'text-emerald-500'"
                @click="saveNote"
              >
                <UIcon :name="hasUnsavedNote ? 'i-heroicons-arrow-up-circle-solid' : 'i-heroicons-check-circle-solid'" class="w-6 h-6" />
              </button>
            </div>

            <!-- Display state (not editing, has note) -->
            <button
              v-else-if="comment && !isEditingNote"
              type="button"
              class="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left group"
              @click="startEditingNote"
            >
              <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span class="text-sm text-gray-600 dark:text-gray-400 flex-1 truncate italic">"{{ comment }}"</span>
              <UIcon name="i-heroicons-pencil" class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <!-- Add note button (no note yet) -->
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm text-gray-500 dark:text-gray-400"
              @click="startEditingNote"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4" />
              Add note
            </button>
          </div>

          <!-- Submit for IN_IF when no existing RSVP -->
          <UButton
            v-if="selectedStatus === 'IN_IF' && !event.userRsvp && comment.trim()"
            color="primary"
            size="xl"
            block
            :loading="rsvpLoading"
            @click="handleSubmit"
          >
            Submit Response
          </UButton>

          <!-- Saved indicator -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
          >
            <p
              v-if="showSavedIndicator && !isEditingNote"
              :key="savedAnimationKey"
              class="text-center text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1"
            >
              <UIcon name="i-heroicons-check" class="w-3 h-3" />
              Saved
            </p>
          </Transition>
        </template>
      </div>

      <!-- Organizer Actions -->
      <div v-else-if="event.isOrganizer" class="mb-6">
        <UButton :to="`/e/${event.slug}/manage`" color="primary" size="xl" block icon="i-heroicons-cog-6-tooth">
          Manage Event
        </UButton>
      </div>


      <!-- Progress and Organizer Row -->
        <div class="flex items-center gap-4">
          <div class="flex-1 flex items-center gap-2">
            <UProgress
              :model-value="event.rsvpCount"
              :max="event.maxPlayers"
              color="primary"
              size="xl"
              class="w-24"
            />
            <span class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
              {{ event.rsvpCount }}/{{ event.maxPlayers }}
            </span>
          </div>
          <span class="text-sm text-gray-500">
            Organizer: <span class="text-primary-500 font-medium">{{ event.organizer.name }}</span>
          </span>
        </div>
      <!-- Responses Section with Tabs -->
      <div v-if="event.rsvps && event.rsvps.length > 0" class="mt-8">
        <UTabs
          v-model="activeResponseTab"
          :items="responseTabs"
          :content="false"
          variant="link"
          class="w-full"
        />

        <!-- Response List -->
        <div class="mt-4 space-y-2">
          <div v-if="activeRsvpList.length === 0" class="text-center py-6 text-gray-500">
            No responses yet
          </div>
          <div
            v-for="rsvp in activeRsvpList"
            :key="rsvp.id"
            :class="[
              'rounded-lg px-3 py-2',
              activeResponseTab === 'in' ? 'bg-emerald-50 dark:bg-emerald-900/20' : '',
              activeResponseTab === 'out' ? 'bg-red-50 dark:bg-red-900/20' : '',
              activeResponseTab === 'maybe' ? 'bg-amber-50 dark:bg-amber-900/20' : '',
              activeResponseTab === 'waitlist' ? 'bg-violet-50 dark:bg-violet-900/20' : ''
            ]"
          >
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  activeResponseTab === 'in' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' : '',
                  activeResponseTab === 'out' ? 'bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300' : '',
                  activeResponseTab === 'maybe' ? 'bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300' : '',
                  activeResponseTab === 'waitlist' ? 'bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300' : ''
                ]"
              >
                {{ getInitials(rsvp.name) }}
              </span>
              <span
                :class="[
                  'text-sm',
                  activeResponseTab === 'in' ? 'text-emerald-700 dark:text-emerald-300' : '',
                  activeResponseTab === 'out' ? 'text-red-700 dark:text-red-300' : '',
                  activeResponseTab === 'maybe' ? 'text-amber-700 dark:text-amber-300' : '',
                  activeResponseTab === 'waitlist' ? 'text-violet-700 dark:text-violet-300' : ''
                ]"
              >
                {{ rsvp.name }}
              </span>
              <UBadge
                v-if="rsvp.status === 'IN_IF'"
                label="If..."
                color="info"
                variant="subtle"
                size="xs"
              />
            </div>
            <p
              v-if="rsvp.comment"
              :class="[
                'mt-1 text-sm italic pl-8',
                activeResponseTab === 'in' ? 'text-emerald-600 dark:text-emerald-400' : '',
                activeResponseTab === 'out' ? 'text-red-600 dark:text-red-400' : '',
                activeResponseTab === 'maybe' ? 'text-amber-600 dark:text-amber-400' : '',
                activeResponseTab === 'waitlist' ? 'text-violet-600 dark:text-violet-400' : ''
              ]"
            >
              "{{ rsvp.comment }}"
            </p>
          </div>
        </div>
      </div>

      <!-- Share Section -->
      <div v-if="event.allowSharing" class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        <ShareLinkCard :event="{ slug: event.slug, datetime: event.datetime, endDatetime: event.endDatetime, maxPlayers: event.maxPlayers, rsvpCount: event.rsvpCount }" />
      </div>
    </template>

    <!-- Auth Modal -->
    <AuthModal v-model:open="showAuthModal" @authenticated="submitPendingRsvp" />

    <!-- Drop Out Modal -->
    <UModal v-model:open="showDropOutModal" title="Drop Out">
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to drop out of this event?
        </p>
        <p v-if="hasWaitlist && event" class="mt-2 text-sm text-violet-600 dark:text-violet-400">
          There {{ (event.waitlistCount ?? 0) === 1 ? 'is' : 'are' }} {{ event.waitlistCount ?? 0 }} {{ (event.waitlistCount ?? 0) === 1 ? 'person' : 'people' }} on the waitlist who could take your spot.
        </p>
        <p v-else class="mt-2 text-sm text-gray-500">
          You can send a text to let the other players know.
        </p>
      </template>
      <template #footer>
        <div class="flex flex-col gap-2 w-full sm:flex-row sm:justify-end">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showDropOutModal = false" />
          <UButton color="error" variant="soft" label="Just Drop Out" :loading="droppingOut" @click="handleDropOut(false)" />
          <UButton color="primary" :label="hasWaitlist ? 'Drop Out & Text Everyone' : 'Drop Out & Send Text'" :loading="droppingOut" @click="handleDropOut(true)" />
        </div>
      </template>
    </UModal>
  </div>
</template>
