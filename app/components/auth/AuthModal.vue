<template>
  <UModal v-model:open="isOpen" title="Sign In" description="Verify your phone number to continue">
    <template #body>
      <div class="space-y-6">
        <!-- Step 1: Phone Number -->
        <div v-if="step === 'phone'">
          <div id="recaptcha-container"></div>
          <UFormField label="Phone Number">
          <UInput
            v-model="phone"
            type="tel"
            placeholder="(555) 123-4567"
            size="lg"
            :disabled="loading"
            @input="handlePhoneInput"
            @keyup.enter="sendCode"
          />
          </UFormField>
          <p class="mt-2 text-sm text-gray-500">
            We'll send a verification code via SMS
          </p>
        </div>

        <!-- Step 2: Verification Code -->
        <div v-else-if="step === 'code'">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter the 6-digit code sent to {{ formatPhone(phone) }}
          </p>
          <UPinInput
            :model-value="code"
            :length="6"
            size="lg"
            otp
            :disabled="loading"
            @update:model-value="(val: any) => code = Array.isArray(val) ? val.join('') : val"
            @complete="verifyCode"
          />
          <UButton
            variant="link"
            size="sm"
            class="mt-4"
            @click="step = 'phone'"
          >
            Use a different number
          </UButton>
        </div>

        <!-- Step 3: Name (for new users) -->
        <div v-else-if="step === 'name'">
          <UFormField label="Your Name">
            <UInput
              v-model="name"
              placeholder="Enter your name"
              size="lg"
              :disabled="loading"
              @keyup.enter="completeName"
            />
          </UFormField>
          <p class="mt-2 text-sm text-gray-500">
            This will be shown to other players
          </p>
        </div>

        <!-- Error message -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-heroicons-exclamation-circle"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          :disabled="loading"
          @click="isOpen = false"
        />
        <UButton
          v-if="step === 'phone'"
          color="primary"
          :label="recaptchaReady ? 'Send Code' : 'Initializing...'"
          :loading="loading"
          :disabled="!isValidPhone || !recaptchaReady"
          @click="sendCode"
        />
        <UButton
          v-else-if="step === 'code'"
          color="primary"
          label="Verify"
          :loading="loading"
          :disabled="code.length !== 6"
          @click="verifyCode"
        />
        <UButton
          v-else-if="step === 'name'"
          color="primary"
          label="Continue"
          :loading="loading"
          :disabled="!name.trim()"
          @click="completeName"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'

const props = defineProps<{
  open: boolean
  redirectTo?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'authenticated': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const authStore = useAuthStore()
const { setupRecaptcha, sendVerificationCode, verifyCode: verifyOtp, loading, error: phoneAuthError, resetState } = usePhoneAuth()
const toast = useToast()
const router = useRouter()
const recaptchaReady = ref(false)

const step = ref<'phone' | 'code' | 'name'>('phone')
const phoneStorage = useLocalStorage('pickup-sports-last-phone', '')
const phone = ref(phoneStorage.value)
const code = ref('')
const name = ref('')
const error = ref<string | null>(null)
const firebaseUser = ref<any>(null)

function formatPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '')
  
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

function handlePhoneInput(event: Event) {
  const target = event.target as HTMLInputElement
  const formatted = formatPhoneInput(target.value)
  phone.value = formatted
}

watch(phone, (value) => {
  phoneStorage.value = value
})

const isValidPhone = computed(() => {
  const digits = phone.value.replace(/\D/g, '')
  return digits.length === 10
})

const formatPhone = (p: string) => {
  const digits = p.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return p
}

watch(phoneAuthError, (val) => {
  if (val) error.value = val
})

async function initRecaptcha() {
  recaptchaReady.value = false
  error.value = null
  await nextTick()
  try {
    await setupRecaptcha('recaptcha-container')
    recaptchaReady.value = true
  } catch (e: any) {
    console.error('Failed to setup reCAPTCHA:', e)
    error.value = 'Failed to initialize verification. Please refresh and try again.'
  }
}

watch(isOpen, async (val) => {
  if (val) {
    await initRecaptcha()
  } else {
    // Reset state when closed (but keep phone number)
    resetState()
    recaptchaReady.value = false
    step.value = 'phone'
    code.value = ''
    name.value = ''
    error.value = null
  }
})

async function sendCode() {
  error.value = null
  const digits = phone.value.replace(/\D/g, '')
  if (digits.length !== 10) {
    error.value = 'Please enter a valid 10-digit phone number'
    return
  }

  // Make sure reCAPTCHA is ready
  if (!recaptchaReady.value) {
    await initRecaptcha()
    if (!recaptchaReady.value) {
      return // Error already set by initRecaptcha
    }
  }

  const success = await sendVerificationCode(phone.value)
  if (success) {
    step.value = 'code'
  } else {
    // Re-initialize reCAPTCHA for retry
    await initRecaptcha()
  }
}

async function verifyCode() {
  error.value = null
  const user = await verifyOtp(code.value)

  if (user) {
    firebaseUser.value = user
    const token = await user.getIdToken()

    // Try to login - will fail if user doesn't exist
    const result = await authStore.login(token)

    if (result.success) {
      completeAuth()
    } else if (result.needsName) {
      // New user needs to provide name
      step.value = 'name'
    } else {
      error.value = result.error || 'Authentication failed'
    }
  }
}

async function completeName() {
  if (!firebaseUser.value || !name.value.trim()) return

  error.value = null
  const token = await firebaseUser.value.getIdToken()
  const result = await authStore.login(token, name.value.trim())

  if (result.success) {
    completeAuth()
  } else {
    error.value = result.error || 'Failed to complete registration'
  }
}

function completeAuth() {
  isOpen.value = false
  emit('authenticated')
  toast.add({
    title: 'Welcome!',
    description: `Signed in as ${authStore.currentUser?.name}`,
    color: 'success'
  })

  if (props.redirectTo) {
    router.push(props.redirectTo)
  }
}
</script>
