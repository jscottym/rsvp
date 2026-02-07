<script setup lang="ts">
const route = useRoute()
const code = computed(() => route.params.code as string)

const {
  invite,
  resolving,
  resolveError,
  accepting,
  accepted,
  showAuthModal,
  accept,
  onAuthenticated
} = useInviteAccept(code)

const authStore = useAuthStore()

useSeoMeta({
  title: 'Accept Invite - RSVP'
})
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Loading -->
      <div v-if="resolving" class="text-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        <p class="mt-3 text-gray-500">Loading invite...</p>
      </div>

      <!-- Error -->
      <div v-else-if="resolveError" class="text-center py-12">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-link-slash" class="w-8 h-8 text-red-500" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Invalid Invite</h2>
        <p class="text-gray-500">{{ resolveError }}</p>
        <NuxtLink
          to="/"
          class="inline-block mt-6 text-teal-600 dark:text-teal-400 font-medium hover:underline"
        >
          Go home
        </NuxtLink>
      </div>

      <!-- Invite Card -->
      <div v-else-if="invite" class="text-center">
        <!-- Success state -->
        <div v-if="accepted" class="py-12">
          <div class="w-16 h-16 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-check" class="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connected!</h2>
          <p class="text-gray-500">Redirecting to your groups...</p>
        </div>

        <!-- Pending acceptance -->
        <div v-else class="space-y-6">
          <div class="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/30">
            <UIcon name="i-heroicons-heart" class="w-10 h-10 text-white" />
          </div>

          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {{ invite.ownerName }}
            </h1>
            <p class="text-gray-500">wants to add you to their contacts</p>
          </div>

          <button
            class="w-full py-4 rounded-2xl font-semibold text-white text-lg
                   bg-gradient-to-r from-teal-500 to-teal-600
                   shadow-lg shadow-teal-500/30
                   transition-all duration-200 active:scale-[0.98]
                   disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="accepting"
            @click="accept"
          >
            <span v-if="accepting" class="flex items-center justify-center gap-2">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
              Accepting...
            </span>
            <span v-else-if="authStore.isAuthenticated">
              Accept Invite
            </span>
            <span v-else>
              Sign in to accept
            </span>
          </button>

          <p v-if="!authStore.isAuthenticated" class="text-xs text-gray-400">
            You'll need to sign in with your phone number first
          </p>
        </div>
      </div>
    </div>

    <AuthModal
      v-model:open="showAuthModal"
      @authenticated="onAuthenticated"
    />
  </div>
</template>
