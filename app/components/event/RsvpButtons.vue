<template>
  <div class="grid grid-cols-2 gap-4">
    <UButton
      size="xl"
      :color="status === 'IN' ? 'success' : 'neutral'"
      :variant="status === 'IN' ? 'solid' : 'outline'"
      :loading="loading"
      :disabled="full && status !== 'IN'"
      class="h-16 text-lg font-semibold"
      @click="emit('rsvp', 'IN')"
    >
      <template #leading>
        <UIcon
          :name="status === 'IN' ? 'i-heroicons-check-circle-solid' : 'i-heroicons-hand-raised'"
          class="w-6 h-6"
        />
      </template>
      {{ status === 'IN' ? "I'm In!" : full ? 'Full' : "I'm In" }}
    </UButton>

    <UButton
      size="xl"
      :color="status === 'OUT' ? 'error' : 'neutral'"
      :variant="status === 'OUT' ? 'soft' : 'outline'"
      :loading="loading"
      class="h-16 text-lg font-semibold"
      @click="emit('rsvp', 'OUT')"
    >
      <template #leading>
        <UIcon
          :name="status === 'OUT' ? 'i-heroicons-x-circle-solid' : 'i-heroicons-x-mark'"
          class="w-6 h-6"
        />
      </template>
      {{ status === 'OUT' ? "Can't Make It" : "I'm Out" }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  status: 'IN' | 'OUT' | null
  full: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  rsvp: [status: 'IN' | 'OUT']
}>()
</script>
