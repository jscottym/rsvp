<script setup lang="ts">
defineProps<{
  location: string;
  date: string;
  time: string;
}>();
</script>

<template>
  <div
    class="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-16"
  >
    <div
      class="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-lg w-full"
    >
      <h1 class="text-5xl font-bold text-gray-900 mb-6 leading-tight">
        {{ location }}
      </h1>

      <div class="text-3xl text-gray-600 font-medium">
        {{ date }} · {{ time }}
      </div>
    </div>
  </div>
</template>
