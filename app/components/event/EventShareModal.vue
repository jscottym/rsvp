<script setup lang="ts">
import { formatRelativeDay } from '~/utils/dateFormat';

interface EventData {
  slug: string;
  datetime: string;
  endDatetime?: string | null;
  maxPlayers: number;
  rsvpCount?: number;
}

const props = defineProps<{
  event: EventData;
}>();

const open = defineModel<boolean>('open', { default: false });

const copiedLink = ref(false);
const copiedMessage = ref(false);

const eventUrl = computed(() => {
  if (import.meta.server) return '';
  return `${window.location.origin}/e/${props.event.slug}?t=${Date.now()}`;
});

function formatShareTime(datetime: string): string {
  const date = new Date(datetime);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  if (minutes === 0) {
    return `${hour12}${suffix}`;
  }
  return `${hour12}:${minutes.toString().padStart(2, '0')}${suffix}`;
}

const shareMessage = computed(() => {
  const dayStr = formatRelativeDay(props.event.datetime, {
    includeTonight: true,
  });
  const startTime = formatShareTime(props.event.datetime);
  const endTime = props.event.endDatetime
    ? formatShareTime(props.event.endDatetime)
    : '';
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime;
  const spotsNeeded = props.event.maxPlayers - (props.event.rsvpCount || 0);

  return `${dayStr} ${timeStr}? Looking for ${spotsNeeded}.`;
});

const fullMessage = computed(() => `${shareMessage.value}\n${eventUrl.value}`);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(eventUrl.value);
    copiedLink.value = true;
    setTimeout(() => {
      copiedLink.value = false;
    }, 1500);
  } catch {
    fallbackCopy(eventUrl.value);
    copiedLink.value = true;
    setTimeout(() => {
      copiedLink.value = false;
    }, 1500);
  }
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(fullMessage.value);
    copiedMessage.value = true;
    setTimeout(() => {
      copiedMessage.value = false;
    }, 1500);
  } catch {
    fallbackCopy(fullMessage.value);
    copiedMessage.value = true;
    setTimeout(() => {
      copiedMessage.value = false;
    }, 1500);
  }
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function sendLinkText() {
  window.open(`sms:?body=${encodeURIComponent(eventUrl.value)}`);
  open.value = false;
}

function sendMessageText() {
  window.open(`sms:?body=${encodeURIComponent(fullMessage.value)}`);
  open.value = false;
}

// Reset state when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    copiedLink.value = false;
    copiedMessage.value = false;
  }
});
</script>

<template>
  <UModal
    v-model:open="open"
    title="Share Event"
    :ui="{ width: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Link Only Card -->
        <div class="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="p-4 bg-gray-50 dark:bg-gray-800/50">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-link" class="w-4 h-4 text-gray-400" />
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Link only</span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 break-all font-mono">
              {{ eventUrl }}
            </p>
          </div>
          <div class="flex border-t border-gray-200 dark:border-gray-700">
            <button
              class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
              :class="copiedLink ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'"
              @click="copyLink"
            >
              <UIcon :name="copiedLink ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
              {{ copiedLink ? 'Copied!' : 'Copy' }}
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              @click="sendLinkText"
            >
              <UIcon name="i-heroicons-paper-airplane" class="w-4 h-4" />
              Send text
            </button>
          </div>
        </div>

        <!-- Link with Message Card -->
        <div class="rounded-2xl border-2 border-emerald-500 overflow-hidden">
          <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-4 h-4 text-emerald-500" />
              <span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">With message</span>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{{ fullMessage }}</p>
          </div>
          <div class="flex border-t border-emerald-200 dark:border-emerald-800">
            <button
              class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border-r border-emerald-200 dark:border-emerald-800"
              :class="copiedMessage ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'"
              @click="copyMessage"
            >
              <UIcon :name="copiedMessage ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
              {{ copiedMessage ? 'Copied!' : 'Copy' }}
            </button>
            <button
              class="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              @click="sendMessageText"
            >
              <UIcon name="i-heroicons-paper-airplane" class="w-4 h-4" />
              Send text
            </button>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
