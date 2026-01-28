<script setup lang="ts">
interface EventData {
  slug: string
  datetime: string
  endDatetime?: string
  maxPlayers: number
  rsvpCount: number
}

const props = defineProps<{
  event: EventData
}>()

const toast = useToast()
const copied = ref(false)

const eventUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/e/${props.event.slug}`
  }
  return `/e/${props.event.slug}`
})

// Format time for share message (e.g., "6am", "6:30am", "11:00am")
function formatShareTime(datetime: string): string {
  const date = new Date(datetime)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours

  if (minutes === 0) {
    return `${hour12}${suffix}`
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${suffix}`
}

// Generate share message like "This Wed 6-8am? Looking for 3."
function generateShareMessage(): string {
  const eventDate = new Date(props.event.datetime)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Format the day part
  let dayStr: string
  const isEvening = eventDate.getHours() >= 17

  if (diffDays === 0) {
    dayStr = isEvening ? 'Tonight' : 'Today'
  } else if (diffDays === 1) {
    dayStr = 'Tomorrow'
  } else if (diffDays > 1 && diffDays <= 6) {
    // This week: "This Wed"
    const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
    dayStr = `This ${weekday}`
  } else if (diffDays > 6 && diffDays <= 13) {
    // Next week: "Next Tue"
    const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
    dayStr = `Next ${weekday}`
  } else {
    // Further out: "Jan 15"
    dayStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format time range
  const startTime = formatShareTime(props.event.datetime)
  const endTime = props.event.endDatetime ? formatShareTime(props.event.endDatetime) : ''
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime

  // Calculate spots needed
  const spotsNeeded = props.event.maxPlayers - (props.event.rsvpCount || 0)

  return `${dayStr} ${timeStr}? Looking for ${spotsNeeded}.`
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(eventUrl.value)
    copied.value = true
    toast.add({
      title: 'Link copied!',
      color: 'success'
    })
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (e) {
    toast.add({
      title: 'Failed to copy',
      color: 'error'
    })
  }
}

function shareViaSms() {
  const message = generateShareMessage()
  const text = `${message}\n${eventUrl.value}`
  window.open(`sms:?body=${encodeURIComponent(text)}`)
}

function shareViaEmail() {
  const message = generateShareMessage()
  const subject = message
  const body = `${message}\n\n${eventUrl.value}`
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
}
</script>

<template>
  <div class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="font-medium text-gray-900 dark:text-white">Share this event</h4>
      <UIcon name="i-heroicons-share" class="text-gray-400" />
    </div>

    <div class="flex gap-2">
      <UInput
        :model-value="eventUrl"
        readonly
        class="flex-1"
        size="lg"
      />
      <UButton
        :color="copied ? 'success' : 'primary'"
        size="lg"
        :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
        @click="copyLink"
      />
    </div>

    <div class="flex gap-2 mt-3">
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-heroicons-chat-bubble-left-ellipsis"
        label="Text"
        @click="shareViaSms"
      />
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-heroicons-envelope"
        label="Email"
        @click="shareViaEmail"
      />
    </div>
  </div>
</template>
