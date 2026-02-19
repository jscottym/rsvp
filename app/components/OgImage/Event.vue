<script setup lang="ts">
defineProps<{
  location: string;
  maxPlayers: number;
  relativeDay: string;
  shortDate: string;
  time: string;
}>();

// Inline styles as JS objects so Prettier doesn't break gradient values
// (satori's css-gradient-parser crashes on multiline gradient strings)
const rootStyle = {
  background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
  padding: '0 80px',
};
const circleTopStyle = {
  top: '-128px',
  right: '-128px',
  width: '384px',
  height: '384px',
  background: 'rgba(255, 255, 255, 0.15)',
};
const circleBotStyle = {
  bottom: '-96px',
  left: '-96px',
  width: '288px',
  height: '288px',
  background: 'rgba(255, 255, 255, 0.1)',
};
</script>

<template>
  <div
    class="w-full h-full flex flex-col justify-center relative overflow-hidden"
    :style="rootStyle"
  >
    <!-- Decorative circles -->
    <div class="absolute rounded-full" :style="circleTopStyle" />
    <div class="absolute rounded-full" :style="circleBotStyle" />

    <!-- Content -->
    <div class="relative" style="z-index: 10">
      <!-- Location + Player Count -->
      <div
        class="font-black text-white leading-none tracking-tight"
        style="font-size: 8rem"
      >
        {{ location }}
      </div>
      <div class="font-bold text-white" style="font-size: 3rem">
        {{ maxPlayers }} players
      </div>

      <!-- Date & Time -->
      <div
        class="text-white font-semibold flex flex-row gap-2 justify-between w-full mt-12"
        style="font-size: 4rem; margin-bottom: 32px"
      >
        <div>{{ relativeDay }} {{ shortDate }}</div>
        <div>{{ time }}</div>
      </div>
    </div>
  </div>
</template>
