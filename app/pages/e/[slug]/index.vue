<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import type { EventActivity } from '~/composables/useEventWebSocket';

type RsvpStatus = 'IN' | 'OUT' | 'MAYBE' | 'IN_IF' | 'WAITLIST';

const route = useRoute();
const router = useRouter();
const eventsStore = useEventsStore();
const authStore = useAuthStore();
const toast = useToast();

const slug = computed(() => route.params.slug as string);
const showAuthModal = ref(false);
const pendingRsvpStatus = ref<RsvpStatus | null>(null);
const rsvpLoading = ref(false);
const comment = ref('');
const selectedStatus = ref<RsvpStatus | null>(null);
const showDropOutModal = ref(false);
const droppingOut = ref(false);
const activeResponseTab = ref('in');
const isEditingNote = ref(false);
const noteInputRef = ref<HTMLInputElement | null>(null);
const showUndoButton = ref(false);
const undoTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null);

// Organizer features state
const showEditModal = ref(false);
const showDeleteModal = ref(false);
const showSaveGroupModal = ref(false);
const showEditWarningModal = ref(false);
const saving = ref(false);
const deleting = ref(false);
const savingGroup = ref(false);
const newGroupName = ref('');
const copied = ref(false);
const notifyingWaitlist = ref(false);

// Activity log state
const activities = ref<EventActivity[]>([]);
const activitiesLoading = ref(false);

const {
  data: eventData,
  pending,
  error,
} = await useAsyncData(
  `event-${slug.value}`,
  () => eventsStore.fetchEvent(slug.value),
  {
    watch: [slug],
  }
);

const event = computed(() => eventsStore.currentEvent);

// Fetch activities on mount
async function fetchActivities() {
  if (!slug.value) return;
  activitiesLoading.value = true;
  try {
    const response = await $fetch<{ activities: EventActivity[] }>(
      `/api/events/${slug.value}/activities`
    );
    activities.value = response.activities;
  } catch (e) {
    console.error('Failed to fetch activities:', e);
  } finally {
    activitiesLoading.value = false;
  }
}

// WebSocket for real-time updates
const { isConnected } = useEventWebSocket(slug, {
  onRsvpUpdate: (payload) => {
    // Don't apply updates from our own actions (they're already handled)
    if (payload.rsvp.userId === authStore.user?.id) return;

    eventsStore.applyRsvpUpdate(payload);
  },
  onEventUpdate: (payload) => {
    // Apply event updates from organizer edits
    eventsStore.applyEventUpdate(payload);
  },
  onActivity: (activity) => {
    // Add new activity to the top of the list
    // Avoid duplicates by checking ID
    if (!activities.value.find((a) => a.id === activity.id)) {
      activities.value = [activity, ...activities.value].slice(0, 50);
    }
  },
});

// Fetch activities when event is loaded
watch(
  event,
  (e) => {
    if (e) {
      fetchActivities();
    }
  },
  { immediate: true }
);

// Initialize from existing RSVP
watch(
  event,
  (e) => {
    if (e?.userRsvp) {
      selectedStatus.value = e.userRsvp.status;
      comment.value = e.userRsvp.comment || '';
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (undoTimeoutId.value) {
    clearTimeout(undoTimeoutId.value);
  }
});

const sortByUpdatedAt = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );

const rsvpsIn = computed(() =>
  sortByUpdatedAt(event.value?.rsvps?.filter((r) => r.status === 'IN') || [])
);
const rsvpsOut = computed(() =>
  sortByUpdatedAt(event.value?.rsvps?.filter((r) => r.status === 'OUT') || [])
);
const rsvpsMaybe = computed(() =>
  sortByUpdatedAt(
    event.value?.rsvps?.filter(
      (r) => r.status === 'MAYBE' || r.status === 'IN_IF'
    ) || []
  )
);
const rsvpsWaitlist = computed(() =>
  sortByUpdatedAt(
    event.value?.rsvps?.filter((r) => r.status === 'WAITLIST') || []
  )
);

// Active list based on tab
const activeRsvpList = computed(() => {
  switch (activeResponseTab.value) {
    case 'in':
      return rsvpsIn.value;
    case 'out':
      return rsvpsOut.value;
    case 'maybe':
      return rsvpsMaybe.value;
    case 'waitlist':
      return rsvpsWaitlist.value;
    default:
      return rsvpsIn.value;
  }
});

const activeTabColor = computed(() => {
  switch (activeResponseTab.value) {
    case 'in':
      return 'emerald';
    case 'out':
      return 'red';
    case 'maybe':
      return 'amber';
    case 'waitlist':
      return 'violet';
    default:
      return 'emerald';
  }
});

const responseTabs = computed(() => {
  const tabs: Array<{
    label: string;
    value: string;
    badge: {
      label: number;
      variant: 'soft';
      color: 'primary' | 'error' | 'warning' | 'info';
    };
  }> = [
    {
      label: 'In',
      value: 'in',
      badge: {
        label: rsvpsIn.value.length,
        variant: 'soft',
        color: 'primary',
      },
    },
  ];
  if (rsvpsWaitlist.value.length > 0) {
    tabs.push({
      label: 'Waitlist',
      value: 'waitlist',
      badge: {
        label: rsvpsWaitlist.value.length,
        variant: 'soft',
        color: 'info',
      },
    });
  }
  tabs.push(
    {
      label: 'Out',
      value: 'out',
      badge: {
        label: rsvpsOut.value.length,
        variant: 'soft',
        color: 'error',
      },
    },
    {
      label: 'Maybe',
      value: 'maybe',
      badge: {
        label: rsvpsMaybe.value.length,
        variant: 'soft',
        color: 'warning',
      },
    }
  );
  return tabs;
});

const isFull = computed(() => {
  if (!event.value) return false;
  return (event.value.rsvpCount ?? 0) >= event.value.maxPlayers;
});

const isConfirmed = computed(() => {
  if (event.value?.userRsvp?.status === 'IN') return true;
  // Fallback: check if user is in the rsvps list with IN status
  if (event.value?.rsvps && authStore.user?.id) {
    return event.value.rsvps.some(
      (r) => r.userId === authStore.user.id && r.status === 'IN'
    );
  }
  return false;
});
const isOnWaitlist = computed(() => {
  if (event.value?.userRsvp?.status === 'WAITLIST') return true;
  // Fallback: check if user is in the rsvps list with WAITLIST status
  if (event.value?.rsvps && authStore.user?.id) {
    return event.value.rsvps.some(
      (r) => r.userId === authStore.user.id && r.status === 'WAITLIST'
    );
  }
  return false;
});
const hasUserRsvp = computed(() => !!event.value?.userRsvp);
const hasWaitlist = computed(() => (event.value?.waitlistCount ?? 0) > 0);

const waitlistPosition = computed(() => {
  if (!isOnWaitlist.value || !event.value?.rsvps) return 0;
  const waitlistRsvps = event.value.rsvps.filter(
    (r) => r.status === 'WAITLIST'
  );
  const userIndex = waitlistRsvps.findIndex(
    (r) => r.userId === authStore.user?.id
  );
  return userIndex >= 0 ? userIndex + 1 : 0;
});

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

// Grace period: if user RSVP'd within last 60 seconds and no waitlist, they can silently drop out
const isWithinGracePeriod = computed(() => {
  if (!event.value?.userRsvp?.updatedAt) return false;
  const updatedAt = new Date(event.value.userRsvp.updatedAt).getTime();
  const now = Date.now();
  return now - updatedAt < 60000;
});

const canSilentDropOut = computed(
  () => isWithinGracePeriod.value && !hasWaitlist.value
);
const spotOpenedUp = computed(() => isOnWaitlist.value && !isFull.value);

const IN_IF_PREFIX = 'I can come if ';

const canSubmit = computed(() => {
  if (!selectedStatus.value) return false;
  if (selectedStatus.value === 'IN_IF') {
    const trimmed = comment.value.trim();
    if (!trimmed || trimmed === IN_IF_PREFIX.trim()) return false;
  }
  return true;
});

function hasUnsavedInIfComment() {
  const trimmed = comment.value.trim();
  return (
    trimmed === '' ||
    trimmed === IN_IF_PREFIX.trim() ||
    comment.value === IN_IF_PREFIX
  );
}

async function selectStatus(status: RsvpStatus) {
  const previousStatus = selectedStatus.value;

  // Clear comment if leaving IN_IF with unsaved/unmodified prefix
  if (
    previousStatus === 'IN_IF' &&
    status !== 'IN_IF' &&
    hasUnsavedInIfComment()
  ) {
    comment.value = '';
  }

  selectedStatus.value = status;

  if (status === 'IN_IF' && previousStatus !== 'IN_IF') {
    comment.value = IN_IF_PREFIX;
    await nextTick();
    noteInputRef.value?.focus();
    noteInputRef.value?.setSelectionRange(
      comment.value.length,
      comment.value.length
    );
  } else if (status !== 'IN_IF') {
    await autoSave();
    if (status === 'IN') {
      startUndoTimer();
    }
  }
}

function startUndoTimer() {
  if (undoTimeoutId.value) {
    clearTimeout(undoTimeoutId.value);
  }
  showUndoButton.value = true;
  undoTimeoutId.value = setTimeout(() => {
    showUndoButton.value = false;
    undoTimeoutId.value = null;
  }, 10000);
}

async function handleUndo() {
  if (undoTimeoutId.value) {
    clearTimeout(undoTimeoutId.value);
    undoTimeoutId.value = null;
  }
  showUndoButton.value = false;
  selectedStatus.value = null;
  comment.value = '';
  await eventsStore.submitRsvp(slug.value, 'OUT', undefined);
}

async function autoSave() {
  if (!selectedStatus.value) return;
  if (selectedStatus.value === 'IN_IF' && !comment.value.trim()) return;

  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = selectedStatus.value;
    showAuthModal.value = true;
    return;
  }

  await submitRsvp(true);
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = selectedStatus.value;
    showAuthModal.value = true;
    return;
  }

  await submitRsvp();
}

async function submitPendingRsvp() {
  if (pendingRsvpStatus.value) {
    selectedStatus.value = pendingRsvpStatus.value;
    await submitRsvp();
    pendingRsvpStatus.value = null;
  }
}

async function submitRsvp(isAutoSave = false) {
  if (!selectedStatus.value) return;
  rsvpLoading.value = true;

  try {
    await eventsStore.submitRsvp(
      slug.value,
      selectedStatus.value,
      comment.value || undefined
    );

    if (!isAutoSave) {
      const messages: Record<
        RsvpStatus,
        { title: string; description: string }
      > = {
        IN: { title: "You're in!", description: 'See you there!' },
        OUT: { title: 'Got it', description: "We'll miss you!" },
        MAYBE: {
          title: 'Response saved',
          description: "We'll hope to see you!",
        },
        IN_IF: { title: 'Response saved', description: 'Fingers crossed!' },
        WAITLIST: {
          title: "You're on the waitlist!",
          description: 'If someone drops out, you can join.',
        },
      };

      toast.add({
        title: messages[selectedStatus.value].title,
        description: messages[selectedStatus.value].description,
        color: 'success',
      });
    }
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to submit RSVP',
      color: 'error',
    });
  } finally {
    rsvpLoading.value = false;
  }
}

async function handleJoinWaitlist() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'WAITLIST';
    showAuthModal.value = true;
    return;
  }

  selectedStatus.value = 'WAITLIST';
  await submitRsvp();
}

async function handleDropOut(sendNotification: boolean) {
  droppingOut.value = true;

  try {
    let smsUrl: string | null = null;
    if (sendNotification) {
      try {
        const data = await eventsStore.getDropOutMessageData(slug.value);
        if (data.phones.length > 0) {
          smsUrl = data.smsUrl;
        }
      } catch (e) {
        console.error('Failed to get drop out message:', e);
      }
    }

    await eventsStore.submitRsvp(slug.value, 'OUT');
    selectedStatus.value = 'OUT';

    toast.add({
      title: 'Dropped out',
      description: "You've been removed from the confirmed list",
      color: 'success',
    });

    if (smsUrl) {
      window.open(smsUrl, '_blank');
    }

    showDropOutModal.value = false;
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to drop out',
      color: 'error',
    });
  } finally {
    droppingOut.value = false;
  }
}

async function handleSilentDropOut() {
  droppingOut.value = true;
  try {
    await eventsStore.submitRsvp(slug.value, 'OUT');
    selectedStatus.value = 'OUT';
    toast.add({
      title: 'Dropped out',
      description: "You've been removed from the confirmed list",
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to drop out',
      color: 'error',
    });
  } finally {
    droppingOut.value = false;
  }
}

async function handleClaimSpot() {
  if (!authStore.isAuthenticated) {
    pendingRsvpStatus.value = 'IN';
    showAuthModal.value = true;
    return;
  }

  rsvpLoading.value = true;
  try {
    await eventsStore.submitRsvp(slug.value, 'IN');
    selectedStatus.value = 'IN';
    toast.add({
      title: "You're in!",
      description: 'You claimed the spot!',
      color: 'success',
    });
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to claim spot',
      color: 'error',
    });
  } finally {
    rsvpLoading.value = false;
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function startEditingNote() {
  isEditingNote.value = true;
  nextTick(() => {
    noteInputRef.value?.focus();
  });
}

function saveNote() {
  isEditingNote.value = false;
  if (comment.value !== (event.value?.userRsvp?.comment || '')) {
    autoSave();
  }
}

function handleNoteKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveNote();
  }
  if (e.key === 'Escape') {
    isEditingNote.value = false;
    comment.value = event.value?.userRsvp?.comment || '';
  }
}

const hasUnsavedNote = computed(() => {
  return comment.value !== (event.value?.userRsvp?.comment || '');
});

function formatTime(datetime: string, endDatetime?: string) {
  const start = new Date(datetime);
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const startPeriod = startHour >= 12 ? 'pm' : 'am';
  const startHour12 = startHour % 12 || 12;
  const startTimeStr =
    startMinute === 0
      ? `${startHour12}`
      : `${startHour12}:${startMinute.toString().padStart(2, '0')}`;

  if (endDatetime) {
    const end = new Date(endDatetime);
    const endHour = end.getHours();
    const endMinute = end.getMinutes();
    const endPeriod = endHour >= 12 ? 'pm' : 'am';
    const endHour12 = endHour % 12 || 12;
    const endTimeStr =
      endMinute === 0
        ? `${endHour12}`
        : `${endHour12}:${endMinute.toString().padStart(2, '0')}`;

    if (startPeriod === endPeriod) {
      return `${startTimeStr}-${endTimeStr}${endPeriod}`;
    }
    return `${startTimeStr}${startPeriod}-${endTimeStr}${endPeriod}`;
  }
  return `${startTimeStr}${startPeriod}`;
}

function formatRelativeDay(datetime: string) {
  const eventDate = new Date(datetime);
  eventDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';

  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());
  const nextSunday = new Date(thisSunday);
  nextSunday.setDate(thisSunday.getDate() + 7);
  const sundayAfterNext = new Date(nextSunday);
  sundayAfterNext.setDate(nextSunday.getDate() + 7);

  if (eventDate >= thisSunday && eventDate < nextSunday) {
    return `This ${dayName}`;
  }
  if (eventDate >= nextSunday && eventDate < sundayAfterNext) {
    return `Next ${dayName}`;
  }
  return eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeAgo(datetime: string) {
  const date = new Date(datetime);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const displayedActivities = computed(() => activities.value.slice(0, 10));

interface CalendarDay {
  date: Date;
  dayNum: number;
  dayName: string;
  isToday: boolean;
  isEventDay: boolean;
  isWeekend: boolean;
  isPast: boolean;
}

const weekCalendar = computed(() => {
  if (!event.value) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(event.value.datetime);
  eventDate.setHours(0, 0, 0, 0);

  // Get Sunday of this week (week starts on Sunday)
  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());

  // Get Sunday of next week
  const nextSunday = new Date(thisSunday);
  nextSunday.setDate(thisSunday.getDate() + 7);

  // Get Sunday of event's week
  const eventSunday = new Date(eventDate);
  eventSunday.setDate(eventDate.getDate() - eventDate.getDay());

  function generateWeek(
    sunday: Date,
    weekLabel: string
  ): { label: string; days: CalendarDay[] } {
    const days: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      const dayOfWeek = date.getDay();
      days.push({
        date,
        dayNum: date.getDate(),
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        isToday: date.getTime() === today.getTime(),
        isEventDay: date.getTime() === eventDate.getTime(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isPast: date.getTime() < today.getTime(),
      });
    }
    return { label: weekLabel, days };
  }

  const isThisWeek = eventSunday.getTime() === thisSunday.getTime();
  const isNextWeek = eventSunday.getTime() === nextSunday.getTime();

  if (isThisWeek) {
    return {
      showNextWeek: false,
      weeks: [generateWeek(thisSunday, 'This Week')],
    };
  } else if (isNextWeek) {
    return {
      showNextWeek: true,
      weeks: [
        generateWeek(thisSunday, 'This Week'),
        generateWeek(nextSunday, 'Next Week'),
      ],
    };
  }

  // Event is further out - just show the event's week
  const eventWeekLabel = eventDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return {
    showNextWeek: false,
    weeks: [generateWeek(eventSunday, `Week of ${eventWeekLabel}`)],
  };
});

useSeoMeta({
  title: () => (event.value ? `${event.value.title} - RSVP` : 'Event - RSVP'),
  description: () =>
    event.value
      ? `Join ${event.value.title} at ${event.value.location}`
      : 'View event details',
});

// Organizer features

const eventUrl = computed(() => {
  if (import.meta.client) {
    return `${window.location.origin}/e/${slug.value}`;
  }
  return `/e/${slug.value}`;
});

const editFormData = computed(() => {
  if (!event.value) return undefined;
  const dt = new Date(event.value.datetime);
  const endDt = event.value.endDatetime
    ? new Date(event.value.endDatetime)
    : null;

  // Calculate duration in minutes
  let duration = 120; // default 2 hours
  if (endDt) {
    duration = Math.round((endDt.getTime() - dt.getTime()) / (1000 * 60));
  }

  return {
    date: dt.toISOString().split('T')[0],
    startTime: dt.toTimeString().slice(0, 5),
    duration,
    maxPlayers: event.value.maxPlayers,
    location: event.value.location,
    description: event.value.description || '',
    allowSharing: event.value.allowSharing,
  };
});

const hasRsvps = computed(() => (event.value?.rsvpCount ?? 0) > 0);

// Format time for share message (e.g., "6am", "6:30am", "11:00am")
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

// Generate share message like "This Wed 6-8am? Looking for 3."
function generateShareMessage(): string {
  if (!event.value) return '';

  const eventDate = new Date(event.value.datetime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );
  const diffDays = Math.floor(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const thisSunday = new Date(today);
  thisSunday.setDate(today.getDate() - today.getDay());
  const nextSunday = new Date(thisSunday);
  nextSunday.setDate(thisSunday.getDate() + 7);
  const sundayAfterNext = new Date(nextSunday);
  sundayAfterNext.setDate(nextSunday.getDate() + 7);

  // Format the day part
  let dayStr: string;
  const isEvening = eventDate.getHours() >= 17;
  const weekday = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

  if (diffDays === 0) {
    dayStr = isEvening ? 'Tonight' : 'Today';
  } else if (diffDays === 1) {
    dayStr = 'Tomorrow';
  } else if (eventDay >= thisSunday && eventDay < nextSunday) {
    dayStr = `This ${weekday}`;
  } else if (eventDay >= nextSunday && eventDay < sundayAfterNext) {
    dayStr = `Next ${weekday}`;
  } else {
    dayStr = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  // Format time range
  const startTime = formatShareTime(event.value.datetime);
  const endTime = event.value.endDatetime
    ? formatShareTime(event.value.endDatetime)
    : '';
  const timeStr = endTime ? `${startTime}-${endTime}` : startTime;

  // Calculate spots needed
  const spotsNeeded = event.value.maxPlayers - (event.value.rsvpCount || 0);

  return `${dayStr} ${timeStr}? Looking for ${spotsNeeded}.`;
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(eventUrl.value);
    copied.value = true;
    toast.add({ title: 'Link copied!', color: 'success' });
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    toast.add({ title: 'Failed to copy', color: 'error' });
  }
}

function shareViaSms() {
  const message = generateShareMessage();
  const text = `${message}\n${eventUrl.value}`;
  window.open(`sms:?body=${encodeURIComponent(text)}`);
}

function shareViaEmail() {
  const message = generateShareMessage();
  const subject = message;
  const body = `${message}\n\n${eventUrl.value}`;
  window.open(
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  );
}

const shareMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Copy link',
      icon: copied.value
        ? 'i-heroicons-check'
        : 'i-heroicons-clipboard-document',
      onSelect: () => copyLink(),
    },
    {
      label: 'Text message',
      icon: 'i-heroicons-chat-bubble-left-ellipsis',
      onSelect: () => shareViaSms(),
    },
    {
      label: 'Email',
      icon: 'i-heroicons-envelope',
      onSelect: () => shareViaEmail(),
    },
  ],
]);

async function textPlayers() {
  try {
    const data = await eventsStore.getWaitlistNotifyData(slug.value);
    // Use confirmed player phones (all IN status)
    const response = await $fetch<{
      rsvps: Array<{ status: string; phone: string | null }>;
    }>(`/api/events/${slug.value}/rsvps`, {
      headers: { Authorization: `Bearer ${await authStore.getIdToken()}` },
    });
    const confirmedPhones = response.rsvps
      .filter((r) => r.status === 'IN' && r.phone)
      .map((r) => r.phone!);

    if (confirmedPhones.length === 0) {
      toast.add({
        title: 'No phone numbers',
        description: 'No confirmed players have phone numbers',
        color: 'warning',
      });
      return;
    }

    const message = `Hey! Quick update about ${event.value?.title || 'our game'}...`;
    const smsUrl = `sms:${confirmedPhones.join(',')}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to get player phones',
      color: 'error',
    });
  }
}

async function notifyWaitlist() {
  notifyingWaitlist.value = true;
  try {
    const data = await eventsStore.getWaitlistNotifyData(slug.value);
    if (data.phones.length > 0) {
      window.open(data.smsUrl, '_blank');
    } else {
      toast.add({
        title: 'No one on waitlist',
        description: 'There are no phone numbers to notify',
        color: 'warning',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to get waitlist data',
      color: 'error',
    });
  } finally {
    notifyingWaitlist.value = false;
  }
}

const manageMenuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[][] = [
    [
      {
        label: 'Edit event',
        icon: 'i-heroicons-pencil-square',
        onSelect: () => handleEditClick(),
      },
      {
        label: 'Text players',
        icon: 'i-heroicons-chat-bubble-left-ellipsis',
        onSelect: () => textPlayers(),
      },
    ],
  ];

  // Add waitlist notification if there are people on waitlist
  if (rsvpsWaitlist.value.length > 0) {
    items[0]!.push({
      label: 'Notify waitlist',
      icon: 'i-heroicons-megaphone',
      onSelect: () => notifyWaitlist(),
    });
  }

  // Add save to group and delete in separate groups
  items.push([
    {
      label: 'Save to group',
      icon: 'i-heroicons-user-group',
      onSelect: () => {
        showSaveGroupModal.value = true;
      },
    },
  ]);

  items.push([
    {
      label: 'Delete event',
      icon: 'i-heroicons-trash',
      color: 'error' as const,
      onSelect: () => {
        showDeleteModal.value = true;
      },
    },
  ]);

  return items;
});

function handleEditClick() {
  if (hasRsvps.value) {
    showEditWarningModal.value = true;
  } else {
    showEditModal.value = true;
  }
}

function confirmEdit() {
  showEditWarningModal.value = false;
  showEditModal.value = true;
}

interface EventFormData {
  date: string;
  startTime: string;
  duration: number;
  maxPlayers: number;
  location: string;
  description: string;
  allowSharing: boolean;
}

async function saveEvent(formData: EventFormData) {
  saving.value = true;
  try {
    const datetime = new Date(
      `${formData.date}T${formData.startTime}`
    ).toISOString();

    // Calculate end time from duration
    const [h, m] = formData.startTime.split(':').map(Number) as [
      number,
      number,
    ];
    const totalMinutes = h * 60 + m + formData.duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    const endDatetime = new Date(`${formData.date}T${endTime}`).toISOString();

    await eventsStore.updateEvent(slug.value, {
      location: formData.location,
      datetime,
      endDatetime,
      minPlayers: formData.maxPlayers,
      maxPlayers: formData.maxPlayers,
      description: formData.description || undefined,
      allowSharing: formData.allowSharing,
    });

    toast.add({ title: 'Event updated!', color: 'success' });
    showEditModal.value = false;

    // Refresh event data
    await eventsStore.fetchEvent(slug.value);
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to update event',
      color: 'error',
    });
  } finally {
    saving.value = false;
  }
}

async function saveToGroup() {
  savingGroup.value = true;
  try {
    const token = await authStore.getIdToken();

    await $fetch('/api/groups/from-event', {
      method: 'POST',
      body: {
        eventSlug: slug.value,
        groupName: newGroupName.value.trim(),
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    toast.add({
      title: 'Group created!',
      description: `${rsvpsIn.value.length} contacts saved`,
      color: 'success',
    });

    showSaveGroupModal.value = false;
    newGroupName.value = '';
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to create group',
      color: 'error',
    });
  } finally {
    savingGroup.value = false;
  }
}

async function deleteEvent() {
  deleting.value = true;
  try {
    await eventsStore.deleteEvent(slug.value);
    toast.add({ title: 'Event deleted', color: 'success' });
    router.push('/');
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.data?.message || 'Failed to delete event',
      color: 'error',
    });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-6">
    <!-- Loading Skeleton -->
    <div v-if="pending" class="space-y-6">
      <!-- Header skeleton -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <USkeleton class="h-5 w-32" />
          <USkeleton class="h-5 w-28" />
        </div>
        <!-- Calendar skeleton -->
        <div class="flex gap-1">
          <USkeleton v-for="i in 7" :key="i" class="h-14 flex-1 rounded-lg" />
        </div>
      </div>

      <!-- RSVP section skeleton -->
      <div class="space-y-3">
        <USkeleton class="h-5 w-24" />
        <div class="flex gap-2">
          <USkeleton v-for="i in 4" :key="i" class="h-16 flex-1 rounded-xl" />
        </div>
      </div>

      <!-- Progress skeleton -->
      <div class="flex items-center gap-4">
        <USkeleton class="h-3 w-24 rounded-full" />
        <USkeleton class="h-4 w-16" />
      </div>

      <!-- Responses skeleton -->
      <div class="space-y-2">
        <USkeleton class="h-8 w-full rounded-lg" />
        <USkeleton class="h-12 w-full rounded-lg" />
        <USkeleton class="h-12 w-full rounded-lg" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="py-12 text-center">
      <UIcon
        name="i-heroicons-exclamation-circle"
        class="mx-auto mb-4 h-12 w-12 text-red-500"
      />
      <h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Event Not Found
      </h2>
      <p class="mb-4 text-gray-600 dark:text-gray-400">
        This event may have been deleted or the link is incorrect.
      </p>
      <UButton to="/" color="primary" variant="soft">Back to Home</UButton>
    </div>

    <!-- Event Content -->
    <template v-else-if="event">
      <!-- Sharing Note Banner -->
      <UAlert
        v-if="event.sharingNote"
        color="warning"
        variant="soft"
        class="mb-4"
        icon="i-heroicons-information-circle"
        :title="event.sharingNote"
      />

      <!-- Full Event Banner -->
      <UAlert
        v-if="isFull"
        color="warning"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="This event is full"
      />

      <!--  Header -->
      <div class="mb-6">
        <!-- Location and Time -->
        <div class="mb-3 flex items-center justify-between">
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="truncate font-bold text-gray-900 dark:text-white">{{
              event.location
            }}</span>
          </div>
          <div class="flex flex-shrink-0 items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400"
              ><span class="text-primary-500 font-medium">{{
                formatRelativeDay(event.datetime)
              }}</span>
              · {{ formatTime(event.datetime, event.endDatetime) }}</span
            >
            <!-- Share Dropdown -->
            <UDropdownMenu v-if="event.allowSharing" :items="shareMenuItems">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-share"
              />
            </UDropdownMenu>
            <!-- Manage Dropdown (Organizer only) -->
            <UDropdownMenu v-if="event.isOrganizer" :items="manageMenuItems">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-ellipsis-vertical"
              />
            </UDropdownMenu>
          </div>
        </div>

        <p
          v-if="event.description"
          class="mt-3 text-sm text-gray-600 dark:text-gray-400"
        >
          {{ event.description }}
        </p>

        <!-- Week Calendar -->
        <div v-if="weekCalendar" class="mt-4">
          <div
            v-for="(week, weekIndex) in weekCalendar.weeks"
            :key="weekIndex"
            class="mb-2"
          >
            <p
              v-if="weekCalendar.showNextWeek"
              class="mb-1 text-xs font-medium text-gray-500"
            >
              {{ week.label }}
            </p>
            <div class="flex gap-1">
              <div
                v-for="day in week.days"
                :key="day.dayNum"
                :class="[
                  'flex flex-1 flex-col items-center rounded-lg py-1.5 text-xs transition-all',
                  day.isEventDay
                    ? 'bg-primary-500 ring-primary-300 font-bold text-white ring-2 ring-offset-1'
                    : day.isToday
                      ? 'bg-gray-300 font-semibold dark:bg-gray-600'
                      : day.isWeekend
                        ? 'bg-gray-50 text-gray-400 dark:bg-gray-800/40'
                        : day.isPast
                          ? 'text-gray-400 dark:text-gray-600'
                          : 'text-gray-700 dark:text-gray-300',
                ]"
              >
                <span
                  class="text-[10px] leading-tight"
                  :class="day.isEventDay ? 'text-white/80' : ''"
                  >{{ day.dayName }}</span
                >
                <span class="text-sm leading-tight">{{ day.dayNum }}</span>
                <span
                  v-if="day.isEventDay"
                  class="text-[9px] leading-tight font-medium text-white/90"
                  >Event</span
                >
                <span
                  v-else-if="day.isToday"
                  class="text-primary-500 text-[9px] leading-tight font-medium"
                  >Today</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RSVP Section -->
      <div class="mb-6 space-y-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isConfirmed ? 'See you there!' : 'Are you in?' }}
        </h2>

        <!-- Compact RSVP Buttons -->
        <template v-if="true">
          <!-- Confirmed state banner -->
          <div
            v-if="isConfirmed"
            class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-check-circle-solid"
                class="h-5 w-5 text-emerald-500"
              />
              <span class="font-medium text-emerald-700 dark:text-emerald-300"
                >You're in!</span
              >
            </div>
            <UButton
              v-if="showUndoButton"
              color="neutral"
              variant="outline"
              size="md"
              icon="i-heroicons-arrow-uturn-left"
              :disabled="droppingOut"
              @click="handleUndo"
              label="Undo"
            />
            <UButton
              v-else
              color="error"
              variant="outline"
              size="md"
              icon="i-heroicons-x-mark"
              :disabled="droppingOut"
              @click="
                canSilentDropOut
                  ? handleSilentDropOut()
                  : (showDropOutModal = true)
              "
              label="Drop out"
            />
          </div>

          <!-- Spot opened up banner -->
          <div
            v-else-if="spotOpenedUp"
            class="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-4 dark:bg-emerald-900/20"
          >
            <div class="mb-3 flex items-center gap-3">
              <UIcon
                name="i-heroicons-sparkles"
                class="h-6 w-6 text-emerald-600"
              />
              <div class="flex-1">
                <p class="font-semibold text-emerald-900 dark:text-emerald-100">
                  A spot opened up!
                </p>
                <p class="text-sm text-emerald-700 dark:text-emerald-300">
                  Claim it before someone else does
                </p>
              </div>
            </div>
            <UButton
              color="primary"
              size="lg"
              block
              :loading="rsvpLoading"
              @click="handleClaimSpot"
            >
              Claim This Spot
            </UButton>
          </div>

          <!-- Response buttons row -->
          <div v-if="!isConfirmed && !spotOpenedUp" class="flex gap-2">
            <!-- Waitlist position (replaces I'm In when on waitlist) -->
            <div
              v-if="isOnWaitlist"
              class="flex flex-1 flex-col items-center gap-1 rounded-xl bg-violet-100 px-2 py-3 ring-2 ring-violet-500 dark:bg-violet-900/30"
            >
              <UIcon name="i-heroicons-clock" class="h-6 w-6 text-violet-500" />
              <span
                class="text-center text-xs font-medium text-violet-700 dark:text-violet-300"
              >
                {{ getOrdinalSuffix(waitlistPosition) }} on waitlist
              </span>
            </div>
            <!-- I'm In / Join Waitlist -->
            <button
              v-else
              type="button"
              :class="[
                'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all',
                isFull
                  ? selectedStatus === 'WAITLIST'
                    ? 'bg-violet-100 ring-2 ring-violet-500 dark:bg-violet-900/30'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800'
                  : selectedStatus === 'IN'
                    ? 'bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/30'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800',
              ]"
              @click="isFull ? handleJoinWaitlist() : selectStatus('IN')"
            >
              <UIcon
                :name="
                  isFull
                    ? selectedStatus === 'WAITLIST'
                      ? 'i-heroicons-clock-solid'
                      : 'i-heroicons-clock'
                    : selectedStatus === 'IN'
                      ? 'i-heroicons-check-circle-solid'
                      : 'i-heroicons-check-circle'
                "
                :class="[
                  'h-6 w-6',
                  isFull
                    ? selectedStatus === 'WAITLIST'
                      ? 'text-violet-500'
                      : 'text-gray-400'
                    : selectedStatus === 'IN'
                      ? 'text-emerald-500'
                      : 'text-gray-400',
                ]"
              />
              <span
                :class="[
                  'text-xs font-medium',
                  isFull
                    ? selectedStatus === 'WAITLIST'
                      ? 'text-violet-700 dark:text-violet-300'
                      : 'text-gray-600 dark:text-gray-400'
                    : selectedStatus === 'IN'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-gray-600 dark:text-gray-400',
                ]"
              >
                {{ isFull ? 'Join Waitlist' : "I'm In" }}
              </span>
            </button>

            <!-- Out -->
            <button
              type="button"
              :class="[
                'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all',
                selectedStatus === 'OUT'
                  ? 'bg-red-100 ring-2 ring-red-500 dark:bg-red-900/30'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800',
              ]"
              @click="selectStatus('OUT')"
            >
              <UIcon
                :name="
                  selectedStatus === 'OUT'
                    ? 'i-heroicons-x-circle-solid'
                    : 'i-heroicons-x-circle'
                "
                :class="[
                  'h-6 w-6',
                  selectedStatus === 'OUT' ? 'text-red-500' : 'text-gray-400',
                ]"
              />
              <span
                :class="[
                  'text-xs font-medium',
                  selectedStatus === 'OUT'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-600 dark:text-gray-400',
                ]"
              >
                Out
              </span>
            </button>

            <!-- Maybe -->
            <button
              type="button"
              :class="[
                'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all',
                selectedStatus === 'MAYBE'
                  ? 'bg-amber-100 ring-2 ring-amber-500 dark:bg-amber-900/30'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800',
              ]"
              @click="selectStatus('MAYBE')"
            >
              <UIcon
                :name="
                  selectedStatus === 'MAYBE'
                    ? 'i-heroicons-question-mark-circle-solid'
                    : 'i-heroicons-question-mark-circle'
                "
                :class="[
                  'h-6 w-6',
                  selectedStatus === 'MAYBE'
                    ? 'text-amber-500'
                    : 'text-gray-400',
                ]"
              />
              <span
                :class="[
                  'text-xs font-medium',
                  selectedStatus === 'MAYBE'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-gray-600 dark:text-gray-400',
                ]"
              >
                Maybe
              </span>
            </button>

            <!-- In If... -->
            <button
              type="button"
              :class="[
                'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 transition-all',
                selectedStatus === 'IN_IF'
                  ? 'bg-blue-100 ring-2 ring-blue-500 dark:bg-blue-900/30'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800',
              ]"
              @click="selectStatus('IN_IF')"
            >
              <UIcon
                :name="
                  selectedStatus === 'IN_IF'
                    ? 'i-heroicons-chat-bubble-left-ellipsis-solid'
                    : 'i-heroicons-chat-bubble-left-ellipsis'
                "
                :class="[
                  'h-6 w-6',
                  selectedStatus === 'IN_IF'
                    ? 'text-blue-500'
                    : 'text-gray-400',
                ]"
              />
              <span
                :class="[
                  'text-xs font-medium',
                  selectedStatus === 'IN_IF'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400',
                ]"
              >
                I'm In If...
              </span>
            </button>
          </div>

          <!-- Streamlined Note Field -->
          <div v-if="selectedStatus || isConfirmed" class="mt-1">
            <!-- Editing state -->
            <div
              v-if="isEditingNote || selectedStatus === 'IN_IF'"
              class="relative"
            >
              <input
                ref="noteInputRef"
                v-model="comment"
                type="text"
                :placeholder="
                  selectedStatus === 'IN_IF'
                    ? 'What needs to happen?'
                    : 'Add a note...'
                "
                class="focus:border-primary-500 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 pr-20 text-gray-900 placeholder-gray-400 transition-colors focus:ring-0 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                @keydown="handleNoteKeydown"
                @blur="selectedStatus !== 'IN_IF' && saveNote()"
              />
              <div
                v-if="comment.trim()"
                class="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1"
              >
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                  @click="
                    comment = '';
                    noteInputRef?.focus();
                  "
                >
                  <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1.5 transition-colors"
                  :class="
                    hasUnsavedNote
                      ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      : 'text-emerald-500'
                  "
                  @click="saveNote"
                >
                  <UIcon
                    :name="
                      hasUnsavedNote
                        ? 'i-heroicons-arrow-up-circle-solid'
                        : 'i-heroicons-check-circle-solid'
                    "
                    class="h-5 w-5"
                  />
                </button>
              </div>
            </div>

            <!-- Display state (not editing, has note) -->
            <button
              v-else-if="comment && !isEditingNote"
              type="button"
              class="group flex w-full items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
              @click="startEditingNote"
            >
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="h-4 w-4 flex-shrink-0 text-gray-400"
              />
              <span
                class="flex-1 truncate text-sm text-gray-600 italic dark:text-gray-400"
                >"{{ comment }}"</span
              >
              <UIcon
                name="i-heroicons-pencil"
                class="h-4 w-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>

            <!-- Add note button (no note yet) -->
            <button
              v-else
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="startEditingNote"
            >
              <UIcon name="i-heroicons-plus" class="h-4 w-4" />
              Add note
            </button>
          </div>

          <!-- Submit for IN_IF -->
          <UButton
            v-if="selectedStatus === 'IN_IF' && canSubmit"
            color="primary"
            size="xl"
            block
            :loading="rsvpLoading"
            icon="i-heroicons-check"
            @click="handleSubmit"
          >
            Save
          </UButton>
        </template>
      </div>

      <!-- Responses Section with Tabs -->
      <div v-if="event.rsvps && event.rsvps.length > 0" class="mt-8">
        <UTabs
          v-model="activeResponseTab"
          :items="responseTabs"
          :content="false"
          variant="link"
          class="w-full"
        />

        <!-- Response List with animations -->
        <div class="mt-4">
          <div
            v-if="activeRsvpList.length === 0"
            class="py-6 text-center text-gray-500"
          >
            No responses yet
          </div>
          <TransitionGroup name="rsvp-list" tag="div" class="space-y-2">
            <div
              v-for="rsvp in activeRsvpList"
              :key="rsvp.id"
              :class="[
                'rounded-lg px-3 py-2 transition-all duration-200',
                activeResponseTab === 'in'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : '',
                activeResponseTab === 'out'
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : '',
                activeResponseTab === 'maybe'
                  ? 'bg-amber-50 dark:bg-amber-900/20'
                  : '',
                activeResponseTab === 'waitlist'
                  ? 'bg-violet-50 dark:bg-violet-900/20'
                  : '',
              ]"
            >
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    activeResponseTab === 'in'
                      ? 'bg-emerald-200 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-300'
                      : '',
                    activeResponseTab === 'out'
                      ? 'bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300'
                      : '',
                    activeResponseTab === 'maybe'
                      ? 'bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-300'
                      : '',
                    activeResponseTab === 'waitlist'
                      ? 'bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300'
                      : '',
                  ]"
                >
                  {{ getInitials(rsvp.name) }}
                </span>
                <span
                  :class="[
                    'text-sm',
                    activeResponseTab === 'in'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : '',
                    activeResponseTab === 'out'
                      ? 'text-red-700 dark:text-red-300'
                      : '',
                    activeResponseTab === 'maybe'
                      ? 'text-amber-700 dark:text-amber-300'
                      : '',
                    activeResponseTab === 'waitlist'
                      ? 'text-violet-700 dark:text-violet-300'
                      : '',
                  ]"
                >
                  {{ rsvp.name }}
                </span>
                <UBadge
                  v-if="rsvp.status === 'IN_IF'"
                  label="If..."
                  color="info"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  v-if="rsvp.userId === event.organizer?.id"
                  label="Organizer"
                  color="primary"
                  variant="subtle"
                  size="xs"
                />
              </div>
              <p
                v-if="rsvp.comment"
                :class="[
                  'mt-1 pl-8 text-sm italic',
                  activeResponseTab === 'in'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : '',
                  activeResponseTab === 'out'
                    ? 'text-red-600 dark:text-red-400'
                    : '',
                  activeResponseTab === 'maybe'
                    ? 'text-amber-600 dark:text-amber-400'
                    : '',
                  activeResponseTab === 'waitlist'
                    ? 'text-violet-600 dark:text-violet-400'
                    : '',
                ]"
              >
                "{{ rsvp.comment }}"
              </p>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Activity Log Section -->
      <div
        v-if="displayedActivities.length > 0"
        class="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Recent Activity
          </h3>
          <div v-if="isConnected" class="flex items-center gap-1.5">
            <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span class="text-xs text-gray-400">Live</span>
          </div>
        </div>
        <TransitionGroup name="activity-list" tag="ul" class="space-y-2">
          <li
            v-for="activity in displayedActivities"
            :key="activity.id"
            class="text-sm"
          >
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'h-1.5 w-1.5 flex-shrink-0 rounded-full',
                  activity.type === 'RSVP_IN' ? 'bg-emerald-500' : '',
                  activity.type === 'RSVP_OUT' ? 'bg-red-500' : '',
                  activity.type === 'RSVP_MAYBE' ? 'bg-amber-500' : '',
                  activity.type === 'RSVP_WAITLIST' ? 'bg-violet-500' : '',
                  activity.type === 'RSVP_IN_IF' ? 'bg-blue-500' : '',
                  activity.type === 'EVENT_EDITED' ? 'bg-gray-500' : '',
                ]"
              />
              <span class="text-gray-700 dark:text-gray-300">{{
                activity.message
              }}</span>
              <span class="ml-auto flex-shrink-0 text-xs text-gray-400">{{
                formatTimeAgo(activity.createdAt)
              }}</span>
            </div>
            <p
              v-if="activity.comment"
              class="mt-0.5 ml-3.5 truncate text-xs text-gray-500 italic dark:text-gray-400"
            >
              "{{ activity.comment }}"
            </p>
          </li>
        </TransitionGroup>
      </div>
    </template>

    <!-- Auth Modal -->
    <AuthModal
      v-model:open="showAuthModal"
      @authenticated="submitPendingRsvp"
    />

    <!-- Drop Out Modal -->
    <UModal v-model:open="showDropOutModal" title="Drop Out">
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to drop out of this event?
        </p>
        <p
          v-if="hasWaitlist && event"
          class="mt-2 text-sm text-violet-600 dark:text-violet-400"
        >
          There {{ (event.waitlistCount ?? 0) === 1 ? 'is' : 'are' }}
          {{ event.waitlistCount ?? 0 }}
          {{ (event.waitlistCount ?? 0) === 1 ? 'person' : 'people' }} on the
          waitlist who could take your spot.
        </p>
        <p v-else class="mt-2 text-sm text-gray-500">
          You can send a text to let the other players know.
        </p>
      </template>
      <template #footer>
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showDropOutModal = false"
          />
          <UButton
            color="error"
            variant="soft"
            label="Just Drop Out"
            :loading="droppingOut"
            @click="handleDropOut(false)"
          />
          <UButton
            color="primary"
            :label="
              hasWaitlist ? 'Drop Out & Text Everyone' : 'Drop Out & Send Text'
            "
            :loading="droppingOut"
            @click="handleDropOut(true)"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit Warning Modal -->
    <UModal v-model:open="showEditWarningModal" title="Edit Event?">
      <template #body>
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="h-5 w-5 text-amber-600"
            />
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">
              {{ event?.rsvpCount ?? 0 }}
              {{ (event?.rsvpCount ?? 0) === 1 ? 'person has' : 'people have' }}
              already RSVP'd to this event.
            </p>
            <p class="mt-2 text-sm text-gray-500">
              Editing may cause confusion. Changes will be logged in the
              activity feed.
            </p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showEditWarningModal = false"
          />
          <UButton color="primary" label="Edit Anyway" @click="confirmEdit" />
        </div>
      </template>
    </UModal>

    <!-- Edit Event Slideover -->
    <USlideover
      v-model:open="showEditModal"
      title="Edit Event"
      side="right"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #body>
        <div class="px-4 pt-4">
          <EventForm
            :initial-data="editFormData"
            :submitting="saving"
            submit-label="Save Changes"
            inline
            @submit="saveEvent"
            @cancel="showEditModal = false"
          />
        </div>
      </template>
      <template #footer>
        <div
          class="flex justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <UButton
            color="error"
            variant="ghost"
            label="Delete Event"
            @click="
              showDeleteModal = true;
              showEditModal = false;
            "
          />
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showEditModal = false"
          />
        </div>
      </template>
    </USlideover>

    <!-- Save to Group Modal -->
    <UModal v-model:open="showSaveGroupModal" title="Save to Group">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Group Name">
            <UInput
              v-model="newGroupName"
              placeholder="e.g., Sunday Hoopers"
              size="lg"
            />
          </UFormField>
          <p class="text-sm text-gray-500">
            {{ rsvpsIn.length }} contacts will be added to this group.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showSaveGroupModal = false"
          />
          <UButton
            color="primary"
            label="Create Group"
            :loading="savingGroup"
            :disabled="!newGroupName.trim()"
            @click="saveToGroup"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Event">
      <template #body>
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete this event? This action cannot be
          undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="showDeleteModal = false"
          />
          <UButton
            color="error"
            label="Delete Event"
            :loading="deleting"
            @click="deleteEvent"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
/* RSVP list animations */
.rsvp-list-enter-active,
.rsvp-list-leave-active {
  transition: all 0.3s ease;
}
.rsvp-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.rsvp-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.rsvp-list-move {
  transition: transform 0.3s ease;
}

/* Activity list animations */
.activity-list-enter-active,
.activity-list-leave-active {
  transition: all 0.3s ease;
}
.activity-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.activity-list-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.activity-list-move {
  transition: transform 0.3s ease;
}
</style>
