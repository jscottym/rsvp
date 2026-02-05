<script setup lang="ts">
defineProps<{
  location: string;
  maxPlayers: number;
  relativeDay: string;
  shortDate: string;
  time: string;
}>();
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center relative overflow-hidden"
    style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)"
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
      <!-- Line 1: Location + Player Count -->
      <div class="flex items-baseline justify-between mb-4">
        <h1
          class="font-black text-white leading-none tracking-tight"
          style="font-size: 160px; text-shadow: 0 6px 32px rgba(0,0,0,0.2)"
        >
          {{ location }}
        </h1>
        <span
          class="font-bold text-white/90"
          style="font-size: 120px; text-shadow: 0 4px 24px rgba(0,0,0,0.15)"
        >
          {{ maxPlayers }}
        </span>
      </div>

      <!-- Line 2: Date & Time (no bullet separator) -->
      <p class="text-white/90 font-semibold mb-8" style="font-size: 64px">
        {{ relativeDay }} {{ shortDate }} {{ time }}
      </p>

      <!-- Line 3: Are You In? -->
      <p
        class="font-bold text-white"
        style="font-size: 80px; text-shadow: 0 4px 24px rgba(0,0,0,0.15)"
      >
        Are You In?
      </p>
    </div>
  </div>
</template>
