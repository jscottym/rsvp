<script setup lang="ts">
const authStore = useAuthStore()

useSeoMeta({
  title: 'RSVP - Create and Join Events',
  description: 'Create events people can RSVP to, or RSVP to events others created.'
})
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center py-12">
    <!-- Simple tagline -->
    <p class="text-center text-lg text-gray-600 dark:text-gray-400 max-w-md mb-12">
      Create events people can RSVP to, or RSVP to events others created.
    </p>

    <!-- Massive Create Game button -->
    <NuxtLink
      to="/create"
      class="group relative px-16 py-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 active:scale-100"
    >
      <span class="text-3xl sm:text-4xl font-bold text-white">
        Create Game
      </span>
    </NuxtLink>

    <!-- Secondary link for authenticated users -->
    <div v-if="authStore.isAuthenticated" class="mt-8">
      <NuxtLink
        to="/my-events"
        class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        View my events
      </NuxtLink>
    </div>
  </div>
</template>
