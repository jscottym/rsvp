<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const authStore = useAuthStore();
const eventsStore = useEventsStore();
const router = useRouter();
const toast = useToast();

const showAuthModal = ref(false);
const submitting = ref(false);
const eventFormRef = ref<InstanceType<typeof EventForm> | null>(null);
const pendingFormData = ref<EventFormData | null>(null);

// Persist location in localStorage
const savedLocation = useLocalStorage('rsvp-games-last-location', '');

// Initial form data with saved location
const initialFormData = computed(() => ({
  location: savedLocation.value,
}));

interface EventFormData {
  date: string;
  startTime: string;
  duration: number;
  maxPlayers: number;
  location: string;
  description: string;
  allowSharing: boolean;
  timezone: string;
}

async function handleFormSubmit(formData: EventFormData) {
  // Save location for next time
  savedLocation.value = formData.location;

  if (!authStore.isAuthenticated) {
    pendingFormData.value = formData;
    showAuthModal.value = true;
    return;
  }

  await createEvent(formData);
}

async function submitAfterAuth() {
  if (pendingFormData.value) {
    await createEvent(pendingFormData.value);
    pendingFormData.value = null;
  }
}

async function createEvent(formData: EventFormData) {
  submitting.value = true;

  try {
    // Calculate end time from duration
    const [h, m] = formData.startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + formData.duration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const datetime = new Date(
      `${formData.date}T${formData.startTime}`
    ).toISOString();
    const endDatetime = new Date(`${formData.date}T${endTime}`).toISOString();

    const event = await eventsStore.createEvent({
      title: '🏸 Pickleball Game',
      sportType: 'pickleball',
      description: formData.description.trim() || undefined,
      location: formData.location.trim(),
      datetime,
      endDatetime,
      minPlayers: formData.maxPlayers,
      maxPlayers: formData.maxPlayers,
      allowSharing: formData.allowSharing,
      timezone: formData.timezone,
    });

    toast.add({
      title: 'Game On!',
      description: 'Share the link to get players',
      color: 'success',
    });

    router.push(`/e/${event.slug}`);
  } catch (error: any) {
    toast.add({
      title: 'Oops!',
      description: error.data?.message || 'Something went wrong',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}

useSeoMeta({
  title: 'Create Game - RSVP',
});
</script>

<template>
  <div class="max-w-lg mx-auto px-4 py-6">
    <EventForm
      ref="eventFormRef"
      :initial-data="initialFormData"
      :submitting="submitting"
      @submit="handleFormSubmit"
    />

    <!-- Auth Modal -->
    <AuthModal v-model:open="showAuthModal" @authenticated="submitAfterAuth" />
  </div>
</template>
