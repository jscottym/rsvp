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

<script setup lang="ts">
const props = defineProps<{
  slug: string
}>()

const toast = useToast()
const copied = ref(false)

const eventUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/e/${props.slug}`
  }
  return `/e/${props.slug}`
})

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
  const text = `Join my pickup game! ${eventUrl.value}`
  window.open(`sms:?body=${encodeURIComponent(text)}`)
}

function shareViaEmail() {
  const subject = 'Join my pickup game!'
  const body = `Hey! I'm organizing a game and thought you might want to join.\n\n${eventUrl.value}`
  window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
}
</script>
