<script setup lang="ts">
type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST';

interface RsvpData {
  id: string;
  status: RsvpStatus;
  name: string;
  phone: string | null;
}

const props = defineProps<{
  eventSlug: string;
  phones: string[];
}>();

const open = defineModel<boolean>('open', { default: false });

const message = ref('');
const includeLink = ref(false);

const eventUrl = computed(() => {
  if (import.meta.server) return '';
  return `${window.location.origin}/e/${props.eventSlug}`;
});

const finalMessage = computed(() => {
  let text = message.value.trim();
  if (includeLink.value && text) {
    text += `\n\n${eventUrl.value}`;
  }
  return text;
});

const smsUrl = computed(() => {
  const phones = props.phones.join(',');
  return `sms:${phones}?body=${encodeURIComponent(finalMessage.value)}`;
});

function sendText() {
  if (!finalMessage.value || props.phones.length === 0) return;
  window.open(smsUrl.value);
  open.value = false;
}

// Reset when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    message.value = '';
    includeLink.value = false;
  }
});
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ width: 'sm:max-w-md' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-chat-bubble-left-ellipsis"
            class="w-5 h-5 text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            Message Players
          </h3>
          <p class="text-sm text-gray-500">
            Sending to {{ phones.length }} {{ phones.length === 1 ? 'person' : 'people' }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Message input -->
        <div>
          <UTextarea
            v-model="message"
            placeholder="Type your message..."
            :rows="4"
            size="lg"
            autofocus
          />
        </div>

        <!-- Include link toggle -->
        <label
          class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 cursor-pointer"
        >
          <input
            v-model="includeLink"
            type="checkbox"
            class="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">Include event link</span>
        </label>
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
          icon="i-heroicons-paper-airplane"
          label="Send"
          :disabled="!message.trim() || phones.length === 0"
          @click="sendText"
        />
      </div>
    </template>
  </UModal>
</template>
