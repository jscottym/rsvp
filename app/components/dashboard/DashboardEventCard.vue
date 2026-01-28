<script setup lang="ts">
type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

interface Props {
  event: {
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
  }
}

const props = defineProps<Props>()

const sportEmoji = computed(() => {
  const emojis: Record<string, string> = {
    pickleball: '\u{1F3F8}',
    basketball: '\u{1F3C0}',
    soccer: '\u26BD',
    volleyball: '\u{1F3D0}',
    tennis: '\u{1F3BE}',
    softball: '\u{1F94E}',
    baseball: '\u26BE',
    football: '\u{1F3C8}',
    hockey: '\u{1F3D2}',
    golf: '\u26F3',
    running: '\u{1F3C3}',
    cycling: '\u{1F6B4}',
    swimming: '\u{1F3CA}',
    hiking: '\u{1F6B6}'
  }
  return emojis[props.event.sportType.toLowerCase()] || '\u{1F3C6}'
})

const accentColor = computed(() => {
  if (props.event.isOrganizer) return 'bg-gradient-to-b from-amber-400 to-amber-500'
  switch (props.event.userRsvpStatus) {
    case 'IN': return 'bg-emerald-500'
    case 'MAYBE':
    case 'IN_IF': return 'bg-amber-400'
    case 'WAITLIST': return 'bg-violet-500'
    default: return 'bg-gray-300 dark:bg-gray-600'
  }
})

const badge = computed(() => {
  if (props.event.isOrganizer) {
    return { label: 'Organizing', color: 'warning' as const, variant: 'soft' as const }
  }
  switch (props.event.userRsvpStatus) {
    case 'IN': return { label: 'In', color: 'primary' as const, variant: 'soft' as const }
    case 'MAYBE': return { label: 'Maybe', color: 'warning' as const, variant: 'soft' as const }
    case 'IN_IF': return { label: 'Maybe', color: 'warning' as const, variant: 'soft' as const }
    case 'WAITLIST': return { label: 'Waitlist', color: 'info' as const, variant: 'soft' as const }
    default: return null
  }
})

function formatRelativeDay(datetime: string) {
  const eventDate = new Date(datetime)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eventDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < 0) return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (diffDays < 7) return eventDate.toLocaleDateString('en-US', { weekday: 'long' })

  return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(datetime: string, endDatetime: string | null) {
  const start = new Date(datetime)
  const startHour = start.getHours()
  const startMin = start.getMinutes()

  const formatHour = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am'
    const hour12 = h % 12 || 12
    return m === 0 ? `${hour12}${period}` : `${hour12}:${m.toString().padStart(2, '0')}${period}`
  }

  const startStr = formatHour(startHour, startMin)

  if (!endDatetime) return startStr

  const end = new Date(endDatetime)
  const endHour = end.getHours()
  const endMin = end.getMinutes()
  const endStr = formatHour(endHour, endMin)

  // If same am/pm, omit from start
  if ((startHour < 12) === (endHour < 12)) {
    const startHour12 = startHour % 12 || 12
    const startShort = startMin === 0 ? `${startHour12}` : `${startHour12}:${startMin.toString().padStart(2, '0')}`
    return `${startShort}-${endStr}`
  }

  return `${startStr}-${endStr}`
}
</script>

<template>
  <NuxtLink
    :to="`/e/${event.slug}`"
    class="group relative flex bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-primary-400 dark:hover:border-primary-600 transition-all duration-200 active:scale-[0.98]"
  >
    <!-- Left accent bar -->
    <div class="w-1.5 flex-shrink-0" :class="accentColor"></div>

    <!-- Content -->
    <div class="flex-1 p-4 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <!-- Title with emoji -->
          <h3 class="font-semibold text-gray-900 dark:text-white truncate">
            {{ sportEmoji }} {{ event.title }}
          </h3>

          <!-- Location -->
          <p class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 flex-shrink-0" />
            <span class="truncate">{{ event.location }}</span>
          </p>

          <!-- Time -->
          <p class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 flex-shrink-0" />
            <span>{{ formatRelativeDay(event.datetime) }} {{ formatTime(event.datetime, event.endDatetime) }}</span>
          </p>
        </div>

        <!-- Right side: badge + count -->
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <UBadge
            v-if="badge"
            :label="badge.label"
            :color="badge.color"
            :variant="badge.variant"
            size="xs"
          />
          <div class="text-right">
            <span class="text-lg font-bold text-primary-500">{{ event.rsvpCount }}</span>
            <span class="text-xs text-gray-400">/{{ event.maxPlayers }}</span>
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
