<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader />
      <main class="pb-safe">
        <NuxtPage />
      </main>
    </div>
    <UNotifications />
    <div id="recaptcha-container"></div>
  </UApp>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

onMounted(() => {
  authStore.initialize()
})
</script>
