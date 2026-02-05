<script setup lang="ts">
import { formatRelativeDay } from '~/utils/dateFormat';
import {
  getRsvpStatusConfig,
  RSVP_STATUS_CONFIG,
  type RsvpStatus,
} from '~/utils/rsvpStatus';

interface Attendee {
  id: string;
  status: RsvpStatus;
  name: string;
  userId: string | null;
}

interface Props {
  event: {
    slug: string;
    title: string;
    sportType: string;
    location: string;
    datetime: string;
    endDatetime: string | null;
    maxPlayers: number;
    rsvpCount: number;
    isOrganizer: boolean;
    userRsvpStatus: RsvpStatus | null;
    organizer: { id: string; name: string | null };
    attendees?: Attendee[];
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  claimSpot: [slug: string];
}>();

const claiming = ref(false);

async function handleClaimSpot(e: Event) {
  e.preventDefault();
  e.stopPropagation();

  claiming.value = true;
  emit('claimSpot', props.event.slug);
}

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
    hiking: '\u{1F6B6}',
  };
  return emojis[props.event.sportType.toLowerCase()] || '\u{1F3C6}';
});

const statusConfig = computed(() =>
  getRsvpStatusConfig(props.event.userRsvpStatus, props.event.isOrganizer)
);

function formatTime(datetime: string, endDatetime: string | null) {
  const start = new Date(datetime);
  const startHour = start.getHours();
  const startMin = start.getMinutes();

  const formatHour = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return m === 0
      ? `${hour12}${period}`
      : `${hour12}:${m.toString().padStart(2, '0')}${period}`;
  };

  const startStr = formatHour(startHour, startMin);

  if (!endDatetime) return startStr;

  const end = new Date(endDatetime);
  const endHour = end.getHours();
  const endMin = end.getMinutes();
  const endStr = formatHour(endHour, endMin);

  if (startHour < 12 === endHour < 12) {
    const startHour12 = startHour % 12 || 12;
    const startShort =
      startMin === 0
        ? `${startHour12}`
        : `${startHour12}:${startMin.toString().padStart(2, '0')}`;
    return `${startShort}-${endStr}`;
  }

  return `${startStr}-${endStr}`;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

function getFirstName(name: string) {
  return name.split(' ')[0];
}

function getAttendeeStyle(status: RsvpStatus) {
  const config = RSVP_STATUS_CONFIG[status];
  const styles: Record<RsvpStatus, { avatarBg: string; avatarText: string }> = {
    IN: {
      avatarBg: 'bg-teal-200 dark:bg-teal-800',
      avatarText: 'text-teal-700 dark:text-teal-300',
    },
    WAITLIST: {
      avatarBg: 'bg-violet-200 dark:bg-violet-800',
      avatarText: 'text-violet-700 dark:text-violet-300',
    },
    MAYBE: {
      avatarBg: 'bg-amber-200 dark:bg-amber-800',
      avatarText: 'text-amber-700 dark:text-amber-300',
    },
    IN_IF: {
      avatarBg: 'bg-amber-200 dark:bg-amber-800',
      avatarText: 'text-amber-700 dark:text-amber-300',
    },
    OUT: {
      avatarBg: 'bg-red-200 dark:bg-red-800',
      avatarText: 'text-red-700 dark:text-red-300',
    },
  };
  return {
    ...styles[status],
    nameText: config.textColor,
  };
}

const displayedAttendees = computed(() => {
  if (!props.event.attendees) return [];
  return props.event.attendees.filter((a) => a.status === 'IN').slice(0, 5);
});

const remainingCount = computed(() => {
  if (!props.event.attendees) return 0;
  const inCount = props.event.attendees.filter((a) => a.status === 'IN').length;
  return Math.max(0, inCount - 5);
});

// Check if user is on waitlist and a spot opened up
const spotOpenedUp = computed(() => {
  return (
    props.event.userRsvpStatus === 'WAITLIST' &&
    props.event.rsvpCount < props.event.maxPlayers
  );
});
</script>

<template>
  <div
    :class="[
      'group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] text-left w-full cursor-pointer',
      statusConfig.bg,
      statusConfig.border,
      statusConfig.ring,
      'border',
    ]"
  >
    <!-- Spot opened up banner -->
    <div
      v-if="spotOpenedUp"
      class="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-white" />
        <span class="text-sm font-semibold text-white">A spot opened up!</span>
      </div>
      <button
        class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-semibold text-white transition-colors active:scale-95"
        :disabled="claiming"
        @click="handleClaimSpot"
      >
        {{ claiming ? 'Claiming...' : 'Claim Spot' }}
      </button>
    </div>

    <!-- Main content -->
    <div class="flex-1 p-4 min-w-0">
      <!-- Top row: Date/Time and Status (icon on right) -->
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-3 text-sm">
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ formatRelativeDay(event.datetime) }}
          </span>
          <span class="text-gray-400">·</span>
          <span class="text-gray-600 dark:text-gray-400">
            {{ formatTime(event.datetime, event.endDatetime) }}
          </span>
        </div>
        <div class="flex flex-col items-end gap-0.5">
          <div v-if="statusConfig.iconSolid" class="flex items-center gap-1.5">
            <span :class="['text-xs font-medium', statusConfig.textColor]">
              {{ statusConfig.label }}
            </span>
            <UIcon
              :name="statusConfig.iconSolid"
              :class="['w-4 h-4', statusConfig.iconColor]"
            />
          </div>
          <div
            v-if="event.isOrganizer"
            class="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400"
          >
            <span>Organizer</span>
            <UIcon name="i-heroicons-star-solid" class="w-3 h-3" />
          </div>
        </div>
      </div>

      <!-- Location row -->
      <div class="flex items-center gap-2 mb-3">
        <UIcon
          name="i-heroicons-map-pin"
          class="w-4 h-4 text-gray-400 shrink-0"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300 truncate">{{
          event.location
        }}</span>
      </div>

      <!-- Bottom row: Attendees + Count -->
      <div class="flex items-center justify-between gap-2">
        <!-- Attendees -->
        <div
          v-if="displayedAttendees.length > 0"
          class="flex items-start gap-1 flex-wrap min-w-0"
        >
          <div
            v-for="attendee in displayedAttendees"
            :key="attendee.id"
            class="flex flex-col justify-centergap-0.5 pr-2"
          >
            <div class="flex items-center gap-1">
              <span
                :class="[
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold',
                  getAttendeeStyle(attendee.status).avatarBg,
                  getAttendeeStyle(attendee.status).avatarText,
                ]"
              >
                {{ getInitial(attendee.name) }}
              </span>
              <span
                :class="['text-xs', getAttendeeStyle(attendee.status).nameText]"
              >
                {{ getFirstName(attendee.name) }}
              </span>
            </div>
            <div
              v-if="attendee.userId === event.organizer.id"
              class="text-[10px] font-medium text-primary-600 dark:text-primary-400 text-center"
            >
              Organizer
            </div>
          </div>
          <span v-if="remainingCount > 0" class="text-xs text-gray-400 ml-1">
            +{{ remainingCount }}
          </span>
        </div>
        <div v-else class="flex-1" />

        <!-- Player count -->
        <div class="shrink-0">
          <span class="text-lg font-bold text-primary-500">{{
            event.rsvpCount
          }}</span>
          <span class="text-xs text-gray-400">/{{ event.maxPlayers }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
