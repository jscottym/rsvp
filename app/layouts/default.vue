<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const authStore = useAuthStore()
const showAuthModal = ref(false)
const route = useRoute()

const userMenuItems = computed(() => [
  [{
    label: 'My Events',
    icon: 'i-heroicons-calendar-days',
    to: '/'
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

const mobileMenuItems = computed<NavigationMenuItem[][]>(() => {
  if (!authStore.isAuthenticated) {
    return [[
      {
        label: 'Sign In',
        icon: 'i-heroicons-arrow-right-end-on-rectangle',
        onSelect: () => { showAuthModal.value = true }
      }
    ]]
  }

  return [
    [
      {
        label: 'Create Game',
        icon: 'i-heroicons-plus-circle',
        to: '/create'
      },
      {
        label: 'My Events',
        icon: 'i-heroicons-calendar-days',
        to: '/'
      },
      {
        label: 'My Groups',
        icon: 'i-heroicons-user-group',
        to: '/groups'
      }
    ],
    [
      {
        label: 'Sign Out',
        icon: 'i-heroicons-arrow-right-on-rectangle',
        onSelect: () => authStore.logout()
      }
    ]
  ]
})
</script>

<template>
  <div>
    <UHeader title="RSVP" to="/" :toggle="false">
      <template #title>
        <NuxtLink to="/" class="flex items-center">
          <span class="text-xl font-black tracking-tight text-gray-900 dark:text-white">RSVP</span>
        </NuxtLink>
      </template>

      <template #right>
        <template v-if="authStore.isAuthenticated">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-plus"
            label="Create"
            to="/create"
            class="hidden sm:flex"
          />
          <UDropdownMenu :items="userMenuItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              :label="authStore.currentUser?.name"
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
      </template>

      <template #body>
        <UNavigationMenu
          :items="mobileMenuItems"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <AuthModal v-model:open="showAuthModal" />
  </div>
</template>
