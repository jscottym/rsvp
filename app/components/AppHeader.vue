<script setup lang="ts">
const authStore = useAuthStore()
const showAuthModal = ref(false)
const showProfileModal = ref(false)

// Display name: prefer nickname, fallback to name
const displayName = computed(() => {
  const user = authStore.currentUser
  if (!user) return ''
  return user.nickname || user.name
})

const userMenuItems = computed(() => [
  [{
    label: 'Edit Profile',
    icon: 'i-heroicons-user-circle',
    onSelect: () => { showProfileModal.value = true }
  }],
  [{
    label: 'My Events',
    icon: 'i-heroicons-calendar-days',
    to: '/my-events'
  }],
  [{
    label: 'My Groups',
    icon: 'i-heroicons-user-group',
    to: '/groups'
  }],
  [{
    label: 'Sign Out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    onSelect: () => authStore.logout()
  }]
])
</script>

<template>
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
    <div class="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center">
        <span class="text-xl font-black tracking-tight text-gray-900 dark:text-white">RSVP</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <template v-if="authStore.isAuthenticated">
          <UDropdownMenu :items="userMenuItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              :label="displayName"
              trailing-icon="i-heroicons-chevron-down-20-solid"
            />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton
            color="primary"
            variant="soft"
            label="Sign In"
            @click="showAuthModal = true"
          />
        </template>
      </div>
    </div>

    <AuthModal v-model:open="showAuthModal" />
    <ProfileModal v-model:open="showProfileModal" />
  </header>
</template>
