<script setup lang="ts">
import { formatRelativeDay } from '~/utils/dateFormat'

interface EventData {
  slug: string
  datetime: string
  endDatetime?: string | null
  maxPlayers: number
  rsvpCount?: number
}

const props = defineProps<{
  event: EventData
}>()

const open = defineModel<boolean>('open', { default: false })

const shareType = ref<'link' | 'linkWithMessage'>('linkWithMessage')
const copied = ref(false)

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

const shareMessage = computed(() => {
  const dayStr = formatRelativeDay(props.event.datetime, { includeTonight: true })
  const startTime = formatShareTime(props.event.datetime)
  const endTime = props.event.endDatetime ? formatShareTime(props.event.endDatetime) : ''
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime
  const spotsNeeded = props.event.maxPlayers - (props.event.rsvpCount || 0)

  return `${dayStr} ${timeStr}? Looking for ${spotsNeeded}.`
})

const previewText = computed(() => {
  if (shareType.value === 'link') {
    return eventUrl.value
  }
  return `${shareMessage.value}\n${eventUrl.value}`
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(previewText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = previewText.value
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
  window.open(`sms:?body=${encodeURIComponent(previewText.value)}`)
  open.value = false
}

// Reset state when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    shareType.value = 'linkWithMessage'
    copied.value = false
  }
})
</script>

<template>
  <UModal v-model:open="open" title="Share Event" :ui="{ width: 'sm:max-w-md' }">
    <template #body>
      <div class="space-y-4">
        <!-- Share type selection -->
        <div class="space-y-2">
          <button
            class="w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
            :class="[
              shareType === 'link'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
            @click="shareType = 'link'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="shareType === 'link' ? 'bg-emerald-100 dark:bg-emerald-800' : 'bg-gray-100 dark:bg-gray-800'"
              >
                <UIcon name="i-heroicons-link" class="w-5 h-5" :class="shareType === 'link' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Link only</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Just the event URL</p>
              </div>
            </div>
          </button>

          <button
            class="w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
            :class="[
              shareType === 'linkWithMessage'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            ]"
            @click="shareType = 'linkWithMessage'"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :class="shareType === 'linkWithMessage' ? 'bg-emerald-100 dark:bg-emerald-800' : 'bg-gray-100 dark:bg-gray-800'"
              >
                <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-5 h-5" :class="shareType === 'linkWithMessage' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Link with message</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">Include event summary</p>
              </div>
            </div>
          </button>
        </div>

        <!-- Preview -->
        <div>
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Preview</p>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-all">{{ previewText }}</p>
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
          @click="sendText"
        />
      </div>
    </template>
  </UModal>
</template>
