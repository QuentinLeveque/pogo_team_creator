<template>
  <div class="view-toggle">
    <button
      :class="['toggle-tab', { active: pokemonStore.activeView === 'my-pokemon' }]"
      @click="setView('my-pokemon')"
    >
      Mes Pokémon
    </button>
    <button
      :class="['toggle-tab', { active: pokemonStore.activeView === 'meta' }]"
      @click="setView('meta')"
    >
      Méta complète
    </button>
  </div>
</template>

<script setup>
import { usePokemonStore } from '../stores/pokemonStore.js';

const pokemonStore = usePokemonStore();

function setView(view) {
  pokemonStore.setView(view);
}
</script>

<style scoped>
.view-toggle {
  display: inline-flex;
  background: #E2E8F0;
  border-radius: 8px;
  padding: 4px;
}
.toggle-tab {
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4A5568;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toggle-tab.active {
  background: #FFFFFF;
  color: #1A202C;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
