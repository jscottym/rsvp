<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const authStore = useAuthStore()
const toast = useToast()

const saving = ref(false)
const form = reactive({
  name: '',
  nickname: ''
})

// Initialize form when modal opens
watch(isOpen, (val) => {
  if (val && authStore.currentUser) {
    form.name = authStore.currentUser.name
    form.nickname = authStore.currentUser.nickname || ''
  }
})

const isValid = computed(() => form.name.trim().length > 0)

async function saveProfile() {
  if (!isValid.value) return

  saving.value = true
  try {
    const result = await authStore.updateProfile({
      name: form.name.trim(),
      nickname: form.nickname.trim() || undefined
    })

    if (result.success) {
      toast.add({
        title: 'Profile updated',
        color: 'success'
      })
      isOpen.value = false
    } else {
      toast.add({
        title: 'Error',
        description: result.error,
        color: 'error'
      })
    }
  } finally {
    saving.value = false
  }
}

async function handleSignOut() {
  await authStore.logout()
  isOpen.value = false
  toast.add({
    title: 'Signed out',
    color: 'neutral'
  })
}
</script>

<template>
  <UModal v-model:open="isOpen" title="My Profile">
    <template #body>
      <div class="space-y-4">
        <!-- Phone (read-only) -->
        <UFormField label="Phone">
          <UInput
            :model-value="authStore.currentUser?.phone"
            disabled
            size="lg"
            icon="i-heroicons-phone"
          />
        </UFormField>

        <!-- Full Name -->
        <UFormField label="Full Name" required>
          <UInput
            v-model="form.name"
            placeholder="Your full name"
            size="lg"
            icon="i-heroicons-user"
          />
        </UFormField>

        <!-- Nickname -->
        <UFormField label="Nickname" hint="Optional - shown to other players">
          <UInput
            v-model="form.nickname"
            placeholder="e.g., Mike, JT, etc."
            size="lg"
            icon="i-heroicons-identification"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <UButton
          color="error"
          variant="ghost"
          label="Sign Out"
          icon="i-heroicons-arrow-right-on-rectangle"
          @click="handleSignOut"
        />
        <div class="flex gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="Cancel"
            @click="isOpen = false"
          />
          <UButton
            color="primary"
            label="Save"
            :loading="saving"
            :disabled="!isValid"
            @click="saveProfile"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
