<script setup lang="ts">
interface Notification {
  id: string;
  scheduleType: 'DAY_BEFORE' | 'MORNING_OF' | 'MINUTES_BEFORE' | 'SPECIFIC_TIME';
  scheduledFor: string;
  relativeMinutes: number | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIALLY_FAILED' | 'FAILED' | 'CANCELLED';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

interface Props {
  slug: string;
  eventDatetime: string;
  confirmedCount: number;
}

const props = defineProps<Props>();

const authStore = useAuthStore();
const toast = useToast();

const notifications = ref<Notification[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const creating = ref(false);
const deletingId = ref<string | null>(null);

async function fetchNotifications() {
  loading.value = true;
  try {
    const token = await authStore.getIdToken();
    const response = await $fetch<{ notifications: Notification[] }>(
      `/api/events/${props.slug}/notifications`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    notifications.value = response.notifications;
  } catch (e) {
    console.error('Failed to fetch notifications:', e);
  } finally {
    loading.value = false;
  }
}

async function createNotification(data: {
  scheduleType: string;
  relativeMinutes?: number;
}) {
  creating.value = true;
  try {
    const token = await authStore.getIdToken();
    const response = await $fetch<{ notification: Notification }>(
      `/api/events/${props.slug}/notifications`,
      {
        method: 'POST',
        body: data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    notifications.value.push(response.notification);
    notifications.value.sort(
      (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    );

    showCreateModal.value = false;
    toast.add({
      title: 'Reminder scheduled!',
      description: 'SMS will be sent at the scheduled time',
      color: 'success',
    });
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to create notification',
      color: 'error',
    });
  } finally {
    creating.value = false;
  }
}

async function cancelNotification(id: string) {
  deletingId.value = id;
  try {
    const token = await authStore.getIdToken();
    await $fetch(`/api/events/${props.slug}/notifications/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const idx = notifications.value.findIndex((n) => n.id === id);
    if (idx !== -1) {
      notifications.value[idx]!.status = 'CANCELLED';
    }

    toast.add({
      title: 'Reminder cancelled',
      color: 'success',
    });
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to cancel notification',
      color: 'error',
    });
  } finally {
    deletingId.value = null;
  }
}

function formatScheduleType(type: string, minutes: number | null): string {
  switch (type) {
    case 'DAY_BEFORE':
      return 'Day before';
    case 'MORNING_OF':
      return 'Morning of';
    case 'MINUTES_BEFORE':
      if (!minutes) return 'Before event';
      if (minutes < 60) return `${minutes} min before`;
      const hours = minutes / 60;
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} before`;
    default:
      return type;
  }
}

function formatTime(datetime: string): string {
  const date = new Date(datetime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusColor(
  status: string
): 'primary' | 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'PENDING':
      return 'primary';
    case 'PROCESSING':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'PARTIALLY_FAILED':
      return 'warning';
    case 'FAILED':
      return 'error';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Scheduled';
    case 'PROCESSING':
      return 'Sending...';
    case 'COMPLETED':
      return 'Sent';
    case 'PARTIALLY_FAILED':
      return 'Partial';
    case 'FAILED':
      return 'Failed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

const pendingCount = computed(
  () => notifications.value.filter((n) => n.status === 'PENDING').length
);

const canAddMore = computed(() => pendingCount.value < 5);

// Fetch on mount
onMounted(() => {
  fetchNotifications();
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-bell" class="w-5 h-5 text-blue-500" />
        <h3 class="font-semibold text-gray-900 dark:text-white">SMS Reminders</h3>
      </div>
      <UButton
        v-if="canAddMore"
        color="primary"
        variant="soft"
        size="xs"
        icon="i-heroicons-plus"
        label="Add"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-4">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-5 h-5 animate-spin text-gray-400"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="notifications.length === 0"
      class="text-center py-4"
    >
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
        No reminders scheduled yet
      </p>
      <UButton
        color="primary"
        variant="soft"
        size="sm"
        icon="i-heroicons-bell"
        label="Schedule reminder"
        @click="showCreateModal = true"
      />
    </div>

    <!-- Notifications list -->
    <div v-else class="space-y-2">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="flex items-center gap-3 p-3 rounded-xl transition-colors"
        :class="[
          notification.status === 'PENDING'
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : notification.status === 'COMPLETED'
              ? 'bg-teal-50 dark:bg-teal-900/20'
              : notification.status === 'CANCELLED'
                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60'
                : 'bg-gray-50 dark:bg-gray-800/50',
        ]"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="text-sm font-medium"
              :class="[
                notification.status === 'CANCELLED'
                  ? 'text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white',
              ]"
            >
              {{ formatScheduleType(notification.scheduleType, notification.relativeMinutes) }}
            </span>
            <UBadge
              :label="getStatusLabel(notification.status)"
              :color="getStatusColor(notification.status)"
              variant="soft"
              size="xs"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ formatTime(notification.scheduledFor) }}
            <template v-if="notification.status === 'COMPLETED' && notification.sentCount > 0">
              · {{ notification.sentCount }} sent
              <template v-if="notification.failedCount > 0">
                , {{ notification.failedCount }} failed
              </template>
            </template>
          </p>
        </div>

        <!-- Cancel button (only for pending) -->
        <button
          v-if="notification.status === 'PENDING'"
          class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          :disabled="deletingId === notification.id"
          @click="cancelNotification(notification.id)"
        >
          <UIcon
            :name="deletingId === notification.id ? 'i-heroicons-arrow-path' : 'i-heroicons-x-mark'"
            :class="['w-4 h-4', deletingId === notification.id && 'animate-spin']"
          />
        </button>
      </div>
    </div>

    <!-- Rate limit warning -->
    <p
      v-if="!canAddMore && notifications.length > 0"
      class="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center"
    >
      Maximum 5 pending reminders per event
    </p>

    <!-- Create Modal -->
    <EventCreateNotificationModal
      v-model:open="showCreateModal"
      :event-datetime="eventDatetime"
      :confirmed-count="confirmedCount"
      @create="createNotification"
    />
  </div>
</template>
