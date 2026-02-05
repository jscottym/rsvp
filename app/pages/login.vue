<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const {
  setupRecaptcha,
  sendVerificationCode,
  verifyCode: verifyOtp,
  loading,
  error: phoneAuthError,
  resetState,
  isRecaptchaReady,
} = usePhoneAuth();

const recaptchaReady = ref(false);
const recaptchaInitializing = ref(false);
const recaptchaFailed = ref(false);

const step = ref<'phone' | 'code' | 'name'>('phone');

function formatPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// Initialize phone empty for SSR, load from localStorage on client
const phone = ref('');
const phoneStorage = useLocalStorage('pickup-sports-last-phone', '');
const codeParts = ref<any[]>([]);
const code = computed(() => codeParts.value.join(''));
const pinInputRef = ref<HTMLElement | null>(null);
const name = ref('');
const smsConsent = ref(false);
const error = ref<string | null>(null);
const firebaseUser = ref<any>(null);

// Redirect URL from query params
const redirectTo = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' ? redirect : '/';
});

watch(phone, (newValue) => {
  phoneStorage.value = newValue;
});

function handlePhoneInput(value: string) {
  const formatted = formatPhoneInput(value);
  phone.value = formatted;
}

const isValidPhone = computed(() => {
  const digits = phone.value.replace(/\D/g, '');
  return digits.length === 10;
});

const formatPhone = (p: string) => {
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return p;
};

watch(phoneAuthError, (val) => {
  if (val) error.value = val;
});

// Redirect if already authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      router.push(redirectTo.value);
    }
  },
  { immediate: true }
);

async function initRecaptcha() {
  if (recaptchaInitializing.value) return;
  recaptchaInitializing.value = true;
  recaptchaReady.value = false;
  recaptchaFailed.value = false;
  error.value = null;
  await nextTick();
  try {
    await setupRecaptcha('recaptcha-container', () => {
      recaptchaReady.value = false;
      recaptchaFailed.value = true;
      // Auto-retry when reCAPTCHA expires
      initRecaptcha();
    });
    recaptchaReady.value = true;
    recaptchaFailed.value = false;
  } catch (e: any) {
    console.error('Failed to setup reCAPTCHA:', e);
    recaptchaFailed.value = true;
    error.value = 'Failed to initialize verification. Tap below to retry.';
  } finally {
    recaptchaInitializing.value = false;
  }
}

onMounted(async () => {
  // Load saved phone from localStorage on client only (avoids hydration mismatch)
  if (phoneStorage.value) {
    phone.value = formatPhoneInput(phoneStorage.value);
  }
  await initRecaptcha();
});

async function sendCode() {
  error.value = null;
  const digits = phone.value.replace(/\D/g, '');
  if (digits.length !== 10) {
    error.value = 'Please enter a valid 10-digit phone number';
    return;
  }

  // Always get a fresh reCAPTCHA token before sending to avoid expiration issues
  if (!recaptchaReady.value || !isRecaptchaReady()) {
    await initRecaptcha();
    if (!recaptchaReady.value) {
      return; // Error already set by initRecaptcha
    }
  }

  const success = await sendVerificationCode(phone.value);
  if (success) {
    step.value = 'code';
    codeParts.value = Array.from({ length: 6 }, () => '');
    // Focus the PIN input after DOM updates
    await nextTick();
    await nextTick();
    focusPinInput();
  } else {
    // Re-initialize reCAPTCHA for retry
    await initRecaptcha();
  }
}

function focusPinInput() {
  const container = pinInputRef.value;
  if (!container) return;

  const firstInput = container.querySelector(
    'input'
  ) as HTMLInputElement | null;
  if (firstInput) {
    firstInput.focus();
  } else {
    setTimeout(() => {
      const input = container.querySelector('input') as HTMLInputElement | null;
      input?.focus();
    }, 100);
  }
}

async function verifyCode() {
  if (loading.value) return;
  error.value = null;
  const user = await verifyOtp(code.value);

  if (user) {
    firebaseUser.value = user;
    const token = await user.getIdToken();

    // Try to login - will fail if user doesn't exist
    const result = await authStore.login(token);

    if (result.success) {
      completeAuth();
    } else if (result.needsName) {
      // New user needs to provide name
      step.value = 'name';
    } else {
      error.value = result.error || 'Authentication failed';
    }
  }
}

async function completeName() {
  if (!firebaseUser.value || !name.value.trim()) return;

  error.value = null;
  const token = await firebaseUser.value.getIdToken();
  const result = await authStore.login(
    token,
    name.value.trim(),
    smsConsent.value
  );

  if (result.success) {
    completeAuth();
  } else {
    error.value = result.error || 'Failed to complete registration';
  }
}

function completeAuth() {
  toast.add({
    title: 'Welcome!',
    description: `Signed in as ${authStore.currentUser?.name}`,
    color: 'success',
  });

  router.push(redirectTo.value);
}

useSeoMeta({
  title: 'Sign In - Pickup Sports',
  description: 'Sign up to get notified about games in your area',
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800"
  >
    <div class="max-w-md mx-auto px-4 py-12">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          RSVP
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Sign up to get notified about games in your area
        </p>
      </div>

      <!-- Auth Card -->
      <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8">
        <!-- Step 1: Phone Number -->
        <div v-if="step === 'phone'" class="space-y-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Phone Number
            </label>
            <UInput
              :model-value="phone"
              type="tel"
              placeholder="(555) 123-4567"
              size="xl"
              :disabled="loading"
              :ui="{
                base: 'text-lg',
              }"
              @update:model-value="handlePhoneInput"
              @keyup.enter="sendCode"
            />
            <p class="mt-2 text-sm text-gray-500">
              We'll send a verification code via SMS
            </p>
          </div>

          <!-- SMS Consent Checkbox -->
          <label
            class="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 cursor-pointer border-2 transition-all"
            :class="[
              smsConsent
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : 'border-gray-200 dark:border-gray-600',
            ]"
          >
            <input
              v-model="smsConsent"
              type="checkbox"
              class="w-5 h-5 mt-0.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500 flex-shrink-0"
            />
            <span
              class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
            >
              I agree to receive SMS messages about games I'm invited to or
              attending, including reminders and updates. Message frequency
              varies. Message and data rates may apply.
            </span>
          </label>

          <UButton
            v-if="recaptchaFailed"
            color="primary"
            size="xl"
            block
            label="Retry Verification Setup"
            :loading="recaptchaInitializing"
            class="h-14 rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/30 transition-all active:scale-[0.98]"
            @click="initRecaptcha"
          />
          <UButton
            v-else
            color="primary"
            size="xl"
            block
            :label="
              recaptchaReady ? 'Send Verification Code' : 'Initializing...'
            "
            :loading="loading || recaptchaInitializing"
            :disabled="!isValidPhone || !recaptchaReady || !smsConsent"
            class="h-14 rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/30 transition-all active:scale-[0.98]"
            @click="sendCode"
          />

          <!-- Hidden reCAPTCHA container -->
          <div id="recaptcha-container" class="hidden"></div>
        </div>

        <!-- Step 2: Verification Code -->
        <div v-else-if="step === 'code'" class="space-y-6">
          <div class="text-center">
            <p class="text-gray-600 dark:text-gray-400 mb-6">
              Enter the 6-digit code sent to<br />
              <span class="font-semibold text-gray-900 dark:text-white">{{
                formatPhone(phone)
              }}</span>
            </p>
            <div ref="pinInputRef">
              <UPinInput
                v-model="codeParts"
                :length="6"
                size="xl"
                otp
                type="number"
                :disabled="loading"
                @complete="verifyCode"
                :ui="{
                  root: 'justify-center gap-2 sm:gap-3',
                  base: 'h-14 w-10 sm:h-16 sm:w-14 text-xl sm:text-2xl font-semibold',
                }"
              />
            </div>
          </div>

          <UButton
            color="primary"
            size="xl"
            block
            label="Verify Code"
            :loading="loading"
            :disabled="code.length !== 6"
            class="h-14 rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/30 transition-all active:scale-[0.98]"
            @click="verifyCode"
          />

          <div class="text-center">
            <UButton variant="link" size="lg" @click="step = 'phone'">
              Use a different number
            </UButton>
          </div>
        </div>

        <!-- Step 3: Name (for new users) -->
        <div v-else-if="step === 'name'" class="space-y-6">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Your Name
            </label>
            <UInput
              v-model="name"
              placeholder="Enter your name"
              size="xl"
              :disabled="loading"
              :ui="{
                base: 'text-lg',
              }"
              @keyup.enter="completeName"
            />
            <p class="mt-2 text-sm text-gray-500">
              This will be shown to other players
            </p>
          </div>

          <UButton
            color="primary"
            size="xl"
            block
            label="Continue"
            :loading="loading"
            :disabled="!name.trim()"
            class="h-14 rounded-xl text-lg font-semibold shadow-lg shadow-teal-500/30 transition-all active:scale-[0.98]"
            @click="completeName"
          />
        </div>

        <!-- Error message -->
        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
          icon="i-heroicons-exclamation-circle"
          class="mt-6"
        />
      </div>

      <!-- Footer -->
      <div class="text-center mt-6 space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Already have an account? Just enter your number above.
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          By signing up, you agree to our
          <NuxtLink
            to="/terms"
            class="underline hover:text-gray-600 dark:hover:text-gray-300"
            >Terms of Service</NuxtLink
          >
          and
          <NuxtLink
            to="/privacy"
            class="underline hover:text-gray-600 dark:hover:text-gray-300"
            >Privacy Policy</NuxtLink
          >
        </p>
      </div>
    </div>
  </div>
</template>
