<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const showAuthModal = ref(false)
const route = useRoute()

// User dropdown menu items
const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: authStore.currentUser?.name || 'User',
      icon: 'i-heroicons-user-circle',
      type: 'label'
    },
    {
      label: authStore.currentUser?.phone || '',
      icon: 'i-heroicons-phone',
      type: 'label',
      disabled: true
    }
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: () => authStore.logout()
    }
  ]
])

// Get user initials for avatar
const userInitials = computed(() => {
  const name = authStore.currentUser?.name || ''
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})
</script>

<template>
  <div>
    <UHeader to="/" :toggle="false">
      <template #title>
        <span></span>
      </template>

      <template #right>
        <template v-if="authStore.isAuthenticated">
          <!-- Navigation tabs -->
          <div class="flex items-center gap-0.5 mr-2">
            <NuxtLink
              to="/"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="route.path === '/' ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <UIcon name="i-heroicons-calendar-days" class="w-4 h-4" />
              <span>Events</span>
            </NuxtLink>
            <NuxtLink
              to="/groups"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="route.path.startsWith('/groups') ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
              <span>Groups</span>
            </NuxtLink>
            <NuxtLink
              to="/create"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              :class="route.path === '/create' ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4" />
              <span>Create</span>
            </NuxtLink>
          </div>
          <!-- User dropdown -->
          <UDropdownMenu :items="userMenuItems" :content="{ align: 'end' }" :ui="{ content: 'min-w-48' }">
            <button class="flex items-center gap-1 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <UAvatar
                :text="userInitials"
                size="sm"
                class="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400"
              />
              <UIcon
                name="i-heroicons-chevron-down"
                class="w-3 h-3 text-gray-400"
              />
            </button>
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
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <AuthModal v-model:open="showAuthModal" />
  </div>
</template>
