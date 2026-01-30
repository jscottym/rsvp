<script setup lang="ts">
defineProps<{
  location: string;
  date: string;
  time: string;
  playerCount: number;
  maxPlayers: number;
  sportEmoji?: string;
}>();
</script>

<template>
  <div
    class="w-full h-full flex flex-col bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-12"
  >
    <div class="flex-1 flex flex-col justify-center">
      <div class="text-6xl mb-4">{{ sportEmoji || '🏸' }}</div>

      <h1 class="text-5xl font-bold mb-4 leading-tight">
        {{ location }}
      </h1>

      <div class="flex items-center gap-4 text-3xl text-emerald-100 mb-6">
        <span class="font-semibold">{{ date }}</span>
        <span class="opacity-60">·</span>
        <span>{{ time }}</span>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-white/20 rounded-full px-6 py-3">
          <span class="text-2xl font-bold"
            >{{ playerCount }}/{{ maxPlayers }}</span
          >
          <span class="text-xl text-emerald-100">players</span>
        </div>
        <div
          v-if="playerCount < maxPlayers"
          class="bg-white/20 rounded-full px-6 py-3"
        >
          <span class="text-xl">{{ maxPlayers - playerCount }} spots left</span>
        </div>
        <div
          v-else
          class="bg-amber-400/80 text-amber-900 rounded-full px-6 py-3"
        >
          <span class="text-xl font-semibold">Full</span>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between text-emerald-200 text-xl">
      <span>Tap to RSVP</span>
      <span class="font-semibold">RSVP App</span>
    </div>
  </div>
</template>
