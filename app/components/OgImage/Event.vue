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
    <div class="relative z-10 px-16 py-12">
      <!-- Location - HUGE and bold -->
      <h1
        class="text-8xl font-black text-white leading-none tracking-tight mb-8"
        style="text-shadow: 0 4px 24px rgba(0,0,0,0.15)"
      >
        {{ location }}
      </h1>

      <!-- Date & Time - Large pill -->
      <div
        class="inline-flex items-center gap-4 bg-white/20 backdrop-blur-sm rounded-full px-8 py-4"
      >
        <span class="text-4xl font-bold text-white">{{ date }}</span>
        <span class="text-4xl text-white/60">·</span>
        <span class="text-4xl font-semibold text-white/90">{{ time }}</span>
      </div>
    </div>

    <!-- Bottom accent bar -->
    <div
      class="absolute bottom-0 left-0 right-0 h-2"
      style="background: linear-gradient(90deg, #34d399, #10b981, #059669)"
    />
  </div>
</template>
