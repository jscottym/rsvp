<script setup lang="ts">
// Inline styles as JS objects so Prettier doesn't break gradient values
// (satori's css-gradient-parser crashes on multiline gradient strings)
const rootStyle = {
  background:
    'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
  padding: '60px 80px',
};
const circleTopStyle = {
  top: '-100px',
  right: '-100px',
  width: '400px',
  height: '400px',
  background: 'rgba(255, 255, 255, 0.15)',
};
const circleBotStyle = {
  bottom: '-80px',
  left: '-80px',
  width: '280px',
  height: '280px',
  background: 'rgba(255, 255, 255, 0.1)',
};
const iconStyle = {
  width: '52px',
  height: '52px',
  background: 'rgba(255, 255, 255, 0.25)',
  fontSize: '28px',
};
const iconSmStyle = { ...iconStyle, fontSize: '26px' };
</script>

<template>
  <div
    class="flex flex-col justify-center w-full h-full relative overflow-hidden"
    :style="rootStyle"
  >
    <!-- Decorative circles -->
    <div class="absolute rounded-full" :style="circleTopStyle" />
    <div class="absolute rounded-full" :style="circleBotStyle" />

    <!-- Title -->
    <div
      class="text-white font-black"
      style="
        font-size: 82px;
        line-height: 1.05;
        letter-spacing: -0.02em;
        margin-bottom: 40px;
      "
    >
      Organize Pickup Games In Seconds
    </div>

    <!-- Steps row -->
    <div
      class="flex flex-row items-center"
      style="gap: 48px; margin-bottom: 40px"
    >
      <div class="flex flex-row items-center" style="gap: 14px">
        <div
          class="flex items-center justify-center rounded-full text-white font-bold"
          :style="iconStyle"
        >
          +
        </div>
        <div class="text-white font-semibold" style="font-size: 38px">
          Create
        </div>
      </div>
      <div class="flex flex-row items-center" style="gap: 14px">
        <div
          class="flex items-center justify-center rounded-full text-white font-bold"
          :style="iconSmStyle"
        >
          &#8594;
        </div>
        <div class="text-white font-semibold" style="font-size: 38px">
          Share
        </div>
      </div>
      <div class="flex flex-row items-center" style="gap: 14px">
        <div
          class="flex items-center justify-center rounded-full text-white font-bold"
          :style="iconSmStyle"
        >
          &#10003;
        </div>
        <div class="text-white font-semibold" style="font-size: 38px">
          Play
        </div>
      </div>
    </div>

    <!-- Brand -->
    <div class="text-white font-bold" style="font-size: 42px">
      rsvp.games
    </div>
  </div>
</template>
