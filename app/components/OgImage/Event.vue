<script setup lang="ts">
defineProps<{
  location: string;
  date: string;
  time: string;
}>();
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center relative overflow-hidden"
    style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
  >
    <!-- Decorative circles -->
    <div
      class="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
      style="background: radial-gradient(circle, white 0%, transparent 70%)"
    />
    <div
      class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-15"
      style="background: radial-gradient(circle, white 0%, transparent 70%)"
    />

    <!-- Content -->
    <div class="relative z-10 px-20">
      <!-- Location - MASSIVE -->
      <h1
        class="font-black text-white leading-none tracking-tight mb-6"
        style="font-size: 180px; text-shadow: 0 6px 32px rgba(0,0,0,0.2)"
      >
        {{ location }}
      </h1>

      <!-- Date & Time combined -->
      <p
        class="text-white/90 font-semibold"
        style="font-size: 64px"
      >
        {{ date }} · {{ time }}
      </p>
    </div>
  </div>
</template>
