<script setup lang="ts">
const authStore = useAuthStore()

// Initialize auth: on server returns immediately, on client awaits Firebase
// session restore. Suspense holds rendering until auth state is known.
await authStore.initialize()
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div id="recaptcha-container" class="absolute w-0 h-0 overflow-hidden"></div>
  </UApp>
</template>
