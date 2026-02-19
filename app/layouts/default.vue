<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const authStore = useAuthStore();
const showAuthModal = ref(false);
const route = useRoute();

// Real-time notifications for invite acceptances
const { currentInviteAccept, dismissInviteAccept } = useUserWebSocket();

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// User dropdown menu items
const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: authStore.currentUser?.name || 'User',
      icon: 'i-heroicons-user-circle',
      type: 'label',
    },
    {
      label: formatPhone(authStore.currentUser?.phone || ''),
      icon: 'i-heroicons-phone',
      type: 'label',
      disabled: true,
    },
  ],
  [
    {
      label: 'Sign Out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: async () => { await authStore.logout(); navigateTo('/'); },
    },
  ],
]);

// Get user initials for avatar
const userInitials = computed(() => {
  const name = authStore.currentUser?.name || '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});
</script>

<template>
  <div>
    <UHeader to="/" :toggle="false">
      <template #title>
        <div class="flex items-center gap-1 mb-1">
          <img src="/rsvp-games-logo.png" alt="RSVP Games" class="h-8" />
        </div>
      </template>

      <template #right>
        <ClientOnly>
          <template v-if="authStore.isAuthenticated">
            <!-- Navigation tabs -->
            <div class="flex items-center gap-0.5 mr-0.5">
              <NuxtLink
                to="/create"
                class="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="
                  route.path === '/create'
                    ? ' text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'
                    : ' text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                "
              >
                <UIcon name="i-heroicons-plus-circle" class="size-5" />
                <span>Create</span>
              </NuxtLink>

              <NuxtLink
                to="/"
                class="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="
                  route.path === '/'
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                "
              >
                <UIcon name="i-heroicons-calendar-days" class="size-4.5" />
                <span>Events</span>
              </NuxtLink>
              <NuxtLink
                to="/groups"
                class="flex items-center gap-1 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                :class="
                  route.path.startsWith('/groups')
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                "
              >
                <UIcon name="i-heroicons-user-group" class="size-4.5" />
                <span>Groups</span>
              </NuxtLink>
            </div>
            <!-- User dropdown -->
            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'end' }"
              :ui="{ content: 'min-w-48' }"
            >
              <button
                class="flex items-center gap-1 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <UAvatar
                  :text="userInitials"
                  size="sm"
                  class="bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400"
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
          <template #fallback>
            <div class="flex items-center justify-center w-8 h-8">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </template>
        </ClientOnly>
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <AuthModal v-model:open="showAuthModal" />

    <AddToGroupsModal
      v-if="currentInviteAccept"
      :open="!!currentInviteAccept"
      :acceptor-name="currentInviteAccept.acceptorName"
      :acceptor-phone="currentInviteAccept.acceptorPhone"
      :added-group-ids="currentInviteAccept.addedGroupIds"
      :member-group-ids="currentInviteAccept.memberGroupIds"
      @update:open="
        (val) => {
          if (!val) dismissInviteAccept();
        }
      "
    />
  </div>
</template>
