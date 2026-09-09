<template>
  <div class="search-bar-container">
    <div class="search-input-wrapper">
      <input
        v-model="pokemonStore.searchQuery"
        type="text"
        placeholder="Rechercher par nom français (ex: Dracaufeu, Salamèche)..."
        class="search-input"
      />
      <button v-if="pokemonStore.searchQuery" class="clear-btn" @click="pokemonStore.searchQuery = ''">
        ✕
      </button>
    </div>
    <div class="sort-wrapper">
      <label class="sort-label">Trier par :</label>
      <select v-model="pokemonStore.sortOption" class="sort-select">
        <option value="score">Score PvPoke</option>
        <option value="ivRank">Rang IV %</option>
        <option value="name">Nom</option>
        <option value="cost">Coût poussières</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { usePokemonStore } from '../stores/pokemonStore.js';

const pokemonStore = usePokemonStore();
</script>

<style scoped>
.search-bar-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
}
.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  padding: 0.6rem 2rem 0.6rem 0.9rem;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  background: #FFFFFF;
}
.search-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #A0AEC0;
}
.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sort-label {
  font-size: 0.85rem;
  color: #718096;
}
.sort-select {
  padding: 0.55rem 0.75rem;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.85rem;
  background: #FFFFFF;
  cursor: pointer;
}
</style>
