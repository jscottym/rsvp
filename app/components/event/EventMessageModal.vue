<script setup lang="ts">
import { formatRelativeDay } from '~/utils/dateFormat'

type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST'

interface EventData {
  slug: string
  title: string
  datetime: string
  endDatetime?: string | null
  location: string
  isOrganizer?: boolean
}

interface RsvpData {
  id: string
  status: RsvpStatus
  name: string
  phone: string | null
}

const props = defineProps<{
  event: EventData
  rsvps: RsvpData[]
}>()

const open = defineModel<boolean>('open', { default: false })

const authStore = useAuthStore()
const eventsStore = useEventsStore()

type Audience = 'in' | 'in_waitlist' | 'all'

const audience = ref<Audience>('in')
const includeLink = ref(true)
const includeSummary = ref(true)
const copied = ref(false)
const loading = ref(false)
const rsvpsWithPhone = ref<RsvpData[]>([])

const eventUrl = computed(() => {
  if (import.meta.server) return ''
  return `${window.location.origin}/e/${props.event.slug}`
})

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

// Count RSVPs by status (use full data if available, otherwise props)
const rsvpCounts = computed(() => {
  const data = rsvpsWithPhone.value.length > 0 ? rsvpsWithPhone.value : props.rsvps
  const inCount = data.filter(r => r.status === 'IN' && r.phone).length
  const waitlistCount = data.filter(r => r.status === 'WAITLIST' && r.phone).length
  const allCount = data.filter(r => r.phone).length

  return {
    in: inCount,
    in_waitlist: inCount + waitlistCount,
    all: allCount
  }
})

const audienceOptions = computed(() => [
  { value: 'in' as Audience, label: 'In', count: rsvpCounts.value.in },
  { value: 'in_waitlist' as Audience, label: 'In + Wait', count: rsvpCounts.value.in_waitlist },
  { value: 'all' as Audience, label: 'All', count: rsvpCounts.value.all }
])

// Filter RSVPs based on audience selection
const selectedRsvps = computed(() => {
  const data = rsvpsWithPhone.value.length > 0 ? rsvpsWithPhone.value : props.rsvps

  switch (audience.value) {
    case 'in':
      return data.filter(r => r.status === 'IN' && r.phone)
    case 'in_waitlist':
      return data.filter(r => (r.status === 'IN' || r.status === 'WAITLIST') && r.phone)
    case 'all':
      return data.filter(r => r.phone)
  }
})

const phoneNumbers = computed(() => selectedRsvps.value.map(r => r.phone!))

const summaryText = computed(() => {
  const dayStr = formatRelativeDay(props.event.datetime, { includeTonight: true })
  const startTime = formatShareTime(props.event.datetime)
  const endTime = props.event.endDatetime ? formatShareTime(props.event.endDatetime) : ''
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime

  return `${dayStr} ${timeStr} at ${props.event.location}`
})

const messageText = computed(() => {
  let text = `Hey! Quick update about ${props.event.title}...`

  if (includeSummary.value) {
    text += `\n\n${summaryText.value}`
  }

  if (includeLink.value) {
    text += `\n\n${eventUrl.value}`
  }

  return text
})

const smsUrl = computed(() => {
  const phones = phoneNumbers.value.join(',')
  return `sms:${phones}?body=${encodeURIComponent(messageText.value)}`
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(messageText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Fallback
    const textarea = document.createElement('textarea')
    textarea.value = messageText.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

function sendText() {
  window.open(smsUrl.value)
  open.value = false
}

// Fetch full RSVP data with phone numbers when modal opens
async function fetchRsvpsWithPhone() {
  if (!props.event.isOrganizer) return

  loading.value = true
  try {
    const token = await authStore.getIdToken()
    const response = await $fetch<{ rsvps: RsvpData[] }>(
      `/api/events/${props.event.slug}/rsvps`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    )
    rsvpsWithPhone.value = response.rsvps
  } catch (e) {
    console.error('Failed to fetch RSVPs:', e)
  } finally {
    loading.value = false
  }
}

// Reset and fetch when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    audience.value = 'in'
    includeLink.value = true
    includeSummary.value = true
    copied.value = false
    fetchRsvpsWithPhone()
  }
})
</script>

<template>
  <UModal v-model:open="open" title="Message Players" :ui="{ width: 'sm:max-w-md' }">
    <template #body>
      <div class="space-y-5">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
        </div>

        <template v-else>
          <!-- Audience selector -->
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Who to message</p>
            <div class="flex gap-2">
              <button
                v-for="option in audienceOptions"
                :key="option.value"
                class="flex-1 py-3 px-2 rounded-xl text-center transition-all active:scale-95"
                :class="[
                  audience === option.value
                    ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/30 dark:ring-emerald-400'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                ]"
                @click="audience = option.value"
              >
                <span class="block font-medium text-gray-900 dark:text-white">{{ option.label }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">({{ option.count }})</span>
              </button>
            </div>
          </div>

          <!-- Include toggles -->
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Include</p>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
                <input
                  v-model="includeLink"
                  type="checkbox"
                  class="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Event link</span>
              </label>
              <label class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer">
                <input
                  v-model="includeSummary"
                  type="checkbox"
                  class="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Event summary</span>
              </label>
            </div>
          </div>

          <!-- Preview -->
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{{ messageText }}</p>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Sending to {{ phoneNumbers.length }} {{ phoneNumbers.length === 1 ? 'person' : 'people' }}
            </p>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div v-if="!loading" class="flex gap-3 w-full">
        <UButton
          color="neutral"
          variant="soft"
          class="flex-1"
          size="lg"
          :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
          :label="copied ? 'Copied!' : 'Copy'"
          @click="copyToClipboard"
        />
        <UButton
          color="primary"
          class="flex-1"
          size="lg"
          icon="i-heroicons-chat-bubble-left-ellipsis"
          label="Send text"
          :disabled="phoneNumbers.length === 0"
          @click="sendText"
        />
      </div>
    </template>
  </UModal>
</template>
