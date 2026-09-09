<template>
  <div class="sprite-container">
    <img
      v-if="!hasError && dexNumber"
      :src="spriteUrl"
      :alt="alt"
      class="pixel-sprite"
      loading="lazy"
      @error="handleError"
    />
    <div v-else class="sprite-fallback">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A0AEC0" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a10 10 0 0 1 0 20" />
        <circle cx="12" cy="12" r="3" fill="#CBD5E0" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  dexNumber: { type: [Number, String], default: 0 },
  alt: { type: String, default: 'Pokémon' }
});

const hasError = ref(false);

const spriteUrl = computed(() => {
  const num = parseInt(props.dexNumber, 10);
  if (!num || isNaN(num) || num <= 0) return '';
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png`;
});

function handleError() {
  hasError.value = true;
}
</script>

<style scoped>
.sprite-container {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pixel-sprite {
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  object-fit: contain;
}
.sprite-fallback {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
